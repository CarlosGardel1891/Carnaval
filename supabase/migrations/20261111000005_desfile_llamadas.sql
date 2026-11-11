-- Datos del Desfile de Llamadas (docs/DECISIONES.md, decisiones 63 y 64).
--
-- Todo lo que la IM publica cerca de la fecha (el orden, el recorrido, los cortes de calle y
-- el horario) es un dato de la base y va por evento: cada noche de las Llamadas es un evento
-- (decisión 25) y puede tener lo suyo. Nada de esto está en el código de la app.

-- ---------------------------------------------------------------- orden de desfile: fuente

-- La tabla está vacía en todos lados. El valor por defecto es sólo para poder agregar la
-- columna; se quita enseguida: quien carga un orden tiene que decir de dónde salió.
alter table public.orden_desfile
  add column fuente text not null default 'sin fuente',
  add column fuente_url text;

alter table public.orden_desfile alter column fuente drop default;

alter table public.orden_desfile
  add constraint orden_desfile_textos_ok check (fuente <> '' and fuente_url <> '');

comment on column public.orden_desfile.fuente is
  'De dónde salió el orden (por ejemplo, el publicado por la IM). «orden-ficticio» marca datos de desarrollo.';

-- ---------------------------------------------------------------- el desfile, en el evento

alter table public.eventos
  add column desfile_inicio time,
  add column desfile_intervalo_min smallint,
  add column desfile_separacion_m smallint,
  add column desfile_atraso_min smallint not null default 0,
  add column recorrido_estado public.estado_evento,
  add column recorrido_fuente_url text[] not null default '{}';

alter table public.eventos
  add constraint eventos_desfile_ok check (
    desfile_intervalo_min > 0 and desfile_separacion_m > 0 and desfile_atraso_min between 0 and 600
  ),
  add constraint eventos_recorrido_fuente_ok check (
    array_position(recorrido_fuente_url, null) is null and not ('' = any (recorrido_fuente_url))
  );

comment on column public.eventos.desfile_inicio is
  'Hora de Montevideo a la que sale la primera comparsa. Null = la de la regla general (20:00).';
comment on column public.eventos.desfile_intervalo_min is
  'Minutos entre la salida de una comparsa y la de la siguiente. Null = 10.';
comment on column public.eventos.desfile_separacion_m is
  'Metros entre una comparsa y la siguiente. Con el intervalo da la velocidad de marcha. Null = 150.';
comment on column public.eventos.desfile_atraso_min is
  'Minutos de atraso que lleva el desfile: corre todas las horas estimadas. Lo ajusta quien opera la noche.';
comment on column public.eventos.recorrido_estado is
  'Si el recorrido cargado en desfile_esquinas es el oficial (confirmado) o el esperado según años anteriores (estimado). Null si no hay recorrido.';
comment on column public.eventos.recorrido_fuente_url is 'De dónde salió el recorrido.';
comment on column public.eventos.recorrido is
  'Sin uso: el recorrido de un desfile sale de desfile_esquinas (decisión 64).';

-- ---------------------------------------------------------------- recorrido: las esquinas

-- El recorrido es la lista ordenada de esquinas por las que pasa el desfile. Dos esquinas
-- seguidas son una cuadra. La línea y la distancia de cada esquina a la salida se calculan a
-- partir de estos puntos: es la única fuente del recorrido.
create table public.desfile_esquinas (
  evento_id bigint not null references public.eventos (id) on delete cascade,
  orden smallint not null check (orden > 0),
  calle text not null,
  cruce text not null,
  punto extensions.geography (Point, 4326) not null,
  primary key (evento_id, orden),
  constraint desfile_esquinas_textos_ok check (btrim(calle) <> '' and btrim(cruce) <> '')
);

comment on table public.desfile_esquinas is
  'Esquinas del recorrido de un desfile, en orden: la 1 es la salida y la última, la llegada.';
comment on column public.desfile_esquinas.calle is 'La calle por la que va el desfile en esa esquina.';
comment on column public.desfile_esquinas.cruce is 'La calle que cruza.';

-- ---------------------------------------------------------------- cortes de calle

create type public.tipo_corte as enum ('corte', 'estacionamiento');

create table public.cortes_calle (
  id bigint generated always as identity primary key,
  evento_id bigint not null references public.eventos (id) on delete cascade,
  slug text not null,
  tipo public.tipo_corte not null,
  descripcion text not null,
  tramo extensions.geography (LineString, 4326),
  desde timestamptz,
  hasta timestamptz,
  estado public.estado_evento not null,
  fuente_url text[] not null default '{}',
  constraint cortes_calle_slug_unico unique (evento_id, slug),
  constraint cortes_calle_slug_ok check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint cortes_calle_descripcion_ok check (btrim(descripcion) <> ''),
  constraint cortes_calle_horario_ok check (hasta >= desde),
  constraint cortes_calle_fuente_url_ok check (
    array_position(fuente_url, null) is null and not ('' = any (fuente_url))
  )
);

comment on table public.cortes_calle is
  'Cortes de tránsito y prohibiciones de estacionar por un evento, con su tramo y su horario.';
