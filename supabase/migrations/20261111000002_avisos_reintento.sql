-- Un aviso de cambio o de suspensión que no salió no se pierde en silencio (decisión 49).
--
-- Antes, la cola se cerraba al tomar el cambio y un aviso que fallaba después de los
-- reintentos de la corrida quedaba sin mandar para siempre. Ahora el aviso guarda de qué
-- actuación habla y cómo estaba antes, y tomar_avisos_de_cambios lo vuelve a entregar en las
-- pasadas siguientes mientras la actuación no haya empezado. Si empieza sin que haya salido,
-- queda marcado en `fallido_en`.

alter table public.avisos_enviados
  add column actuacion_id bigint references public.actuaciones (id) on delete cascade,
  add column estado_anterior public.estado_actuacion,
  add column inicio_anterior timestamptz,
  add column fallido_en timestamptz;

comment on column public.avisos_enviados.actuacion_id is
  'Sólo en los avisos de cambio: la actuación de la que hablan. Con ella se puede volver a armar el aviso si no salió.';
comment on column public.avisos_enviados.estado_anterior is
  'Sólo en los avisos de cambio: el estado de la actuación antes del cambio.';
comment on column public.avisos_enviados.inicio_anterior is
  'Sólo en los avisos de cambio: la hora de la actuación antes del cambio.';
comment on column public.avisos_enviados.fallido_en is
  'Cuándo se dio por perdido: la actuación empezó y el aviso de cambio nunca salió. Null si salió o si todavía se está intentando.';

-- El aviso del día sigue con tres intentos como máximo (lo controla su función); el de
-- cambio se reintenta hasta que la actuación empieza.
alter table public.avisos_enviados drop constraint avisos_enviados_intentos_ok;
alter table public.avisos_enviados
  add constraint avisos_enviados_intentos_ok check (intentos >= 1);
alter table public.avisos_enviados
  add constraint avisos_enviados_cambio_ok check (
    tipo <> 'cambio'
    or (actuacion_id is not null and estado_anterior is not null and inicio_anterior is not null)
  ) not valid;

comment on column public.avisos_enviados.intentos is
  'Veces que se reclamó. El aviso del día, hasta tres; el de cambio, hasta que la actuación empieza.';

create index avisos_enviados_por_reintentar_idx
  on public.avisos_enviados (actuacion_id)
  where tipo = 'cambio' and enviado_en is null and fallido_en is null;

