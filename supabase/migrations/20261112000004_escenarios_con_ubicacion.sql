-- Los escenarios con su ubicación en latitud y longitud, para el panel (decisión 74).
--
-- La API devuelve `escenarios.ubicacion` en el formato interno de PostGIS; el panel necesita
-- los números para poner el punto en el mapa. Para guardarla alcanza con la tabla: la columna
-- acepta «SRID=4326;POINT(lng lat)».

create function public.escenarios_con_ubicacion()
returns table (
  id bigint,
  slug text,
  nombre text,
  alias text[],
  tipo public.tipo_escenario,
  direccion text,
  barrio text,
  precio_texto text,
  gratis boolean,
  activo boolean,
  itinerante boolean,
  fuente_url text[],
  lat double precision,
  lng double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    e.id, e.slug, e.nombre, e.alias, e.tipo, e.direccion, e.barrio, e.precio_texto,
    e.gratis, e.activo, e.itinerante, e.fuente_url,
    extensions.st_y(e.ubicacion::extensions.geometry),
    extensions.st_x(e.ubicacion::extensions.geometry)
  from public.escenarios e
  order by e.nombre, e.id
$$;

comment on function public.escenarios_con_ubicacion() is
  'Todos los escenarios, también los inactivos, con su ubicación en latitud y longitud (null si no está cargada). Para el panel.';

revoke all on function public.escenarios_con_ubicacion() from public, anon, authenticated;
grant execute on function public.escenarios_con_ubicacion() to authenticated, service_role;
