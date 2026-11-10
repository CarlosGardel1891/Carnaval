-- Funciones de lectura para la ficha de un conjunto y para reconocer nombres.
-- Igual que las de la pantalla Hoy: security invoker, search_path vacío, y la noche lógica
-- llega como parámetro (nunca sale del reloj de la base).

-- ---------------------------------------------------------------- proximas_de_conjunto

create function public.proximas_de_conjunto(p_conjunto_id bigint, p_noche date)
returns table (
  actuacion_id bigint,
  inicio timestamptz,
  noche date,
  estado public.estado_actuacion,
  etapa_rueda public.rueda_concurso,
  etapa_numero smallint,
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
  lng double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id,
    a.inicio,
    a.noche,
    a.estado,
    et.rueda,
    et.numero,
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
    extensions.st_x(u.punto::extensions.geometry)
  from public.actuaciones a
  join public.escenarios e on e.id = a.escenario_id
  left join public.etapas_concurso et on et.id = a.etapa_id
  cross join lateral (select coalesce(a.ubicacion, e.ubicacion) as punto) u
  where a.conjunto_id = p_conjunto_id
    and a.noche >= p_noche
  order by a.inicio, e.nombre, a.id
$$;

comment on function public.proximas_de_conjunto(bigint, date) is
  'Actuaciones de un conjunto desde una noche lógica en adelante (incluida), por hora. Incluye las suspendidas.';

revoke all on function public.proximas_de_conjunto(bigint, date) from public, anon, authenticated;
grant execute on function public.proximas_de_conjunto(bigint, date) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- buscar_por_nombre

create function public.buscar_por_nombre(p_texto text)
returns table (tipo text, id bigint, slug text, nombre text)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'conjunto', c.id, c.slug, c.nombre
  from public.conjunto_nombres n
  join public.conjuntos c on c.id = n.conjunto_id
  where n.nombre_norm = public.norm(p_texto)
  union all
  select 'escenario', e.id, e.slug, e.nombre
  from public.escenario_nombres n
  join public.escenarios e on e.id = n.escenario_id
  where n.nombre_norm = public.norm(p_texto)
$$;

comment on function public.buscar_por_nombre(text) is
  'Conjunto y/o escenario cuyo nombre o alias, normalizado con public.norm, es exactamente el texto. A lo sumo una fila por tipo («conjunto», «escenario»).';

revoke all on function public.buscar_por_nombre(text) from public, anon, authenticated;
grant execute on function public.buscar_por_nombre(text) to anon, authenticated, service_role;
