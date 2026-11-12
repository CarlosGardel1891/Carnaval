-- Registro de cambios (docs/DECISIONES.md, decisión 73): quién cambió qué y cuándo.
--
-- Lo llena un trigger en cada tabla de datos, no el panel: así también queda lo que entra por
-- el seed o por SQL. Guarda la fila antes y después. Un cambio que deja la fila igual (volver a
-- aplicar el seed, reimportar la misma grilla) no se registra.

create table public.registro_cambios (
  id bigint generated always as identity primary key,
  tabla text not null,
  fila text not null,
  operacion text not null,
  antes jsonb,
  despues jsonb,
  usuario_id uuid,
  usuario_email text,
  hecho_en timestamptz not null default now(),
  constraint registro_cambios_operacion_ok check (operacion in ('alta', 'cambio', 'baja')),
  constraint registro_cambios_filas_ok check (
    (operacion = 'alta' and antes is null and despues is not null)
    or (operacion = 'cambio' and antes is not null and despues is not null)
    or (operacion = 'baja' and antes is not null and despues is null)
  )
);

comment on table public.registro_cambios is
  'Cada alta, cambio y baja de las tablas de datos, con la fila antes y después. Lo llena un trigger.';
comment on column public.registro_cambios.fila is
  'La clave primaria de la fila, como texto. Si es compuesta, sus partes separadas por coma.';
comment on column public.registro_cambios.usuario_id is
  'Quién lo hizo. Sin FK, para que el registro sobreviva al usuario. Null = sistema (seed, SQL o service role).';
comment on column public.registro_cambios.usuario_email is 'El email de la sesión en ese momento.';

create index registro_cambios_hecho_en_idx on public.registro_cambios (hecho_en desc, id desc);
create index registro_cambios_fila_idx on public.registro_cambios (tabla, fila);

-- Los argumentos del trigger son las columnas de la clave primaria, en orden.
-- `actualizado_en` no cuenta como cambio: en `actuaciones` se mueve con cualquier update.
create function public.registrar_cambio() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_antes jsonb;
  v_despues jsonb;
  v_fila text;
begin
  if tg_op <> 'INSERT' then
    v_antes := to_jsonb(old) - 'actualizado_en';
  end if;
  if tg_op <> 'DELETE' then
    v_despues := to_jsonb(new) - 'actualizado_en';
  end if;
  if tg_op = 'UPDATE' and v_antes = v_despues then
    return null;
  end if;

  select string_agg(coalesce(v_despues, v_antes) ->> k.columna, ',' order by k.n)
    into v_fila
    from unnest(tg_argv) with ordinality as k (columna, n);

  insert into public.registro_cambios
    (tabla, fila, operacion, antes, despues, usuario_id, usuario_email)
  values (
    tg_table_name,
    v_fila,
    case tg_op when 'INSERT' then 'alta' when 'UPDATE' then 'cambio' else 'baja' end,
    v_antes,
    v_despues,
    (select auth.uid()),
    nullif((select auth.jwt()) ->> 'email', '')
  );
  return null;
end
$$;

revoke all on function public.registrar_cambio() from public, anon, authenticated;

create trigger temporadas_registrar_cambio
  after insert or update or delete on public.temporadas
  for each row execute function public.registrar_cambio('id');
create trigger conjuntos_registrar_cambio
  after insert or update or delete on public.conjuntos
  for each row execute function public.registrar_cambio('id');
create trigger escenarios_registrar_cambio
  after insert or update or delete on public.escenarios
  for each row execute function public.registrar_cambio('id');
create trigger conjunto_temporada_registrar_cambio
  after insert or update or delete on public.conjunto_temporada
  for each row execute function public.registrar_cambio('conjunto_id', 'temporada_id');
create trigger etapas_concurso_registrar_cambio
  after insert or update or delete on public.etapas_concurso
  for each row execute function public.registrar_cambio('id');
create trigger actuaciones_registrar_cambio
  after insert or update or delete on public.actuaciones
  for each row execute function public.registrar_cambio('id');
create trigger eventos_registrar_cambio
  after insert or update or delete on public.eventos
  for each row execute function public.registrar_cambio('id');
create trigger orden_desfile_registrar_cambio
  after insert or update or delete on public.orden_desfile
  for each row execute function public.registrar_cambio('evento_id', 'conjunto_id');
create trigger desfile_esquinas_registrar_cambio
  after insert or update or delete on public.desfile_esquinas
  for each row execute function public.registrar_cambio('evento_id', 'orden');
create trigger cortes_calle_registrar_cambio
  after insert or update or delete on public.cortes_calle
  for each row execute function public.registrar_cambio('id');

-- ---------------------------------------------------------------- permisos y RLS

-- Sólo lectura, y sólo para un admin. Nadie lo escribe por la API: lo escribe el trigger.
alter table public.registro_cambios enable row level security;

revoke all on table public.registro_cambios from anon, authenticated;
grant select on table public.registro_cambios to authenticated;

create policy "registro_cambios: lo lee un admin"
  on public.registro_cambios for select to authenticated using ((select public.es_admin()));
