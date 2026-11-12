-- Importador de grilla (docs/DECISIONES.md, decisión 71).
--
-- El panel manda las líneas de una cartelera ya leídas (escenario, conjunto, hora) y la base
-- hace lo demás: reconocer los nombres, comparar con lo cargado y publicar todo o nada.
--
-- Cada línea de `p_filas` es un objeto con:
--   n                orden de la línea en la cartelera
--   escenario        el nombre tal como vino; se resuelve con public.norm contra nombres y alias
--   escenario_id     lo que eligió el admin para esa línea; manda sobre el nombre
--   escenario_nuevo  clave de un escenario que se crea al publicar (ver publicar_grilla)
--   conjunto, conjunto_id, conjunto_nuevo: lo mismo para el conjunto
--   hora             «HH:MM», de Montevideo; antes de las 06:00 es de la madrugada siguiente
--   direccion        la parada de esa noche, si la cartelera la trae
--   lat, lng         el punto de la parada, si el admin lo marcó
--
-- La noche llega como parámetro: nada de fechas de la sesión.

-- ---------------------------------------------------------------- fuentes reservadas

create function public.fuente_reservada(p_fuente text) returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select public.norm(coalesce(p_fuente, '')) in ('ficticia', 'fixture-ficticio', 'orden-ficticio')
$$;

comment on function public.fuente_reservada(text) is
  'Si la fuente es una de las que marcan datos de prueba. Nada de eso entra por el panel (decisión 76).';

