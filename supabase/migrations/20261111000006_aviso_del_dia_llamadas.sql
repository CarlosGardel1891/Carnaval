-- El aviso del día también cuenta el Desfile de Llamadas (decisión 68).
--
-- Hasta acá, «tu conjunto actúa hoy» miraba sólo las actuaciones en escenarios. Una comparsa
-- que esa noche desfila en las Llamadas no tiene actuación: tiene un lugar en `orden_desfile`.
-- Ahora la función devuelve también esas filas, con la posición y el horario del desfile, y
-- quien arma el aviso calcula la hora estimada de salida con la misma regla que la app.
--
-- Cambian las columnas que devuelve, así que la función se vuelve a crear:
--
-- - Una fila de escenario viene como antes, con las columnas `desfile_…` en null.
-- - Una fila de desfile trae `actuacion_id` e `inicio` en null, el nombre del evento en
--   `escenario_nombre`, su lugar en `direccion`, la posición de la comparsa y el horario del
--   evento (lo que el evento no diga queda en null y vale la regla general).
--
-- El aviso sigue siendo uno por usuario, conjunto y noche (la misma clave): una comparsa que
-- esa noche actúa en un tablado y además desfila recibe un solo aviso, con las dos cosas.
-- Sólo cuentan los eventos de tipo `llamadas` cuya fecha es la noche pedida.

drop function public.tomar_avisos_del_dia(date);

create function public.tomar_avisos_del_dia(p_noche date)
returns table (
  aviso_id bigint,
  usuario_id uuid,
  token text,
  idioma public.idioma_app,
  plataforma public.plataforma_push,
  conjunto_id bigint,
  conjunto_slug text,
  conjunto_nombre text,
  actuacion_id bigint,
  noche date,
  inicio timestamptz,
  escenario_nombre text,
  direccion text,
  desfile_posicion smallint,
  desfile_inicio time,
  desfile_intervalo_min smallint,
  desfile_separacion_m smallint,
  desfile_atraso_min smallint
)
language sql
volatile
security invoker
set search_path = ''
as $$
  with desfiles as (
    select
      o.conjunto_id, o.posicion, ev.nombre, ev.lugar,
      ev.desfile_inicio, ev.desfile_intervalo_min, ev.desfile_separacion_m, ev.desfile_atraso_min
    from public.orden_desfile o
    join public.eventos ev on ev.id = o.evento_id
    where ev.tipo = 'llamadas' and ev.fecha_inicio = p_noche
  ),
  candidatos as (
    select distinct
      f.usuario_id,
      f.conjunto_id,
      'hoy:' || to_char(p_noche, 'YYYY-MM-DD') || ':' || f.conjunto_id as clave
    from public.favoritos f
    where (
        exists (
          select 1 from public.actuaciones a
          where a.conjunto_id = f.conjunto_id and a.noche = p_noche and a.estado <> 'suspendida'
        )
        or exists (select 1 from desfiles x where x.conjunto_id = f.conjunto_id)
      )
      and exists (select 1 from public.dispositivos_push d where d.usuario_id = f.usuario_id)
  ),
  reclamados as (
    insert into public.avisos_enviados as e (usuario_id, tipo, noche, clave)
    select c.usuario_id, 'hoy', p_noche, c.clave from candidatos c
    on conflict on constraint avisos_enviados_unico do update
      set intentos = e.intentos + 1, reclamado_en = now()
      where e.enviado_en is null
        and e.intentos < 3
        and e.reclamado_en < now() - interval '5 minutes'
    returning e.id, e.usuario_id as dueno, e.clave
  ),
  tomados as (
    select r.id, r.dueno, c.conjunto_id as conjunto
    from reclamados r
    join candidatos c on c.usuario_id = r.dueno and c.clave = r.clave
  ),
  filas as (
    select
      t.id, t.dueno, t.conjunto,
      a.id as act, a.inicio, es.nombre as lugar,
      coalesce(a.direccion_texto, es.direccion) as direccion,
      null::smallint as posicion, null::time as sale,
      null::smallint as intervalo, null::smallint as separacion, null::smallint as atraso
    from tomados t
    join public.actuaciones a
      on a.conjunto_id = t.conjunto and a.noche = p_noche and a.estado <> 'suspendida'
    join public.escenarios es on es.id = a.escenario_id
    union all
    select
      t.id, t.dueno, t.conjunto,
      null::bigint, null::timestamptz, x.nombre, x.lugar,
      x.posicion, x.desfile_inicio,
      x.desfile_intervalo_min, x.desfile_separacion_m, x.desfile_atraso_min
    from tomados t
    join desfiles x on x.conjunto_id = t.conjunto
  )
  select
    f.id,
    f.dueno,
    d.token,
    d.idioma,
    d.plataforma,
    cj.id,
    cj.slug,
    cj.nombre,
    f.act,
    p_noche,
    f.inicio,
    f.lugar,
    f.direccion,
    f.posicion,
    f.sale,
    f.intervalo,
    f.separacion,
    f.atraso
  from filas f
  join public.conjuntos cj on cj.id = f.conjunto
  join public.dispositivos_push d on d.usuario_id = f.dueno
  order by d.token, f.inicio nulls last, f.posicion, f.lugar, f.act
$$;

comment on function public.tomar_avisos_del_dia(date) is
  'Reclama y devuelve los avisos «tu conjunto actúa hoy» de una noche lógica que todavía no salieron: una fila por aviso, dispositivo y actuación, más una por cada comparsa seguida que esa noche desfila en las Llamadas (con desfile_posicion y el horario del evento). Sólo service role.';

revoke all on function public.tomar_avisos_del_dia(date) from public, anon, authenticated;
grant execute on function public.tomar_avisos_del_dia(date) to service_role;
