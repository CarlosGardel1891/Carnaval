-- Ubicaciones propuestas para los escenarios (decisión 87).
--
-- Las direcciones de los escenarios se geocodifican con OpenStreetMap
-- (`pnpm escenarios:proponer`) y el resultado se guarda acá, NO en `escenarios.ubicacion`: una
-- dirección mal resuelta no puede llegar al mapa de la app. Un admin mira cada propuesta en el
-- panel y, si está bien, guarda el escenario con ese punto; recién ahí es su ubicación.
--
-- No es una tabla de datos publicados: nadie la lee fuera del panel y no lleva registro de
-- cambios (lo que queda registrado es el cambio de `escenarios.ubicacion` al confirmarla).

create table public.ubicaciones_propuestas (
  escenario_id bigint primary key references public.escenarios (id) on delete cascade,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  -- La dirección que se buscó y lo que devolvió el geocodificador, para que quien confirma vea
  -- si entendió lo mismo.
  consulta text not null check (btrim(consulta) <> ''),
  resultado text not null check (btrim(resultado) <> ''),
  fuente text not null check (btrim(fuente) <> ''),
  creado_en timestamptz not null default now()
);

comment on table public.ubicaciones_propuestas is
  'Ubicación propuesta para un escenario por un geocodificador, a confirmar a mano en el panel. No es la ubicación del escenario (decisión 87).';

alter table public.ubicaciones_propuestas enable row level security;

revoke all on table public.ubicaciones_propuestas from anon, authenticated;
grant select, delete on table public.ubicaciones_propuestas to authenticated;

-- Las ve y las descarta un admin. Las carga el script, con la service role.
create policy "las ve un admin" on public.ubicaciones_propuestas
  for select to authenticated using ((select public.es_admin()));

create policy "las descarta un admin" on public.ubicaciones_propuestas
  for delete to authenticated using ((select public.es_admin()));

-- Cuando un escenario pasa a tener ubicación, su propuesta ya no hace falta: se haya usado o no.
create function public.escenarios_quitar_propuesta() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ubicacion is not null then
    delete from public.ubicaciones_propuestas where escenario_id = new.id;
  end if;
  return null;
end;
$$;

revoke all on function public.escenarios_quitar_propuesta() from public, anon, authenticated;

create trigger escenarios_quitar_propuesta
  after insert or update of ubicacion on public.escenarios
  for each row execute function public.escenarios_quitar_propuesta();
