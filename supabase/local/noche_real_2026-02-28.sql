-- La noche REAL del sábado 28 de febrero de 2026, para probar la app con una grilla de
-- tamaño real. Sólo para el Supabase local.
--
-- Se carga con `pnpm db:noche-real` (scripts/db-grilla.mjs) y nunca va al proyecto remoto:
-- no está en [db.seed] de config.toml ni en las migraciones, y sin el parámetro que pone
-- el script este archivo falla sin tocar nada.
--
-- Fuente: la cartelera de El Observador («Los tablados del sábado 28»), copiada tal como
-- salió publicada: https://www.elobservador.com.uy/cultura-y-espectaculos/la-lista-tablados-y-espectaculos-carnaval-este-fin-semana-n6035835
--
-- De sus 82 líneas quedan afuera tres, las del encabezado «ESCENARIOS MÓVILES» (están
-- como comentario en su lugar): la cartelera no dice cuál de los dos móviles es.
--
-- Qué carga: una actuación por cada línea de la cartelera cuyo escenario y cuyo conjunto
-- coinciden, por `norm`, con un nombre o alias del seed. Lo que no coincide no se carga y
-- se lista al final. No crea escenarios ni conjuntos, y no inventa coordenadas: los
-- escenarios reales todavía no tienen ubicación.
--
-- Es de la temporada 2026: los conjuntos y los escenarios son los del seed 2027, así que
-- sirve para probar pantallas, no como dato histórico. Toda actuación lleva
-- fuente = 'cartelera-2026-02-28'. Volver a cargarla reemplaza la anterior.
--
-- Parámetros de sesión:
--   cuerda.grilla_ficticia = 'local'   obligatorio
--   cuerda.grilla_desde                la noche en la que se carga: una fecha (YYYY-MM-DD)
--                                      u 'hoy'. Sin dato, la suya: 2026-02-28.

create temp table cartelera (
  orden integer generated always as identity,
  -- El título del escenario en la cartelera. En los gratuitos itinerantes viene con la
  -- dirección de esa noche: «NOMBRE - ENTRADA GRATUITA - DIRECCIÓN».
  titulo text not null,
  hora time not null,
  conjunto text not null
);

