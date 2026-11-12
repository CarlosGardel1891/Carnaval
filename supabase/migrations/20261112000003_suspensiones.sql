-- Suspender una noche o un escenario (docs/DECISIONES.md, decisión 72).
--
-- No hay un estado de noche: suspender es pasar a «suspendida» las actuaciones de esa noche
-- en los escenarios elegidos. Acá se guarda qué se tocó y cómo estaba, para poder deshacerlo.
-- El aviso sale solo: cada actuación encola su cambio (decisión 48) y el armado de avisos
-- junta todo lo de un dispositivo en una sola notificación.

create table public.suspensiones (
  id bigint generated always as identity primary key,
  noche date not null,
  motivo text,
  creado_por uuid,
  creado_email text,
  creado_en timestamptz not null default now(),
  deshecha_en timestamptz,
  deshecha_por uuid,
  constraint suspensiones_motivo_ok check (motivo <> '')
);

comment on table public.suspensiones is
  'Cada vez que se suspendió una noche entera o algunos de sus escenarios desde el panel.';
comment on column public.suspensiones.noche is 'La noche lógica suspendida.';
comment on column public.suspensiones.creado_por is 'Quién la suspendió. Sin FK, para que sobreviva al usuario.';
comment on column public.suspensiones.deshecha_en is 'Cuándo se deshizo. Null = sigue vigente.';

create index suspensiones_noche_idx on public.suspensiones (noche, id desc);

create table public.suspension_actuaciones (
  suspension_id bigint not null references public.suspensiones (id) on delete cascade,
  actuacion_id bigint not null references public.actuaciones (id) on delete cascade,
  estado_anterior public.estado_actuacion not null,
  primary key (suspension_id, actuacion_id)
);

comment on table public.suspension_actuaciones is
  'Las actuaciones que tocó una suspensión y cómo estaba cada una, para poder deshacerla.';

create index suspension_actuaciones_actuacion_idx on public.suspension_actuaciones (actuacion_id);

-- Sólo lectura y sólo para un admin: se escriben con las funciones de abajo.
alter table public.suspensiones enable row level security;
alter table public.suspension_actuaciones enable row level security;

revoke all on table public.suspensiones, public.suspension_actuaciones from anon, authenticated;
grant select on table public.suspensiones, public.suspension_actuaciones to authenticated;

create policy "suspensiones: las lee un admin"
  on public.suspensiones for select to authenticated using ((select public.es_admin()));
create policy "suspension_actuaciones: las lee un admin"
  on public.suspension_actuaciones for select to authenticated using ((select public.es_admin()));

-- ---------------------------------------------------------------- suspender

-- Security definer, porque escribe en tablas que nadie escribe por la API; por eso lo primero
-- que hace es chequear que quien llama es admin.
create function public.suspender_noche(
  p_noche date,
  p_escenarios bigint[] default null,
  p_motivo text default null
)
returns table (suspension_id bigint, actuaciones integer)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_cuantas integer;
begin
  if not (select public.es_admin()) then
    raise exception 'Sólo un admin puede suspender una noche.' using errcode = 'insufficient_privilege';
  end if;
  if p_noche is null then
    raise exception 'Falta la noche.' using errcode = 'invalid_parameter_value';
  end if;

  if not exists (
    select 1 from public.actuaciones a
    where a.noche = p_noche
      and a.estado <> 'suspendida'
      and (p_escenarios is null or a.escenario_id = any (p_escenarios))
  ) then
    return query select null::bigint, 0;
    return;
  end if;

  insert into public.suspensiones (noche, motivo, creado_por, creado_email)
  values (
    p_noche,
    nullif(btrim(p_motivo), ''),
    (select auth.uid()),
    nullif((select auth.jwt()) ->> 'email', '')
  )
  returning id into v_id;

  with tocadas as (
    update public.actuaciones a
       set estado = 'suspendida'
      from public.actuaciones antes
     where antes.id = a.id
       and a.noche = p_noche
       and a.estado <> 'suspendida'
       and (p_escenarios is null or a.escenario_id = any (p_escenarios))
    returning a.id, antes.estado as estado_anterior
  ),
  guardadas as (
    insert into public.suspension_actuaciones (suspension_id, actuacion_id, estado_anterior)
    select v_id, t.id, t.estado_anterior from tocadas t
    returning 1
  )
  select count(*) into v_cuantas from guardadas;

  return query select v_id, v_cuantas;
end
$$;

comment on function public.suspender_noche(date, bigint[], text) is
  'Suspende las actuaciones de una noche: todas, o las de los escenarios que se pasan. Guarda cómo estaban para poder deshacerlo. Sólo admin.';

revoke all on function public.suspender_noche(date, bigint[], text) from public, anon, authenticated;
grant execute on function public.suspender_noche(date, bigint[], text) to authenticated;

-- ---------------------------------------------------------------- deshacer

create function public.deshacer_suspension(p_suspension_id bigint) returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_cuantas integer;
begin
  if not (select public.es_admin()) then
    raise exception 'Sólo un admin puede deshacer una suspensión.' using errcode = 'insufficient_privilege';
  end if;

  update public.suspensiones s
     set deshecha_en = now(), deshecha_por = (select auth.uid())
   where s.id = p_suspension_id and s.deshecha_en is null;
  if not found then
    raise exception 'Esa suspensión no existe o ya se deshizo.' using errcode = 'invalid_parameter_value';
  end if;

  -- Sólo las que siguen suspendidas: si alguien ya tocó una a mano, se respeta.
  update public.actuaciones a
     set estado = sa.estado_anterior
    from public.suspension_actuaciones sa
   where sa.suspension_id = p_suspension_id
     and a.id = sa.actuacion_id
     and a.estado = 'suspendida';
  get diagnostics v_cuantas = row_count;
  return v_cuantas;
end
$$;

comment on function public.deshacer_suspension(bigint) is
  'Devuelve a su estado anterior las actuaciones de una suspensión que sigan suspendidas. Sólo admin.';

revoke all on function public.deshacer_suspension(bigint) from public, anon, authenticated;
grant execute on function public.deshacer_suspension(bigint) to authenticated;
