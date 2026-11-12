-- La ubicación del usuario no sale del teléfono (decisión 90, que cambia la 34).
--
-- `actuaciones_de_la_noche` recibía la posición (`p_lat`, `p_lng`) para devolver la distancia a
-- cada escenario. Ahora no la recibe: devuelve el punto de cada actuación, como antes, y la app
-- calcula las distancias en el teléfono. Sin esos parámetros no hay forma de mandarla.

drop function public.actuaciones_de_la_noche(date, double precision, double precision, boolean, boolean);

create function public.actuaciones_de_la_noche(
  p_noche date,
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
  es_favorito boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  with seguidos as (
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
    s.conjunto_id is not null
  from public.actuaciones a
  join public.conjuntos c on c.id = a.conjunto_id
  join public.escenarios e on e.id = a.escenario_id
  left join public.etapas_concurso et on et.id = a.etapa_id
  left join seguidos s on s.conjunto_id = c.id
  cross join lateral (select coalesce(a.ubicacion, e.ubicacion) as punto) u
  where a.noche = p_noche
    and (not coalesce(p_solo_gratis, false) or e.gratis is true)
    and (not coalesce(p_solo_favoritos, false) or s.conjunto_id is not null)
  order by a.inicio, e.nombre, a.id
$$;

comment on function public.actuaciones_de_la_noche(date, boolean, boolean) is
  'Actuaciones de una noche lógica, por hora (incluye las de pasada la medianoche y las suspendidas). La dirección y el punto son los de la actuación o, si no tiene, los del escenario. No recibe la posición del usuario: la distancia se calcula en el teléfono (decisión 90).';

revoke all on function public.actuaciones_de_la_noche(date, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.actuaciones_de_la_noche(date, boolean, boolean)
  to anon, authenticated, service_role;
