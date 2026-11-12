-- Cargar el desfile de Llamadas desde el panel (docs/DECISIONES.md, decisiones 64 y 76).
--
-- El orden de desfile y el recorrido se guardan enteros, de una vez: se reemplaza todo en una
-- sola transacción, para que la app nunca vea un orden a medio cargar. El horario, el atraso
-- y los cortes de calle se editan por la API, fila por fila: ahí alcanza con la RLS.

-- ---------------------------------------------------------------- orden de desfile

create function public.reemplazar_orden_desfile(
  p_evento_id bigint,
  p_conjuntos bigint[],
  p_fuente text,
  p_fuente_url text default null
)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_fuente text := nullif(btrim(p_fuente), '');
  v_cuantos integer := coalesce(cardinality(p_conjuntos), 0);
begin
  if not (select public.es_admin()) then
    raise exception 'Sólo un admin puede cargar el orden de desfile.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento_id) then
    raise exception 'Ese evento no existe.' using errcode = 'invalid_parameter_value';
  end if;
  if v_cuantos > 0 and v_fuente is null then
    raise exception 'Falta la fuente: todo lo que se carga dice de dónde salió.'
      using errcode = 'invalid_parameter_value';
  end if;
  if public.fuente_reservada(v_fuente) then
    raise exception 'La fuente «%» está reservada para los datos de prueba.', v_fuente
      using errcode = 'invalid_parameter_value';
  end if;
  if v_cuantos <> (select count(distinct c) from unnest(p_conjuntos) as c) then
    raise exception 'Un conjunto no puede estar dos veces en el orden.' using errcode = 'invalid_parameter_value';
  end if;

  delete from public.orden_desfile o where o.evento_id = p_evento_id;

  insert into public.orden_desfile (evento_id, conjunto_id, posicion, fuente, fuente_url)
  select p_evento_id, c.conjunto_id, c.posicion, v_fuente, nullif(btrim(p_fuente_url), '')
  from unnest(p_conjuntos) with ordinality as c (conjunto_id, posicion);

  return v_cuantos;
end
$$;

comment on function public.reemplazar_orden_desfile(bigint, bigint[], text, text) is
  'Reemplaza el orden de desfile de un evento por la lista que se pasa, en ese orden. Una lista vacía lo borra. Todo o nada. Sólo admin.';

revoke all on function public.reemplazar_orden_desfile(bigint, bigint[], text, text)
  from public, anon, authenticated;
grant execute on function public.reemplazar_orden_desfile(bigint, bigint[], text, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------- recorrido

-- p_esquinas: [{ "calle": "…", "cruce": "…", "lat": -34.9, "lng": -56.1 }], en orden: la primera
-- es la salida y la última, la llegada.
create function public.reemplazar_recorrido(
  p_evento_id bigint,
  p_esquinas jsonb,
  p_estado public.estado_evento,
  p_fuente_url text[] default '{}'
)
returns integer
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_esquinas jsonb := coalesce(p_esquinas, '[]'::jsonb);
  v_cuantas integer;
begin
  if not (select public.es_admin()) then
    raise exception 'Sólo un admin puede cargar el recorrido.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.eventos e where e.id = p_evento_id) then
    raise exception 'Ese evento no existe.' using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_typeof(v_esquinas) <> 'array' then
    raise exception 'Las esquinas tienen que ser una lista.' using errcode = 'invalid_parameter_value';
  end if;
  v_cuantas := jsonb_array_length(v_esquinas);
  if v_cuantas = 1 then
    raise exception 'Un recorrido tiene por lo menos dos esquinas.' using errcode = 'invalid_parameter_value';
  end if;
  if v_cuantas > 0 and p_estado is null then
    raise exception 'Falta decir si el recorrido es estimado o confirmado.'
      using errcode = 'invalid_parameter_value';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(v_esquinas) as q (lat double precision, lng double precision)
    where q.lat is null or q.lng is null
      or q.lat not between -90 and 90 or q.lng not between -180 and 180
  ) then
    raise exception 'Hay esquinas sin un punto válido en el mapa.' using errcode = 'invalid_parameter_value';
  end if;

  delete from public.desfile_esquinas q where q.evento_id = p_evento_id;

  insert into public.desfile_esquinas (evento_id, orden, calle, cruce, punto)
  select
    p_evento_id,
    q.orden,
    btrim(q.esquina ->> 'calle'),
    btrim(q.esquina ->> 'cruce'),
    extensions.st_setsrid(
      extensions.st_makepoint(
        (q.esquina ->> 'lng')::double precision,
        (q.esquina ->> 'lat')::double precision
      ),
      4326
    )::extensions.geography
  from jsonb_array_elements(v_esquinas) with ordinality as q (esquina, orden);

  update public.eventos e
     set recorrido_estado = case when v_cuantas = 0 then null else p_estado end,
         recorrido_fuente_url = case when v_cuantas = 0 then '{}'::text[] else coalesce(p_fuente_url, '{}') end
   where e.id = p_evento_id;

  return v_cuantas;
end
$$;

comment on function public.reemplazar_recorrido(bigint, jsonb, public.estado_evento, text[]) is
  'Reemplaza las esquinas del recorrido de un evento, en el orden en que se pasan, y guarda si es estimado o confirmado y su fuente. Una lista vacía lo borra. Todo o nada. Sólo admin.';

revoke all on function public.reemplazar_recorrido(bigint, jsonb, public.estado_evento, text[])
  from public, anon, authenticated;
grant execute on function public.reemplazar_recorrido(bigint, jsonb, public.estado_evento, text[])
  to authenticated, service_role;
