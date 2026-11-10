-- Grilla FICTICIA para desarrollar y probar a mano. Sólo para el Supabase local.
--
-- Se carga con `pnpm db:grilla` (scripts/db-grilla.mjs) y nunca va al proyecto remoto: no
-- está en [db.seed] de config.toml ni en las migraciones, y sin el parámetro que pone el
-- script este archivo falla sin tocar nada.
--
-- Qué carga: conjuntos reales (los del seed con cupo en el Concurso) en escenarios
-- inventados, con slug `ficticio-…` y coordenadas de prueba, durante tres noches seguidas.
-- Toda actuación lleva fuente = 'ficticia'. Volver a cargarla reemplaza la anterior.
--
-- Parámetros de sesión:
--   cuerda.grilla_ficticia = 'local'   obligatorio
--   cuerda.grilla_desde                primera noche: una fecha (YYYY-MM-DD) u 'hoy'.
--                                      Sin dato, 2027-01-28 (dentro de la temporada 2027).

do $$
declare
  v_desde text := coalesce(nullif(current_setting('cuerda.grilla_desde', true), ''), '2027-01-28');
  v_noche date;
  v_temporada bigint;
  v_total integer;
begin
  if coalesce(current_setting('cuerda.grilla_ficticia', true), '') <> 'local' then
    raise exception 'La grilla ficticia sólo se carga en el Supabase local, con `pnpm db:grilla`.';
  end if;

  if v_desde = 'hoy' then
    -- La noche lógica de este momento, igual que la columna actuaciones.noche.
    v_noche := ((now() at time zone 'America/Montevideo') - interval '6 hours')::date;
  else
    v_noche := v_desde::date;
  end if;

  select t.id into v_temporada from public.temporadas t order by t.anio desc limit 1;
  select count(*) into v_total
  from public.conjunto_temporada ct
  where ct.temporada_id = v_temporada and ct.en_concurso;
  if v_total < 17 then
    raise exception 'Faltan conjuntos del seed (hay % con cupo en el Concurso). Corré antes `pnpm supabase db reset`.', v_total;
  end if;

  delete from public.actuaciones where fuente = 'ficticia';
  delete from public.escenarios where slug like 'ficticio-%';

  insert into public.escenarios
    (slug, nombre, tipo, direccion, barrio, ubicacion, precio_texto, gratis, activo, itinerante)
  values
    ('ficticio-centro', 'Tablado Ficticio del Centro', 'privado', 'Calle Ficticia 1234', 'Centro',
     'SRID=4326;POINT(-56.1900 -34.9050)', 'Precio ficticio: $ 300', false, true, false),
    ('ficticio-prado', 'Tablado Ficticio del Prado', 'popular', 'Camino Ficticio 500', 'Prado',
     'SRID=4326;POINT(-56.2000 -34.8600)', null, true, true, false),
    ('ficticio-union', 'Tablado Ficticio de la Unión', 'popular', 'Avenida Ficticia 2500', 'Unión',
     'SRID=4326;POINT(-56.1400 -34.8750)', 'Precio ficticio: $ 150', false, true, false),
    ('ficticio-movil', 'Escenario Móvil Ficticio', 'movil', null, null,
     null, null, true, true, true);

  -- Tablados fijos: cinco turnos por noche, el último pasada la medianoche. Con la rotación
  -- ningún conjunto se repite dentro de una noche.
  insert into public.actuaciones (escenario_id, conjunto_id, inicio, estado, fuente)
  with elenco as (
    select ct.conjunto_id, row_number() over (order by c.slug) - 1 as i
    from public.conjunto_temporada ct
    join public.conjuntos c on c.id = ct.conjunto_id
    where ct.temporada_id = v_temporada and ct.en_concurso
  )
  select
    e.id,
    el.conjunto_id,
    ((v_noche + d.dia) + turno.hora) at time zone 'America/Montevideo',
    case
      when d.dia = 0 and tablado.orden = 1 and turno.orden = 2 then 'suspendida'
      when d.dia = 0 and tablado.orden = 0 and turno.orden = 3 then 'cambiada'
      else 'programada'
    end::public.estado_actuacion,
    'ficticia'
  from generate_series(0, 2) as d (dia)
  cross join (
    values (0, 'ficticio-centro'), (1, 'ficticio-prado'), (2, 'ficticio-union')
  ) as tablado (orden, slug)
  cross join (
    values
      (0, interval '20:30'), (1, interval '21:30'), (2, interval '22:30'),
      (3, interval '23:45'), (4, interval '24:40')
  ) as turno (orden, hora)
  join public.escenarios e on e.slug = tablado.slug
  join elenco el on el.i = (tablado.orden * 5 + turno.orden + d.dia * 4) % v_total;

  -- Escenario móvil: dos paradas por noche; la dirección y el punto van en cada actuación.
  insert into public.actuaciones
    (escenario_id, conjunto_id, inicio, direccion_texto, ubicacion, fuente)
  with elenco as (
    select ct.conjunto_id, row_number() over (order by c.slug) - 1 as i
    from public.conjunto_temporada ct
    join public.conjuntos c on c.id = ct.conjunto_id
    where ct.temporada_id = v_temporada and ct.en_concurso
  )
  select
    e.id,
    el.conjunto_id,
    ((v_noche + d.dia) + parada.hora) at time zone 'America/Montevideo',
    'Esquina ficticia ' || (d.dia * 2 + parada.orden + 1),
    extensions.st_setsrid(
      extensions.st_makepoint(-56.1700 + 0.0100 * parada.orden, -34.8900 - 0.0050 * d.dia),
      4326
    )::extensions.geography,
    'ficticia'
  from generate_series(0, 2) as d (dia)
  cross join (values (0, interval '21:00'), (1, interval '22:15')) as parada (orden, hora)
  join public.escenarios e on e.slug = 'ficticio-movil'
  join elenco el on el.i = (15 + parada.orden + d.dia * 4) % v_total;
end
$$;

select a.noche, count(*) as actuaciones_ficticias
from public.actuaciones a
where a.fuente = 'ficticia'
group by a.noche
order by a.noche;
