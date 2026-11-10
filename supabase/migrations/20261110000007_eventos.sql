-- Eventos del calendario (desfiles, corsos, Concurso) y orden de desfile.
--
-- Cada noche de las Llamadas es un evento propio: así cada noche tiene su orden y su estado,
-- y si llueve se posterga una sola.

create type public.tipo_evento as enum (
  'inaugural', 'samba', 'llamadas', 'corso', 'admision', 'concurso', 'otro'
);

create type public.estado_evento as enum ('confirmado', 'estimado');

create table public.eventos (
  id bigint generated always as identity primary key,
  temporada_id bigint not null references public.temporadas (id),
  slug text not null unique,
  tipo public.tipo_evento not null,
  nombre text not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  lugar text,
  estado public.estado_evento not null,
  recorrido extensions.geography (LineString, 4326),
  info text,
  fuente_url text[] not null default '{}',
  constraint eventos_slug_ok check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint eventos_nombre_ok check (btrim(nombre) <> ''),
  constraint eventos_fechas_ok check (fecha_fin >= fecha_inicio),
  constraint eventos_textos_ok check (lugar <> '' and info <> ''),
  constraint eventos_fuente_url_ok check (
    array_position(fuente_url, null) is null and not ('' = any (fuente_url))
  )
);

comment on table public.eventos is
  'Calendario de la temporada. Cada noche de las Llamadas es un evento propio.';
comment on column public.eventos.fecha_inicio is 'Fecha pura (sin hora), en Montevideo.';
comment on column public.eventos.fecha_fin is 'Fecha pura; igual a fecha_inicio si dura un día.';
comment on column public.eventos.estado is
  'confirmado (fecha oficial) o estimado (según el patrón de años anteriores).';
comment on column public.eventos.recorrido is 'Recorrido del desfile, si tiene. Null si no se relevó.';

create index eventos_temporada_fecha_idx on public.eventos (temporada_id, fecha_inicio);

create table public.orden_desfile (
  evento_id bigint not null references public.eventos (id) on delete cascade,
  conjunto_id bigint not null references public.conjuntos (id),
  posicion smallint not null check (posicion > 0),
  primary key (evento_id, conjunto_id),
  -- Diferible: reordenar (por ejemplo, intercambiar dos posiciones) en una sola sentencia
  -- no choca a mitad de camino.
  constraint orden_desfile_posicion_unica unique (evento_id, posicion) deferrable initially immediate
);

comment on table public.orden_desfile is
  'Orden en que desfilan los conjuntos en un evento. Un orden por evento, o sea por noche.';

create index orden_desfile_conjunto_idx on public.orden_desfile (conjunto_id);

-- ---------------------------------------------------------------- permisos y RLS

alter table public.eventos enable row level security;
alter table public.orden_desfile enable row level security;

revoke all on table public.eventos, public.orden_desfile from anon, authenticated;
grant select on table public.eventos, public.orden_desfile to anon, authenticated;
grant insert, update, delete on table public.eventos, public.orden_desfile to authenticated;

create policy "eventos: lectura pública"
  on public.eventos for select to anon, authenticated using (true);
create policy "eventos: alta sólo admin"
  on public.eventos for insert to authenticated with check ((select public.es_admin()));
create policy "eventos: cambio sólo admin"
  on public.eventos for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "eventos: baja sólo admin"
  on public.eventos for delete to authenticated using ((select public.es_admin()));

create policy "orden_desfile: lectura pública"
  on public.orden_desfile for select to anon, authenticated using (true);
create policy "orden_desfile: alta sólo admin"
  on public.orden_desfile for insert to authenticated with check ((select public.es_admin()));
create policy "orden_desfile: cambio sólo admin"
  on public.orden_desfile for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "orden_desfile: baja sólo admin"
  on public.orden_desfile for delete to authenticated using ((select public.es_admin()));