-- Misma firma y mismas columnas que antes. Hace tres cosas, en una sola sentencia:
--
-- 1. Da por perdidos (`fallido_en`) los avisos de cambio que no salieron y cuya actuación ya
--    empezó.
-- 2. Toma de la cola los cambios nuevos, como antes, y reclama sus avisos.
-- 3. Vuelve a reclamar los avisos de cambio que no salieron y cuya actuación todavía no
--    empezó. Espera entre intentos: un minuto después del primero, dos después del segundo…
--    hasta diez. Si la actuación volvió a cambiar (hay un aviso más nuevo para ese usuario, o
--    se está tomando uno ahora), el viejo no se reintenta: manda el nuevo.
--
-- Las filas de un reintento dicen cómo está la actuación ahora, no cómo estaba cuando falló.
-- Comparar `inicio` con `now()` es comparar instantes: la fecha del reloj no se usa.
create or replace function public.tomar_avisos_de_cambios(p_noche date, p_hasta timestamptz)
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
  estado public.estado_actuacion,
  estado_anterior public.estado_actuacion,
  inicio_anterior timestamptz,
  escenario_nombre text,
  direccion text
)
language sql
volatile
security invoker
set search_path = ''
as $$
  with vencidos as (
    update public.avisos_enviados e
      set fallido_en = now()
    from public.actuaciones a
    where e.tipo = 'cambio'
      and e.enviado_en is null
      and e.fallido_en is null
      and a.id = e.actuacion_id
      and a.inicio <= now()
    returning e.id
  ),
  calmas as (
    select c.actuacion_id
    from public.cambios_actuacion c
    where c.procesado_en is null
    group by c.actuacion_id
    having max(c.creado_en) <= p_hasta
  ),
  cerrados as (
    update public.cambios_actuacion c
      set procesado_en = now()
    where c.procesado_en is null
      and c.actuacion_id in (select k.actuacion_id from calmas k)
    returning
      c.id, c.actuacion_id as act, c.estado_anterior as est, c.inicio_anterior as ini,
      c.escenario_anterior as esc, c.direccion_anterior as dir
  ),
  -- Por actuación: cómo estaba antes del primer cambio, y el id del último.
  lotes as (
    select distinct on (c.act)
      c.act, c.est, c.ini, c.esc, c.dir,
      max(c.id) over (partition by c.act) as ultimo
    from cerrados c
    order by c.act, c.id
  ),
  netos as (
    select
      l.act, l.est, l.ini, l.ultimo,
      a.conjunto_id as conjunto, a.noche as noche_act
    from lotes l
    join public.actuaciones a on a.id = l.act
    where a.noche >= p_noche
      and (a.estado, a.inicio, a.escenario_id, a.direccion_texto)
        is distinct from (l.est, l.ini, l.esc, l.dir)
  ),
  reclamados as (
    insert into public.avisos_enviados
      (usuario_id, tipo, noche, clave, actuacion_id, estado_anterior, inicio_anterior)
    select distinct
      f.usuario_id, 'cambio'::public.tipo_aviso, n.noche_act, 'cambio:' || n.ultimo,
      n.act, n.est, n.ini
    from netos n
    join public.favoritos f on f.conjunto_id = n.conjunto
    where exists (select 1 from public.dispositivos_push d where d.usuario_id = f.usuario_id)
    on conflict on constraint avisos_enviados_unico do nothing
    returning id, usuario_id as dueno, actuacion_id as act, estado_anterior as est, inicio_anterior as ini
  ),
  reintentos as (
    update public.avisos_enviados e
      set intentos = e.intentos + 1, reclamado_en = now()
    from public.actuaciones a
    where e.tipo = 'cambio'
      and e.enviado_en is null
      and e.fallido_en is null
      and a.id = e.actuacion_id
      and a.inicio > now()
      and e.reclamado_en < now() - make_interval(mins => least(e.intentos, 10))
      and e.actuacion_id not in (select n.act from netos n)
      and not exists (
        select 1 from public.avisos_enviados nuevo
        where nuevo.usuario_id = e.usuario_id
          and nuevo.actuacion_id = e.actuacion_id
          and nuevo.tipo = 'cambio'
          and nuevo.id > e.id
      )
    returning e.id, e.usuario_id as dueno, e.actuacion_id as act, e.estado_anterior as est, e.inicio_anterior as ini
  ),
  por_mandar as (
    select r.id, r.dueno, r.act, r.est, r.ini from reclamados r
    union all
    select r.id, r.dueno, r.act, r.est, r.ini from reintentos r
  )
  select
    p.id,
    p.dueno,
    d.token,
    d.idioma,
    d.plataforma,
    cj.id,
    cj.slug,
    cj.nombre,
    a.id,
    a.noche,
    a.inicio,
    a.estado,
    p.est,
    p.ini,
    es.nombre,
    coalesce(a.direccion_texto, es.direccion)
  from por_mandar p
  join public.actuaciones a on a.id = p.act
  join public.conjuntos cj on cj.id = a.conjunto_id
  join public.escenarios es on es.id = a.escenario_id
  join public.dispositivos_push d on d.usuario_id = p.dueno
  -- `vencidos` no se lee acá, pero corre igual: una CTE que modifica datos se ejecuta siempre.
  order by d.token, a.inicio, es.nombre, a.id
$$;

comment on function public.tomar_avisos_de_cambios(date, timestamptz) is
  'Cierra los cambios de la cola anteriores a p_hasta y devuelve, ya reclamados, los avisos de cambio o suspensión nuevos y los que no salieron en pasadas anteriores (mientras la actuación no haya empezado): una fila por aviso y dispositivo. Marca como fallidos los que ya no tiene sentido mandar. Sólo service role.';

-- Cuántos avisos se dieron por perdidos desde un instante: la Edge Function lo informa.
create function public.avisos_fallidos_desde(p_desde timestamptz) returns bigint
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*) from public.avisos_enviados e where e.fallido_en >= p_desde
$$;

comment on function public.avisos_fallidos_desde(timestamptz) is
  'Cantidad de avisos de cambio dados por perdidos desde ese instante. Sólo service role.';

revoke all on function public.avisos_fallidos_desde(timestamptz) from public, anon, authenticated;
grant execute on function public.avisos_fallidos_desde(timestamptz) to service_role;
