-- Funciones de lectura para la pantalla Hoy y el mapa.
--
-- Todas reciben la noche lógica como parámetro (la app la calcula con nocheLogica()); ninguna
-- usa el reloj de la base. Son security invoker: leen lo mismo que puede leer quien llama.
-- PostGIS vive en el esquema `extensions` y el search_path va vacío: todo va calificado.

-- ---------------------------------------------------------------- mis_favoritos

-- Los conjuntos que sigue el usuario de la sesión; vacío si no hay sesión. Es security definer
-- para que las funciones de lectura anden también sin sesión (rol anon, que no puede leer
-- `favoritos`), sin abrir la tabla: sólo devuelve las filas de quien llama.
create function public.mis_favoritos() returns setof bigint
language sql
stable
security definer
set search_path = ''
as $$
  select f.conjunto_id from public.favoritos f where f.usuario_id = (select auth.uid())
$$;

comment on function public.mis_favoritos() is
  'Ids de los conjuntos que sigue el usuario de la sesión. Vacío sin sesión.';

revoke all on function public.mis_favoritos() from public, anon, authenticated;
grant execute on function public.mis_favoritos() to anon, authenticated, service_role;

-- ---------------------------------------------------------------- actuaciones_de_la_noche

create function public.actuaciones_de_la_noche(
  p_noche date,
  p_lat double precision default null,
  p_lng double precision default null,
  p_solo_gratis boolean default false,
  p_solo_favoritos boolean default false
) returns table (
  actuacion_id bigint,
  inicio timestamptz,
  estado public.estado_actuacion,
  etapa_rueda public.rueda_concurso,
  etapa_numero smallint,
  conjunto_id bigint,
  conjunto_slug text,
  conjunto_nombre text,
  conjunto_categoria public.categoria_conjunto,
  conjunto_foto_url text,
  escenario_id bigint,
  escenario_slug text,
  escenario_nombre text,
  escenario_tipo public.tipo_escenario,
  escenario_barrio text,
  direccion text,
  gratis boolean,
  precio_texto text,
  itinerante boolean,
  lat double precision,
  lng double precision,
  distancia_m double precision,
  es_favorito boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with origen as (
    select
      case
        when p_lat is not null and p_lng is not null then
          extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography
      end as g
  ),
  seguidos as (
    select f as conjunto_id from public.mis_favoritos() as f
  )
  select
    a.id,
    a.inicio,
    a.estado,
    et.rueda,
    et.numero,
    c.id,
    c.slug,
    c.nombre,
    c.categoria,
    c.foto_url,
    e.id,
    e.slug,
    e.nombre,
    e.tipo,
    e.barrio,
    coalesce(a.direccion_texto, e.direccion),
    e.gratis,
    e.precio_texto,
    e.itinerante,
    extensions.st_y(u.punto::extensions.geometry),
    extensions.st_x(u.punto::extensions.geometry),
    extensions.st_distance(u.punto, o.g),
    s.conjunto_id is not null
  from public.actuaciones a
  join public.conjuntos c on c.id = a.conjunto_id
  join public.escenarios e on e.id = a.escenario_id
  left join public.etapas_concurso et on et.id = a.etapa_id
  left join seguidos s on s.conjunto_id = c.id
  cross join origen o
  cross join lateral (select coalesce(a.ubicacion, e.ubicacion) as punto) u
  where a.noche = p_noche
    and (not coalesce(p_solo_gratis, false) or e.gratis is true)
    and (not coalesce(p_solo_favoritos, false) or s.conjunto_id is not null)
  order by a.inicio, e.nombre, a.id
$$;

comment on function public.actuaciones_de_la_noche(date, double precision, double precision, boolean, boolean) is
  'Actuaciones de una noche lógica, por hora (incluye las de pasada la medianoche y las suspendidas). La dirección y el punto son los de la actuación o, si no tiene, los del escenario. distancia_m es null sin lat/lng o sin punto.';

revoke all on function public.actuaciones_de_la_noche(date, double precision, double precision, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.actuaciones_de_la_noche(date, double precision, double precision, boolean, boolean)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------- escenarios_cercanos

create function public.escenarios_cercanos(
  p_lat double precision,
  p_lng double precision,
  p_radio_m double precision,
  p_noche date
) returns table (
  escenario_id bigint,
  slug text,
  nombre text,
  tipo public.tipo_escenario,
  barrio text,
  direccion text,
  gratis boolean,
  precio_texto text,
  itinerante boolean,
  lat double precision,
  lng double precision,
  distancia_m double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with origen as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as g
  ),
  puntos as (
    -- Escenarios con punto fijo.
    select e.id, e.ubicacion as punto, e.direccion
    from public.escenarios e
    where e.activo and e.ubicacion is not null
    union all
    -- Itinerantes (y cualquier actuación con punto propio): dónde están esa noche.
    select e.id, a.ubicacion, coalesce(a.direccion_texto, e.direccion)
    from public.actuaciones a
    join public.escenarios e on e.id = a.escenario_id
    where e.activo and a.noche = p_noche and a.ubicacion is not null
  ),
  mas_cercano as (
    select distinct on (p.id)
      p.id,
      p.punto,
      p.direccion,
      extensions.st_distance(p.punto, o.g) as distancia_m
    from puntos p
    cross join origen o
    where extensions.st_dwithin(p.punto, o.g, p_radio_m)
    order by p.id, extensions.st_distance(p.punto, o.g)
  )
  select
    e.id,
    e.slug,
    e.nombre,
    e.tipo,
    e.barrio,
    m.direccion,
    e.gratis,
    e.precio_texto,
    e.itinerante,
    extensions.st_y(m.punto::extensions.geometry),
    extensions.st_x(m.punto::extensions.geometry),
    m.distancia_m
  from mas_cercano m
  join public.escenarios e on e.id = m.id
  order by m.distancia_m, e.nombre, e.id
$$;

comment on function public.escenarios_cercanos(double precision, double precision, double precision, date) is
  'Escenarios activos a menos de p_radio_m metros, del más cercano al más lejano. Los fijos se ubican por su punto; los itinerantes, por sus actuaciones de esa noche.';

revoke all on function public.escenarios_cercanos(double precision, double precision, double precision, date)
  from public, anon, authenticated;
grant execute on function public.escenarios_cercanos(double precision, double precision, double precision, date)
  to anon, authenticated, service_role;
