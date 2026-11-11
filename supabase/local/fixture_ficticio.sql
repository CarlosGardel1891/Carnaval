-- Fixture FICTICIO del Concurso Oficial, para desarrollar y probar a mano. Sólo para el
-- Supabase local.
--
-- Se carga con `pnpm db:fixture` (scripts/db-grilla.mjs) y nunca va al proyecto remoto: no
-- está en [db.seed] de config.toml ni en las migraciones, y sin el parámetro que pone el
-- script este archivo falla sin tocar nada (las mismas barreras que la grilla ficticia).
--
-- Qué carga: las tres ruedas del Concurso en el Teatro de Verano (el escenario real del
-- seed), con los conjuntos reales que ya tienen cupo en el Concurso. Las noches, el orden y
-- las horas son inventados. Toda etapa y toda actuación lleva fuente = 'fixture-ficticio':
-- así se reconoce, la app avisa que es de prueba y `pnpm db:fixture --quitar` lo borra
-- entero. Volver a cargarlo reemplaza el anterior.
--
--   Primera rueda: cada conjunto una vez, de a cuatro por noche, noches seguidas.
--   Segunda rueda: lo mismo, en otro orden, después de un día de descanso.
--   Liguilla: tres noches de cuatro conjuntos, después de otro día de descanso.
--
-- Parámetros de sesión:
--   cuerda.grilla_ficticia = 'local'   obligatorio
--   cuerda.grilla_desde                primera noche: una fecha (YYYY-MM-DD) u 'hoy'.
--                                      Sin dato, 2027-01-25 (el inicio del Concurso 2027).

do $$
declare
  v_desde text := coalesce(nullif(current_setting('cuerda.grilla_desde', true), ''), '2027-01-25');
  v_noche date;
  v_temporada bigint;
  v_teatro bigint;
  v_total integer;
  v_noches integer;
  v_reales integer;
begin
  if coalesce(current_setting('cuerda.grilla_ficticia', true), '') <> 'local' then
    raise exception 'El fixture ficticio sólo se carga en el Supabase local, con `pnpm db:fixture`.';
  end if;

  if v_desde = 'hoy' then
    -- La noche lógica de este momento, igual que la columna actuaciones.noche.
    v_noche := ((now() at time zone 'America/Montevideo') - interval '6 hours')::date;
  else
    v_noche := v_desde::date;
  end if;

  select t.id into v_temporada from public.temporadas t order by t.anio desc limit 1;
  select e.id into v_teatro from public.escenarios e where e.slug = 'teatro-de-verano-ramon-collazo';
  select count(*) into v_total
  from public.conjunto_temporada ct
  where ct.temporada_id = v_temporada and ct.en_concurso;
  if v_teatro is null or v_total < 12 then
    raise exception 'Faltan datos del seed (Teatro de Verano o conjuntos con cupo: hay %). Corré antes `pnpm supabase db reset`.', v_total;
  end if;

  -- Si ya hay un fixture de verdad, no se le mezcla uno inventado.
  select count(*) into v_reales
  from public.etapas_concurso e
  where e.temporada_id = v_temporada and e.fuente <> 'fixture-ficticio';
  if v_reales > 0 then
    raise exception 'La temporada ya tiene % etapas que no son de prueba: no se carga el fixture ficticio encima.', v_reales;
  end if;

  delete from public.actuaciones where fuente = 'fixture-ficticio';
  delete from public.etapas_concurso where fuente = 'fixture-ficticio';

  v_noches := ceil(v_total / 4.0)::integer;

  -- Las etapas: primera y segunda rueda con las mismas noches; la liguilla, tres.
  insert into public.etapas_concurso (temporada_id, rueda, numero, fecha, fuente)
  select v_temporada, r.rueda::public.rueda_concurso, n.numero, v_noche + r.desde + n.numero - 1, 'fixture-ficticio'
  from (
    values
      ('primera', 0, v_noches),
      ('segunda', v_noches + 1, v_noches),
      ('liguilla', 2 * v_noches + 2, 3)
  ) as r (rueda, desde, noches)
  cross join lateral generate_series(1, r.noches) as n (numero);

  -- Los conjuntos de cada noche. `orden` reparte de a cuatro: la primera rueda por slug, la
  -- segunda y la liguilla en otro orden (uno fijo, para que cargarlo dos veces dé lo mismo).
  insert into public.actuaciones (escenario_id, conjunto_id, etapa_id, inicio, fuente)
  with elenco as (
    select
      ct.conjunto_id,
      row_number() over (order by c.slug) - 1 as primera,
      row_number() over (order by md5(c.slug)) - 1 as segunda,
      row_number() over (order by md5('liguilla' || c.slug)) - 1 as liguilla
    from public.conjunto_temporada ct
    join public.conjuntos c on c.id = ct.conjunto_id
    where ct.temporada_id = v_temporada and ct.en_concurso
  ),
  turnos as (
    select 'primera'::public.rueda_concurso as rueda, conjunto_id, primera as orden from elenco
    union all
    select 'segunda', conjunto_id, segunda from elenco
    union all
    select 'liguilla', conjunto_id, liguilla from elenco where liguilla < 12
  )
  select
    v_teatro,
    t.conjunto_id,
    e.id,
    (e.fecha + hora.inicio) at time zone 'America/Montevideo',
    'fixture-ficticio'
  from turnos t
  join public.etapas_concurso e
    on e.temporada_id = v_temporada
    and e.fuente = 'fixture-ficticio'
    and e.rueda = t.rueda
    and e.numero = t.orden / 4 + 1
  join (
    -- El último turno arranca pasada la medianoche: sigue siendo esa noche.
    values (0, interval '20:30'), (1, interval '21:45'), (2, interval '23:00'), (3, interval '24:15')
  ) as hora (turno, inicio) on hora.turno = t.orden % 4;
end
$$;

select e.rueda, count(distinct e.id) as noches, count(a.id) as actuaciones
from public.etapas_concurso e
left join public.actuaciones a on a.etapa_id = e.id
where e.fuente = 'fixture-ficticio'
group by e.rueda
order by e.rueda;