insert into cartelera (titulo, hora, conjunto)
values
  ('JULIA ARÉVALO', '20:00', 'CABALLEROS'),
  ('JULIA ARÉVALO', '20:50', 'DOÑA BASTARDA'),
  ('JULIA ARÉVALO', '21:50', 'LA NUEVA MILONGA'),
  ('JULIA ARÉVALO', '22:50', 'UN TÍTULO VIEJO'),
  ('JULIA ARÉVALO', '23:50', 'CYRANOS'),
  ('MONUMENTAL DE LA COSTA', '20:00', 'MADAME GÓTICA'),
  ('MONUMENTAL DE LA COSTA', '20:50', 'MOMOSAPIENS'),
  ('MONUMENTAL DE LA COSTA', '21:50', 'CABALLEROS'),
  ('MONUMENTAL DE LA COSTA', '22:50', 'ZÍNGAROS'),
  ('MONUMENTAL DE LA COSTA', '23:50', 'FALTA Y RESTO'),
  ('MONUMENTAL DE LA COSTA', '00:50', 'LA TRASNOCHADA'),
  ('PUNTA DE RIELES', '20:50', 'PATOS CABREROS'),
  ('PUNTA DE RIELES', '21:50', 'HERENCIA ANCESTRAL'),
  ('PUNTA DE RIELES', '22:50', 'CAYÓ LA CABRA'),
  ('PUNTA DE RIELES', '23:50', 'ZÍNGAROS'),
  ('MOLINO DEL GALGO', '20:50', 'HOUSE'),
  ('MOLINO DEL GALGO', '21:50', 'MADAME GÓTICA'),
  ('MOLINO DEL GALGO', '22:50', 'LOS ROLIN'),
  ('MOLINO DEL GALGO', '23:50', 'DON BOCHINCHE Y CIA'),
  ('ARBOLITO - EL TEJANO', '20:50', 'DE TODAS PARTES'),
  ('ARBOLITO - EL TEJANO', '21:50', 'MÁS QUE LONJA'),
  ('ARBOLITO - EL TEJANO', '23:50', 'JARDÍN DEL PUEBLO'),
  ('ARBOLITO - EL TEJANO', '00:50', 'CARAMBOLA'),
  ('TEATRO DE BARRIO LAVALLEJA', '20:00', 'ZÍNGAROS'),
  ('TEATRO DE BARRIO LAVALLEJA', '20:50', 'CAYÓ LA CABRA'),
  ('TEATRO DE BARRIO LAVALLEJA', '21:50', 'CURTIDORES DE HONGOS'),
  ('TEATRO DE BARRIO LAVALLEJA', '22:50', 'CABALLEROS'),
  ('CLUB MALVÍN', '20:00', 'TABÚ'),
  ('CLUB MALVÍN', '20:50', 'FALTA Y RESTO'),
  ('CLUB MALVÍN', '21:50', 'LOS ROLIN'),
  ('CLUB MALVÍN', '22:50', 'LA TRASNOCHADA'),
  ('CLUB MALVÍN', '23:50', 'MOMOSAPIENS'),
  ('TABLADO DEL PARQUE', '20:00', 'CARAMBOLA'),
  ('TABLADO DEL PARQUE', '20:50', 'VALORES'),
  ('TABLADO DEL PARQUE', '21:50', 'CAYÓ LA CABRA'),
  ('TABLADO DEL PARQUE', '22:50', 'DOÑA BASTARDA'),
  ('TABLADO DEL PARQUE', '23:50', 'PATOS CABREROS'),
  ('PLAZA 1° DE MAYO', '20:00', 'LOS CHOBYS'),
  ('PLAZA 1° DE MAYO', '20:50', 'UN TÍTULO VIEJO'),
  ('PLAZA 1° DE MAYO', '21:50', 'PATOS CABREROS'),
  ('PLAZA 1° DE MAYO', '22:50', 'VALORES'),
  ('PLAZA 1° DE MAYO', '23:50', 'LA NUEVA MILONGA'),
  ('PLAZA 1° DE MAYO', '00:50', 'DOÑA BASTARDA'),
  ('PASO DE LAS DURANAS', '20:00', 'LA SARA DEL CORDON'),
  ('PASO DE LAS DURANAS', '20:50', 'LA MARGARITA'),
  ('PASO DE LAS DURANAS', '21:50', 'LOS CHOBYS'),
  ('PASO DE LAS DURANAS', '22:50', 'TABÚ'),
  ('TEATRO MOVIE - MONTEVIDEO SHOPPING CENTER', '20:00', 'LA NUEVA MILONGA'),
  ('TEATRO MOVIE - MONTEVIDEO SHOPPING CENTER', '20:50', 'LA SARA DEL CORDÓN'),
  ('TEATRO MOVIE - MONTEVIDEO SHOPPING CENTER', '21:50', 'FALTA Y RESTO'),
  ('TEATRO MOVIE - MONTEVIDEO SHOPPING CENTER', '22:50', 'QUESO MAGRO'),
  ('MUSEO DEL CARNAVAL', '20:00', 'HERENCIA ANCESTRAL'),
  ('MUSEO DEL CARNAVAL', '20:50', 'LA COMPAÑÍA'),
  ('MUSEO DEL CARNAVAL', '21:50', 'CYRANOS'),
  ('MUSEO DEL CARNAVAL', '22:50', 'LA NUEVA MILONGA'),
  ('MUSEO DEL CARNAVAL', '23:50', 'DOÑA BASTARDA'),
  ('NUEVO CARROUSEL DAECPU DEL PASO MOLINO', '20:00', 'GÉMINIS'),
  ('NUEVO CARROUSEL DAECPU DEL PASO MOLINO', '20:50', 'CYRANOS'),
  ('NUEVO CARROUSEL DAECPU DEL PASO MOLINO', '21:50', 'DOÑA BASTARDA'),
  ('NUEVO CARROUSEL DAECPU DEL PASO MOLINO', '22:50', 'PATOS CABREROS'),
  ('NUEVO CARROUSEL DAECPU DEL PASO MOLINO', '23:50', 'LOS MUCHACHOS'),
  ('VELÓDROMO MUNICIPAL', '19:30', 'LA MOJIGATA'),
  ('VELÓDROMO MUNICIPAL', '20:00', 'FALTA Y RESTO'),
  ('VELÓDROMO MUNICIPAL', '20:50', 'SOCIEDAD ANÓNIMA'),
  ('VELÓDROMO MUNICIPAL', '21:50', 'MOMOSAPIENS'),
  ('VELÓDROMO MUNICIPAL', '22:50', 'LA MARGARITA'),
  ('VELÓDROMO MUNICIPAL', '23:50', 'LA TRASNOCHADA'),
  ('VELÓDROMO MUNICIPAL', '00:50', 'CURTIDORES DE HONGOS'),
  ('MONTE DE LA FRANCESA', '20:00', 'DOÑA BASTARDA'),
  ('MONTE DE LA FRANCESA', '20:50', 'MAS QUE LONJA'),
  ('MONTE DE LA FRANCESA', '21:50', 'JARDÍN DEL PUEBLO'),
  ('MONTE DE LA FRANCESA', '22:50', 'LA MOJIGATA'),
  ('MONTE DE LA FRANCESA', '23:50', 'CABALLEROS'),
  ('MONTE DE LA FRANCESA', '00:50', 'SOCIEDAD ANÓNIMA'),
  ('ESCENARIO EN CANELONES', '00:50', 'CAYÓ LA CABRA'),
  -- Afuera del fixture (decisión 39): «ESCENARIOS MÓVILES» es un encabezado de la
  -- cartelera, no el nombre de un escenario, y no dice cuál de los dos móviles de la IM
  -- estuvo esa noche en la plaza. Asignarlo a uno sería inventar el dato.
  --   ESCENARIOS MÓVILES - ENTRADA GRATUITA - PLAZA BOB MARLEY INGAVI Y CANSTATT
  --     20:00 MI VIEJA MULA · 20:50 LOS MUCHACHOS · 21:50 YAMBO KENIA
  ('BARRIO A BARRIO - ENTRADA GRATUITA - UCRANIA Y GRAL. EDUARDO DA COSTA', '20:00', 'LOS ROLIN'),
  ('BARRIO A BARRIO - ENTRADA GRATUITA - UCRANIA Y GRAL. EDUARDO DA COSTA', '20:50', 'JARDÍN DEL PUEBLO'),
  ('BARRIO A BARRIO - ENTRADA GRATUITA - UCRANIA Y GRAL. EDUARDO DA COSTA', '21:50', 'GÉMINIS'),
  ('BARRIO A BARRIO - ENTRADA GRATUITA - UCRANIA Y GRAL. EDUARDO DA COSTA', '22:50', 'LOS MUCHACHOS');

