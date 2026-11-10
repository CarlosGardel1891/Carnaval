-- Etapas del Concurso y actuaciones: «tal conjunto, en tal escenario, a tal hora».
-- De acá salen el pizarrón, el mapa, las fichas y las push.

-- ---------------------------------------------------------------- helper

-- Para las columnas `actualizado_en`. Es un instante (timestamptz), no una fecha: la noche
-- lógica nunca sale del reloj de la base.
create function public.tocar_actualizado_en() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end
$$;

revoke all on function public.tocar_actualizado_en() from public, anon, authenticated;

-- ---------------------------------------------------------------- etapas_concurso

create type public.rueda_concurso as enum ('primera', 'segunda', 'liguilla');

create table public.etapas_concurso (
  id bigint generated always as identity primary key,
  temporada_id bigint not null references public.temporadas (id),
  rueda public.rueda_concurso not null,
  numero smallint not null check (numero > 0),
  fecha date not null,
  constraint etapas_concurso_unica unique (temporada_id, rueda, numero)
);

comment on table public.etapas_concurso is
  'Etapas del Concurso Oficial en el Teatro de Verano: rueda, número de etapa y noche.';
comment on column public.etapas_concurso.fecha is 'Noche lógica de la etapa (fecha pura).';

-- ---------------------------------------------------------------- actuaciones

create type public.estado_actuacion as enum ('programada', 'cambiada', 'suspendida');

create table public.actuaciones (
  id bigint generated always as identity primary key,
  escenario_id bigint not null references public.escenarios (id),
  conjunto_id bigint not null references public.conjuntos (id),
  inicio timestamptz not null,
  -- Igual que nocheLogica() de @cuerda/shared: antes de las 06:00 de Montevideo es la noche
  -- anterior. La zona va fija en la expresión; no depende del TimeZone de la sesión.
  noche date not null generated always as (
    ((inicio at time zone 'America/Montevideo') - interval '6 hours')::date
  ) stored,
  estado public.estado_actuacion not null default 'programada',
  etapa_id bigint references public.etapas_concurso (id) on delete set null,
  direccion_texto text,
  ubicacion extensions.geography (Point, 4326),
  fuente text not null,
  fuente_url text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint actuaciones_clave_natural unique (escenario_id, conjunto_id, noche),
  constraint actuaciones_textos_ok check (
    direccion_texto <> '' and fuente <> '' and fuente_url <> ''
  )
);

comment on table public.actuaciones is
  'Un conjunto, en un escenario, a una hora. Clave natural para reimportar: (escenario_id, conjunto_id, noche).';
comment on column public.actuaciones.inicio is 'Instante de comienzo anunciado.';
comment on column public.actuaciones.noche is
  'Noche lógica en Montevideo: una actuación antes de las 06:00 es de la noche anterior. Generada.';
comment on column public.actuaciones.estado is
  'programada; cambiada (cambió la hora o el lugar después de publicada); suspendida.';
comment on column public.actuaciones.etapa_id is
  'Etapa del Concurso, si la actuación es en el Teatro de Verano por el Concurso.';
comment on column public.actuaciones.direccion_texto is
  'Dónde es esa noche, para escenarios itinerantes. Si es null vale la dirección del escenario.';
comment on column public.actuaciones.ubicacion is
  'Punto de esa noche, para escenarios itinerantes. Si es null vale la ubicación del escenario.';
comment on column public.actuaciones.fuente is
  'De dónde salió la fila (por ejemplo, la grilla de DAECPU). «ficticia» marca datos de desarrollo.';

create index actuaciones_noche_inicio_idx on public.actuaciones (noche, inicio);
create index actuaciones_conjunto_noche_idx on public.actuaciones (conjunto_id, noche);
create index actuaciones_etapa_idx on public.actuaciones (etapa_id) where etapa_id is not null;
create index actuaciones_ubicacion_idx on public.actuaciones using gist (ubicacion);

create trigger actuaciones_tocar_actualizado_en
  before update on public.actuaciones
  for each row execute function public.tocar_actualizado_en();

-- ---------------------------------------------------------------- permisos y RLS

alter table public.etapas_concurso enable row level security;
alter table public.actuaciones enable row level security;

revoke all on table public.etapas_concurso, public.actuaciones from anon, authenticated;
grant select on table public.etapas_concurso, public.actuaciones to anon, authenticated;
grant insert, update, delete on table public.etapas_concurso, public.actuaciones to authenticated;

create policy "etapas_concurso: lectura pública"
  on public.etapas_concurso for select to anon, authenticated using (true);
create policy "etapas_concurso: alta sólo admin"
  on public.etapas_concurso for insert to authenticated with check ((select public.es_admin()));
create policy "etapas_concurso: cambio sólo admin"
  on public.etapas_concurso for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "etapas_concurso: baja sólo admin"
  on public.etapas_concurso for delete to authenticated using ((select public.es_admin()));

create policy "actuaciones: lectura pública"
  on public.actuaciones for select to anon, authenticated using (true);
create policy "actuaciones: alta sólo admin"
  on public.actuaciones for insert to authenticated with check ((select public.es_admin()));
create policy "actuaciones: cambio sólo admin"
  on public.actuaciones for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "actuaciones: baja sólo admin"
  on public.actuaciones for delete to authenticated using ((select public.es_admin()));