comment on column public.cortes_calle.tipo is
  'corte: la calle se cierra al tránsito. estacionamiento: no se puede estacionar.';
comment on column public.cortes_calle.tramo is 'El tramo afectado. Null si sólo se tiene la descripción.';
comment on column public.cortes_calle.estado is
  'confirmado (publicado por la IM para este evento) o estimado (según años anteriores).';

create index cortes_calle_evento_idx on public.cortes_calle (evento_id);

-- ---------------------------------------------------------------- permisos y RLS

alter table public.desfile_esquinas enable row level security;
alter table public.cortes_calle enable row level security;

revoke all on table public.desfile_esquinas, public.cortes_calle from anon, authenticated;
grant select on table public.desfile_esquinas, public.cortes_calle to anon, authenticated;
grant insert, update, delete on table public.desfile_esquinas, public.cortes_calle to authenticated;

create policy "desfile_esquinas: lectura pública"
  on public.desfile_esquinas for select to anon, authenticated using (true);
create policy "desfile_esquinas: alta sólo admin"
  on public.desfile_esquinas for insert to authenticated with check ((select public.es_admin()));
create policy "desfile_esquinas: cambio sólo admin"
  on public.desfile_esquinas for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "desfile_esquinas: baja sólo admin"
  on public.desfile_esquinas for delete to authenticated using ((select public.es_admin()));

create policy "cortes_calle: lectura pública"
  on public.cortes_calle for select to anon, authenticated using (true);
create policy "cortes_calle: alta sólo admin"
  on public.cortes_calle for insert to authenticated with check ((select public.es_admin()));
create policy "cortes_calle: cambio sólo admin"
  on public.cortes_calle for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "cortes_calle: baja sólo admin"
  on public.cortes_calle for delete to authenticated using ((select public.es_admin()));

-- ---------------------------------------------------------------- funciones de lectura

-- Security invoker y search_path vacío, como las demás. Reciben el evento: no miran fechas.

create function public.orden_del_desfile(p_evento_id bigint)
returns table (
  posicion smallint,
  conjunto_id bigint,
  conjunto_slug text,
  conjunto_nombre text,
  conjunto_barrio text,
  fuente text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select o.posicion, c.id, c.slug, c.nombre, c.barrio, o.fuente
  from public.orden_desfile o
  join public.conjuntos c on c.id = o.conjunto_id
  where o.evento_id = p_evento_id
  order by o.posicion
$$;

comment on function public.orden_del_desfile(bigint) is
  'El orden de desfile de un evento, por posición. Vacío si todavía no se publicó.';

create function public.recorrido_del_desfile(p_evento_id bigint)
returns table (
  orden smallint,
  calle text,
  cruce text,
  lat double precision,
  lng double precision,
  distancia_m double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.orden,
    e.calle,
    e.cruce,
    extensions.st_y(e.punto::extensions.geometry),
    extensions.st_x(e.punto::extensions.geometry),
    -- Metros desde la salida, sumando cuadra por cuadra. La primera esquina está a cero.
    coalesce(
      sum(extensions.st_distance(e.punto, e.anterior)) over (order by e.orden),
      0
    )
  from (
    select q.*, lag(q.punto) over (order by q.orden) as anterior
    from public.desfile_esquinas q
    where q.evento_id = p_evento_id
  ) e
  order by e.orden
$$;

comment on function public.recorrido_del_desfile(bigint) is
  'Las esquinas del recorrido de un evento, en orden, con su punto y los metros que lleva el desfile desde la salida. Vacío si no hay recorrido cargado.';

create function public.cortes_del_desfile(p_evento_id bigint)
returns table (
  corte_id bigint,
  slug text,
  tipo public.tipo_corte,
  descripcion text,
  desde timestamptz,
  hasta timestamptz,
  estado public.estado_evento,
  fuente_url text[],
  puntos jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    k.id,
    k.slug,
    k.tipo,
    k.descripcion,
    k.desde,
    k.hasta,
    k.estado,
    k.fuente_url,
    -- El tramo como lista de [longitud, latitud], lista para dibujar. Null si no hay tramo.
    (extensions.st_asgeojson(k.tramo::extensions.geometry)::jsonb) -> 'coordinates'
  from public.cortes_calle k
  where k.evento_id = p_evento_id
  order by k.tipo, k.slug
$$;

comment on function public.cortes_del_desfile(bigint) is
  'Los cortes de calle y las prohibiciones de estacionar de un evento, con su tramo como lista de [longitud, latitud].';

revoke all on function public.orden_del_desfile(bigint) from public, anon, authenticated;
revoke all on function public.recorrido_del_desfile(bigint) from public, anon, authenticated;
revoke all on function public.cortes_del_desfile(bigint) from public, anon, authenticated;
grant execute on function public.orden_del_desfile(bigint) to anon, authenticated, service_role;
grant execute on function public.recorrido_del_desfile(bigint) to anon, authenticated, service_role;
grant execute on function public.cortes_del_desfile(bigint) to anon, authenticated, service_role;