revoke all on function public.fuente_reservada(text) from public, anon, authenticated;
grant execute on function public.fuente_reservada(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- slug a partir de un nombre

create function public.slug_de(p_nombre text) returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select btrim(regexp_replace(public.norm(p_nombre), '[^a-z0-9]+', '-', 'g'), '-')
$$;

comment on function public.slug_de(text) is
  'El slug de un nombre: normalizado, con guiones en lugar de todo lo que no sea letra o número.';

revoke all on function public.slug_de(text) from public, anon, authenticated;
grant execute on function public.slug_de(text) to authenticated, service_role;

-- ---------------------------------------------------------------- vista previa

create function public.previsualizar_grilla(p_noche date, p_filas jsonb)
returns table (
  n integer,
  escenario_id bigint,
  escenario_nombre text,
  escenario_itinerante boolean,
  conjunto_id bigint,
  conjunto_nombre text,
  inicio timestamptz,
  direccion text,
  lat double precision,
  lng double precision,
  estado text,
  actuacion_id bigint,
  inicio_actual timestamptz,
  direccion_actual text,
  estado_actual public.estado_actuacion
)
language sql
stable
security invoker
set search_path = ''
as $$
  with leidas as (
    select
      f.n,
      coalesce(f.escenario_id, en.escenario_id) as escenario_id,
      coalesce(f.conjunto_id, cn.conjunto_id) as conjunto_id,
      (
        (p_noche + f.hora::time)
        + case when f.hora::time < time '06:00' then interval '1 day' else interval '0' end
      ) at time zone 'America/Montevideo' as inicio,
      nullif(btrim(f.direccion), '') as direccion,
      f.lat,
      f.lng
    from jsonb_to_recordset(p_filas) as f (
      n integer,
      escenario text,
      escenario_id bigint,
      conjunto text,
      conjunto_id bigint,
      hora text,
      direccion text,
      lat double precision,
      lng double precision
    )
    left join public.escenario_nombres en
      on f.escenario_id is null and en.nombre_norm = public.norm(f.escenario)
    left join public.conjunto_nombres cn
      on f.conjunto_id is null and cn.nombre_norm = public.norm(f.conjunto)
  ),
  contadas as (
    select l.*, count(*) over (partition by l.escenario_id, l.conjunto_id) as veces
    from leidas l
  )
  select
    l.n,
    e.id,
    e.nombre,
    e.itinerante,
    c.id,
    c.nombre,
    l.inicio,
    l.direccion,
    l.lat,
    l.lng,
    case
      when e.id is null or c.id is null then 'sin_coincidencia'
      when l.veces > 1 then 'duplicada'
      when a.id is null then 'nueva'
      when a.inicio = l.inicio
        and coalesce(l.direccion, a.direccion_texto) is not distinct from a.direccion_texto
        and (
          l.lat is null
          or l.lng is null
          or (
            a.ubicacion is not null
            and extensions.st_dwithin(
              a.ubicacion,
              extensions.st_setsrid(extensions.st_makepoint(l.lng, l.lat), 4326)::extensions.geography,
              1
            )
          )
        )
        then 'igual'
      else 'cambia'
    end,
    a.id,
    a.inicio,
    a.direccion_texto,
    a.estado
  from contadas l
  left join public.escenarios e on e.id = l.escenario_id
  left join public.conjuntos c on c.id = l.conjunto_id
  left join public.actuaciones a
    on a.escenario_id = e.id and a.conjunto_id = c.id and a.noche = p_noche
  order by l.n
$$;

comment on function public.previsualizar_grilla(date, jsonb) is
  'Vista previa de una importación: cada línea con su escenario y su conjunto reconocidos (exacto, por public.norm) y su estado: nueva, cambia, igual, sin_coincidencia o duplicada. No escribe nada.';

revoke all on function public.previsualizar_grilla(date, jsonb) from public, anon, authenticated;
grant execute on function public.previsualizar_grilla(date, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------- lo cargado que no viene

create function public.grilla_sobrante(p_noche date, p_filas jsonb)
returns table (
  actuacion_id bigint,
  escenario_id bigint,
  escenario_nombre text,
  conjunto_id bigint,
  conjunto_nombre text,
  inicio timestamptz,
  estado public.estado_actuacion
)
language sql
stable
security invoker
set search_path = ''
as $$
  with previa as (
    select p.escenario_id, p.conjunto_id from public.previsualizar_grilla(p_noche, p_filas) p
  )
  select a.id, e.id, e.nombre, c.id, c.nombre, a.inicio, a.estado
  from public.actuaciones a
  join public.escenarios e on e.id = a.escenario_id
  join public.conjuntos c on c.id = a.conjunto_id
  where a.noche = p_noche
    and a.escenario_id in (select p.escenario_id from previa p where p.escenario_id is not null)
    and not exists (
      select 1 from previa p
      where p.escenario_id = a.escenario_id and p.conjunto_id = a.conjunto_id
    )
  order by e.nombre, a.inicio, a.id
$$;

comment on function public.grilla_sobrante(date, jsonb) is
  'Lo que ya está cargado esa noche en los escenarios de la importación y no viene en ella. Sólo se mira en esos escenarios: pegar la cartelera de uno no dice nada de los demás.';

revoke all on function public.grilla_sobrante(date, jsonb) from public, anon, authenticated;
grant execute on function public.grilla_sobrante(date, jsonb) to authenticated, service_role;

-- ---------------------------------------------------------------- publicar

-- Todo o nada: una función es una sola transacción, y cualquier error deshace lo anterior.
--
--   p_alias     [{ "tipo": "conjunto" | "escenario", "id": 1, "alias": "…" }]
--   p_nuevos    { "conjuntos":  [{ "clave": "c1", "nombre": "…", "categoria": "murga" }],
--                 "escenarios": [{ "clave": "e1", "nombre": "…", "tipo": "popular",
--                                  "itinerante": false, "gratis": null,
--                                  "direccion": null, "barrio": null }] }
--               Las líneas los nombran con `conjunto_nuevo` y `escenario_nuevo`.
--   p_sobrantes [{ "id": 1, "accion": "suspender" | "borrar" }], de grilla_sobrante.
--
-- Security invoker: corre con los permisos de quien llama, así que además del chequeo de
-- es_admin() vale la RLS de cada tabla.
create function public.publicar_grilla(
  p_noche date,
  p_fuente text,
  p_fuente_url text,
  p_filas jsonb,
  p_alias jsonb default '[]'::jsonb,
  p_nuevos jsonb default '{}'::jsonb,
  p_sobrantes jsonb default '[]'::jsonb
)
returns table (
  nuevas integer,
  cambiadas integer,
  iguales integer,
  suspendidas integer,
  borradas integer,
  conjuntos_creados integer,
  escenarios_creados integer,
  alias_agregados integer
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_fuente text := nullif(btrim(p_fuente), '');
  v_fuente_url text := nullif(btrim(p_fuente_url), '');
  v_filas jsonb := coalesce(p_filas, '[]'::jsonb);
  v_item jsonb;
  v_id bigint;
  v_mal text;
  v_conjuntos_creados integer := 0;
  v_escenarios_creados integer := 0;
  v_alias integer := 0;
  v_nuevas integer := 0;
  v_cambiadas integer := 0;
  v_iguales integer := 0;
  v_suspendidas integer := 0;
  v_borradas integer := 0;
begin
  if not (select public.es_admin()) then
    raise exception 'Sólo un admin puede publicar una grilla.' using errcode = 'insufficient_privilege';
  end if;
  if p_noche is null then
    raise exception 'Falta la noche.' using errcode = 'invalid_parameter_value';
  end if;
  if v_fuente is null then
    raise exception 'Falta la fuente: todo lo que se carga dice de dónde salió.'
      using errcode = 'invalid_parameter_value';
  end if;
  if public.fuente_reservada(v_fuente) then
    raise exception 'La fuente «%» está reservada para los datos de prueba.', v_fuente
      using errcode = 'invalid_parameter_value';
  end if;
  if jsonb_typeof(v_filas) <> 'array' or jsonb_array_length(v_filas) = 0 then
    raise exception 'No hay líneas para publicar.' using errcode = 'invalid_parameter_value';
  end if;

  select string_agg(coalesce(f ->> 'n', '?'), ', ')
    into v_mal
    from jsonb_array_elements(v_filas) f
    where coalesce(f ->> 'hora', '') !~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$';
  if v_mal is not null then
    raise exception 'Hay líneas sin una hora válida (HH:MM): %.', v_mal
      using errcode = 'invalid_parameter_value';
  end if;

  -- Conjuntos y escenarios que el admin confirmó crear.
  for v_item in select * from jsonb_array_elements(coalesce(p_nuevos -> 'conjuntos', '[]'::jsonb))
  loop
    insert into public.conjuntos (slug, nombre, categoria, fuente_url)
    values (
      public.slug_de(v_item ->> 'nombre'),
      btrim(v_item ->> 'nombre'),
      (v_item ->> 'categoria')::public.categoria_conjunto,
      case when v_fuente_url is null then '{}'::text[] else array[v_fuente_url] end
    )
    returning id into v_id;
    v_conjuntos_creados := v_conjuntos_creados + 1;
    select jsonb_agg(
        case
          when f ->> 'conjunto_nuevo' = v_item ->> 'clave'
            then f || jsonb_build_object('conjunto_id', v_id)
          else f
        end
        order by k.orden
      )
      into v_filas
      from jsonb_array_elements(v_filas) with ordinality as k (f, orden);
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_nuevos -> 'escenarios', '[]'::jsonb))
  loop
    insert into public.escenarios
      (slug, nombre, tipo, itinerante, gratis, direccion, barrio, fuente_url)
    values (
      public.slug_de(v_item ->> 'nombre'),
      btrim(v_item ->> 'nombre'),
      (v_item ->> 'tipo')::public.tipo_escenario,
      (v_item ->> 'itinerante')::boolean,
      (v_item ->> 'gratis')::boolean,
      nullif(btrim(v_item ->> 'direccion'), ''),
      nullif(btrim(v_item ->> 'barrio'), ''),
      case when v_fuente_url is null then '{}'::text[] else array[v_fuente_url] end
    )
    returning id into v_id;
    v_escenarios_creados := v_escenarios_creados + 1;
    select jsonb_agg(
        case
          when f ->> 'escenario_nuevo' = v_item ->> 'clave'
            then f || jsonb_build_object('escenario_id', v_id)
          else f
        end
        order by k.orden
      )
      into v_filas
      from jsonb_array_elements(v_filas) with ordinality as k (f, orden);
  end loop;

  -- Alias nuevos. Si uno choca con otro nombre, el trigger de las claves corta todo.
  for v_item in select * from jsonb_array_elements(coalesce(p_alias, '[]'::jsonb))
  loop
    if nullif(btrim(v_item ->> 'alias'), '') is null then
      raise exception 'Hay un alias vacío.' using errcode = 'invalid_parameter_value';
    end if;
    if v_item ->> 'tipo' = 'conjunto' then
      update public.conjuntos c
         set alias = c.alias || btrim(v_item ->> 'alias')
       where c.id = (v_item ->> 'id')::bigint
         and public.norm(v_item ->> 'alias') <> c.nombre_norm
         and not (public.norm(v_item ->> 'alias') = any (c.alias_norm));
    elsif v_item ->> 'tipo' = 'escenario' then
      update public.escenarios e
         set alias = e.alias || btrim(v_item ->> 'alias')
       where e.id = (v_item ->> 'id')::bigint
         and public.norm(v_item ->> 'alias') <> e.nombre_norm
         and not (public.norm(v_item ->> 'alias') = any (e.alias_norm));
    else
      raise exception 'Un alias es de un conjunto o de un escenario.'
        using errcode = 'invalid_parameter_value';
    end if;
    if found then
      v_alias := v_alias + 1;
    end if;
  end loop;

  -- Con los nombres ya resueltos no puede quedar nada sin coincidencia ni repetido.
  select string_agg(p.n::text, ', ' order by p.n)
    into v_mal
    from public.previsualizar_grilla(p_noche, v_filas) p
    where p.estado = 'sin_coincidencia';
  if v_mal is not null then
    raise exception 'Hay líneas sin conjunto o sin escenario reconocido: %.', v_mal
      using errcode = 'invalid_parameter_value';
  end if;

  select string_agg(p.n::text, ', ' order by p.n)
    into v_mal
    from public.previsualizar_grilla(p_noche, v_filas) p
    where p.estado = 'duplicada';
  if v_mal is not null then
    raise exception 'Un conjunto no puede estar dos veces en el mismo escenario la misma noche: líneas %.', v_mal
      using errcode = 'invalid_parameter_value';
  end if;

  with previa as materialized (
    select * from public.previsualizar_grilla(p_noche, v_filas)
  ),
  altas as (
    insert into public.actuaciones
      (escenario_id, conjunto_id, inicio, etapa_id, direccion_texto, ubicacion, fuente, fuente_url)
    select
      p.escenario_id,
      p.conjunto_id,
      p.inicio,
      case
        when e.tipo = 'teatro_verano' then (
          select et.id from public.etapas_concurso et where et.fecha = p_noche order by et.id limit 1
        )
      end,
      p.direccion,
      case
        when p.lat is not null and p.lng is not null
          then extensions.st_setsrid(extensions.st_makepoint(p.lng, p.lat), 4326)::extensions.geography
      end,
      v_fuente,
      v_fuente_url
    from previa p
    join public.escenarios e on e.id = p.escenario_id
    where p.estado = 'nueva'
    returning 1
  ),
  cambios as (
    update public.actuaciones a
       set inicio = p.inicio,
           direccion_texto = coalesce(p.direccion, a.direccion_texto),
           ubicacion = case
             when p.lat is not null and p.lng is not null
               then extensions.st_setsrid(extensions.st_makepoint(p.lng, p.lat), 4326)::extensions.geography
             else a.ubicacion
           end,
           -- Una suspendida sigue suspendida: importar no levanta una suspensión.
           estado = case
             when a.estado = 'suspendida' then a.estado
             when a.inicio <> p.inicio
               or coalesce(p.direccion, a.direccion_texto) is distinct from a.direccion_texto
               then 'cambiada'::public.estado_actuacion
             else a.estado
           end,
           fuente = v_fuente,
           fuente_url = v_fuente_url
      from previa p
     where p.estado = 'cambia' and a.id = p.actuacion_id
    returning 1
  )
  select
    (select count(*) from altas),
    (select count(*) from cambios),
    (select count(*) from previa p where p.estado = 'igual')
  into v_nuevas, v_cambiadas, v_iguales;

  -- Lo que estaba cargado y no vino, sólo si el admin lo marcó, y sólo de esa noche.
  update public.actuaciones a
     set estado = 'suspendida'
    from jsonb_to_recordset(coalesce(p_sobrantes, '[]'::jsonb)) as s (id bigint, accion text)
   where s.accion = 'suspender' and a.id = s.id and a.noche = p_noche and a.estado <> 'suspendida';
  get diagnostics v_suspendidas = row_count;

  delete from public.actuaciones a
   using jsonb_to_recordset(coalesce(p_sobrantes, '[]'::jsonb)) as s (id bigint, accion text)
   where s.accion = 'borrar' and a.id = s.id and a.noche = p_noche;
  get diagnostics v_borradas = row_count;

  return query select
    v_nuevas, v_cambiadas, v_iguales, v_suspendidas, v_borradas,
    v_conjuntos_creados, v_escenarios_creados, v_alias;
end
$$;

comment on function public.publicar_grilla(date, text, text, jsonb, jsonb, jsonb, jsonb) is
  'Publica una importación, todo o nada: crea lo que el admin confirmó, agrega los alias y da de alta o cambia las actuaciones. No toca las que están igual. Sólo admin.';

revoke all on function public.publicar_grilla(date, text, text, jsonb, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.publicar_grilla(date, text, text, jsonb, jsonb, jsonb, jsonb)
  to authenticated, service_role;