-- Cada línea con el escenario y el conjunto que le corresponden, si los hay.
create temp table cartelera_resuelta as
select
  c.orden,
  c.hora,
  c.conjunto,
  split_part(c.titulo, ' - ENTRADA GRATUITA - ', 1) as escenario,
  nullif(split_part(c.titulo, ' - ENTRADA GRATUITA - ', 2), '') as direccion,
  en.escenario_id,
  cn.conjunto_id
from cartelera c
left join public.escenario_nombres en
  on en.nombre_norm = public.norm(split_part(c.titulo, ' - ENTRADA GRATUITA - ', 1))
left join public.conjunto_nombres cn on cn.nombre_norm = public.norm(c.conjunto);

do $$
declare
  v_desde text := coalesce(nullif(current_setting('cuerda.grilla_desde', true), ''), '2026-02-28');
  v_noche date;
begin
  if coalesce(current_setting('cuerda.grilla_ficticia', true), '') <> 'local' then
    raise exception 'La noche real de prueba sólo se carga en el Supabase local, con `pnpm db:noche-real`.';
  end if;

  if v_desde = 'hoy' then
    -- La noche lógica de este momento, igual que la columna actuaciones.noche.
    v_noche := ((now() at time zone 'America/Montevideo') - interval '6 hours')::date;
  else
    v_noche := v_desde::date;
  end if;

  delete from public.actuaciones where fuente = 'cartelera-2026-02-28';

  insert into public.actuaciones
    (escenario_id, conjunto_id, inicio, direccion_texto, fuente, fuente_url)
  select
    r.escenario_id,
    r.conjunto_id,
    -- Una hora antes de las 06:00 es de la madrugada siguiente, dentro de la misma noche.
    (v_noche + r.hora + case when r.hora < time '06:00' then interval '1 day' else interval '0' end)
      at time zone 'America/Montevideo',
    r.direccion,
    'cartelera-2026-02-28',
    'https://www.elobservador.com.uy/cultura-y-espectaculos/la-lista-tablados-y-espectaculos-carnaval-este-fin-semana-n6035835'
  from cartelera_resuelta r
  where r.escenario_id is not null and r.conjunto_id is not null
  order by r.orden;
end
$$;

select a.noche, count(*) as actuaciones_cargadas, count(distinct a.escenario_id) as escenarios
from public.actuaciones a
where a.fuente = 'cartelera-2026-02-28'
group by a.noche;

-- Lo que no se cargó: nombres de la cartelera sin nombre ni alias en el seed.
select
  case when r.escenario_id is null then 'escenario' else 'conjunto' end as sin_coincidencia,
  case when r.escenario_id is null then r.escenario else r.conjunto end as nombre_en_la_cartelera,
  count(*) as lineas_sin_cargar
from cartelera_resuelta r
where r.escenario_id is null or r.conjunto_id is null
group by 1, 2
order by 1, 2;
