-- Orden de desfile FICTICIO de las Llamadas, para desarrollar y probar a mano. Sólo para el
-- Supabase local.
--
-- Se carga con `pnpm db:llamadas` (scripts/db-grilla.mjs) y nunca va al proyecto remoto: no
-- está en [db.seed] de config.toml ni en las migraciones, y sin el parámetro que pone el
-- script este archivo falla sin tocar nada (las mismas barreras que la grilla ficticia).
--
-- Qué carga: las comparsas reales clasificadas a las Llamadas (conjunto_temporada.en_llamadas)
-- repartidas en las dos noches, en un orden inventado: la mitad en cada noche, numeradas
-- desde el 1. Qué comparsa va cada noche y en qué lugar no sale de ninguna fuente. Toda fila
-- lleva fuente = 'orden-ficticio': así se reconoce, la app avisa que es de prueba y
-- `pnpm db:llamadas --quitar` lo borra entero. Volver a cargarlo reemplaza el anterior.
--
-- Parámetro de sesión:
--   cuerda.grilla_ficticia = 'local'   obligatorio

do $$
declare
  v_temporada bigint;
  v_noches integer;
  v_total integer;
  v_reales integer;
begin
  if coalesce(current_setting('cuerda.grilla_ficticia', true), '') <> 'local' then
    raise exception 'El orden ficticio sólo se carga en el Supabase local, con `pnpm db:llamadas`.';
  end if;

  select t.id into v_temporada from public.temporadas t order by t.anio desc limit 1;
  select count(*) into v_noches
  from public.eventos e where e.temporada_id = v_temporada and e.tipo = 'llamadas';
  select count(*) into v_total
  from public.conjunto_temporada ct where ct.temporada_id = v_temporada and ct.en_llamadas;
  if v_noches <> 2 or v_total < 4 then
    raise exception 'Faltan datos del seed (noches de Llamadas: %; comparsas clasificadas: %). Corré antes `pnpm supabase db reset`.', v_noches, v_total;
  end if;

  -- Si ya hay un orden de verdad, no se le mezcla uno inventado.
  select count(*) into v_reales
  from public.orden_desfile o
  join public.eventos e on e.id = o.evento_id
  where e.temporada_id = v_temporada and e.tipo = 'llamadas' and o.fuente <> 'orden-ficticio';
  if v_reales > 0 then
    raise exception 'Las Llamadas ya tienen % lugares de un orden que no es de prueba: no se carga el ficticio encima.', v_reales;
  end if;

  delete from public.orden_desfile where fuente = 'orden-ficticio';

  insert into public.orden_desfile (evento_id, conjunto_id, posicion, fuente)
  with noches as (
    select e.id, row_number() over (order by e.fecha_inicio, e.slug) - 1 as n
    from public.eventos e
    where e.temporada_id = v_temporada and e.tipo = 'llamadas'
  ),
  elenco as (
    -- Un orden fijo (para que cargarlo dos veces dé lo mismo) que no es el alfabético.
    select ct.conjunto_id, row_number() over (order by md5(c.slug)) - 1 as i
    from public.conjunto_temporada ct
    join public.conjuntos c on c.id = ct.conjunto_id
    where ct.temporada_id = v_temporada and ct.en_llamadas
  )
  select
    n.id,
    el.conjunto_id,
    -- La primera mitad va la noche 1 y la segunda, la noche 2.
    el.i - n.n * ceil(v_total / 2.0)::integer + 1,
    'orden-ficticio'
  from elenco el
  join noches n on n.n = (el.i / ceil(v_total / 2.0)::integer);
end
$$;

select e.slug as noche, count(*) as comparsas, min(o.posicion) as primera, max(o.posicion) as ultima
from public.orden_desfile o
join public.eventos e on e.id = o.evento_id
where o.fuente = 'orden-ficticio'
group by e.slug
order by e.slug;
