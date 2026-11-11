-- Avisos push (docs/DECISIONES.md, decisiones 47 a 49): la cola de cambios de la grilla, el
-- registro de avisos y las funciones que deciden quién recibe qué.
--
-- Acá no se manda nada: las Edge Functions llaman a estas funciones con la service role, arman
-- los textos y mandan. Ninguna función usa la fecha del reloj: la noche lógica llega como
-- parámetro (la calcula la Edge Function con nocheLogica()). Los `now()` que hay son
-- instantes (cuándo se encoló, cuándo se reclamó), nunca una fecha.

-- ---------------------------------------------------------------- cola de cambios

create table public.cambios_actuacion (
  id bigint generated always as identity primary key,
  actuacion_id bigint not null references public.actuaciones (id) on delete cascade,
  estado_anterior public.estado_actuacion not null,
  inicio_anterior timestamptz not null,
  escenario_anterior bigint not null,
  direccion_anterior text,
  creado_en timestamptz not null default now(),
  procesado_en timestamptz
);

comment on table public.cambios_actuacion is
  'Cola de cambios de actuaciones ya publicadas, con los valores de antes. La llena un trigger y la vacía tomar_avisos_de_cambios. Privada: sólo service role.';
comment on column public.cambios_actuacion.escenario_anterior is
  'Id del escenario de antes. Sin FK: sólo se compara con el actual.';
comment on column public.cambios_actuacion.procesado_en is
  'Cuándo se tomó para avisar (o se descartó). Null = pendiente.';

create index cambios_actuacion_pendientes_idx
  on public.cambios_actuacion (actuacion_id, id) where procesado_en is null;

-- Encola el cambio de una actuación que ya estaba cargada. No llama a nada ni decide a quién
-- avisar: eso lo hace tomar_avisos_de_cambios, con la ventana de calma. Las altas no pasan
-- por acá, así que importar una grilla nueva no encola nada. Es security definer porque
-- quien cambia la actuación es un admin con rol `authenticated`, que no puede escribir en
-- la cola.
create function public.actuaciones_encolar_cambio() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado is distinct from old.estado
    or new.inicio is distinct from old.inicio
    or new.escenario_id is distinct from old.escenario_id
    or new.direccion_texto is distinct from old.direccion_texto
  then
    insert into public.cambios_actuacion
      (actuacion_id, estado_anterior, inicio_anterior, escenario_anterior, direccion_anterior)
    values (old.id, old.estado, old.inicio, old.escenario_id, old.direccion_texto);
  end if;
  return null;
end
$$;

revoke all on function public.actuaciones_encolar_cambio() from public, anon, authenticated;

create trigger actuaciones_encolar_cambio
  after update on public.actuaciones
  for each row execute function public.actuaciones_encolar_cambio();

-- ---------------------------------------------------------------- registro de avisos

create type public.tipo_aviso as enum ('hoy', 'cambio');

create table public.avisos_enviados (
  id bigint generated always as identity primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  tipo public.tipo_aviso not null,
  noche date not null,
  clave text not null,
  intentos smallint not null default 1,
  reclamado_en timestamptz not null default now(),
  enviado_en timestamptz,
  constraint avisos_enviados_unico unique (usuario_id, clave),
  constraint avisos_enviados_clave_ok check (clave <> ''),
  constraint avisos_enviados_intentos_ok check (intentos between 1 and 3)
);

comment on table public.avisos_enviados is
  'Un renglón por aviso y usuario. Se reclama antes de mandar: la clave única impide mandar dos veces el mismo. Privada: sólo service role.';
comment on column public.avisos_enviados.clave is
  '«hoy:NOCHE:CONJUNTO» para el aviso del día; «cambio:ID» (el último id de la cola de esa actuación) para un cambio.';
comment on column public.avisos_enviados.noche is 'Noche lógica de la que habla el aviso.';
comment on column public.avisos_enviados.intentos is
  'Veces que se reclamó. El aviso del día se vuelve a reclamar si no salió, hasta tres veces.';
comment on column public.avisos_enviados.enviado_en is 'Cuándo lo aceptó el servicio de push. Null = todavía no salió.';

create index avisos_enviados_noche_idx on public.avisos_enviados (noche);

-- ---------------------------------------------------------------- permisos

alter table public.cambios_actuacion enable row level security;
alter table public.avisos_enviados enable row level security;

-- Sin policies y sin privilegios: ni `anon` ni `authenticated` las ven. La service role
-- saltea la RLS.
revoke all on table public.cambios_actuacion, public.avisos_enviados from anon, authenticated;

-- ---------------------------------------------------------------- aviso del día

-- «Tu conjunto actúa hoy». Reclama, para cada usuario con un dispositivo registrado, los
-- conjuntos que sigue y que actúan esa noche (sin contar las suspendidas), y devuelve una
-- fila por aviso, dispositivo y actuación: un conjunto en dos escenarios son dos filas del
-- mismo aviso. Lo ya enviado no vuelve a salir. Lo reclamado y no enviado se puede volver a
-- reclamar pasados 5 minutos, hasta tres veces: es lo que usan los repasos de la tarde.
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
  direccion text
)
language sql
volatile
security invoker
set search_path = ''
as $$
  with candidatos as (
    select distinct
      f.usuario_id,
      f.conjunto_id,
      'hoy:' || to_char(p_noche, 'YYYY-MM-DD') || ':' || f.conjunto_id as clave
    from public.favoritos f
    where exists (
        select 1 from public.actuaciones a
        where a.conjunto_id = f.conjunto_id and a.noche = p_noche and a.estado <> 'suspendida'
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
  )
  select
    r.id,
    r.dueno,
    d.token,
    d.idioma,
    d.plataforma,
    cj.id,
    cj.slug,
    cj.nombre,
    a.id,
    a.noche,
    a.inicio,
    es.nombre,
    coalesce(a.direccion_texto, es.direccion)
  from reclamados r
  join candidatos c on c.usuario_id = r.dueno and c.clave = r.clave
  join public.conjuntos cj on cj.id = c.conjunto_id
  join public.actuaciones a
    on a.conjunto_id = c.conjunto_id and a.noche = p_noche and a.estado <> 'suspendida'
  join public.escenarios es on es.id = a.escenario_id
  join public.dispositivos_push d on d.usuario_id = r.dueno
  order by d.token, a.inicio, es.nombre, a.id
$$;

comment on function public.tomar_avisos_del_dia(date) is
  'Reclama y devuelve los avisos «tu conjunto actúa hoy» de una noche lógica que todavía no salieron: una fila por aviso, dispositivo y actuación. Sólo service role.';

-- ---------------------------------------------------------------- avisos de cambio

-- Cambios y suspensiones. Toma de la cola las actuaciones cuyo último cambio pendiente es
-- anterior a p_hasta (la ventana de calma: mientras se sigue tocando una actuación, espera),
-- las cierra y, si quedaron distintas de como estaban antes del primer cambio y son de
-- p_noche en adelante, reclama un aviso para cada usuario que sigue al conjunto y tiene un
-- dispositivo. Una fila por aviso y dispositivo. Todo en una sola sentencia: lo que se
-- toma queda cerrado y reclamado, así una segunda llamada no lo repite.
create function public.tomar_avisos_de_cambios(p_noche date, p_hasta timestamptz)
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
  with calmas as (
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
      a.conjunto_id as conjunto, a.noche as noche_act, a.inicio as inicio_act,
      a.estado as estado_act, a.escenario_id as escenario, a.direccion_texto as direccion_act
    from lotes l
    join public.actuaciones a on a.id = l.act
    where a.noche >= p_noche
      and (a.estado, a.inicio, a.escenario_id, a.direccion_texto)
        is distinct from (l.est, l.ini, l.esc, l.dir)
  ),
  reclamados as (
    insert into public.avisos_enviados (usuario_id, tipo, noche, clave)
    select distinct f.usuario_id, 'cambio'::public.tipo_aviso, n.noche_act, 'cambio:' || n.ultimo
    from netos n
    join public.favoritos f on f.conjunto_id = n.conjunto
    where exists (select 1 from public.dispositivos_push d where d.usuario_id = f.usuario_id)
    on conflict on constraint avisos_enviados_unico do nothing
    returning id, usuario_id as dueno, clave
  )
  select
    r.id,
    r.dueno,
    d.token,
    d.idioma,
    d.plataforma,
    cj.id,
    cj.slug,
    cj.nombre,
    n.act,
    n.noche_act,
    n.inicio_act,
    n.estado_act,
    n.est,
    n.ini,
    es.nombre,
    coalesce(n.direccion_act, es.direccion)
  from reclamados r
  join netos n on r.clave = 'cambio:' || n.ultimo
  join public.conjuntos cj on cj.id = n.conjunto
  join public.escenarios es on es.id = n.escenario
  join public.dispositivos_push d on d.usuario_id = r.dueno
  order by d.token, n.inicio_act, es.nombre, n.act
$$;

comment on function public.tomar_avisos_de_cambios(date, timestamptz) is
  'Cierra los cambios de la cola anteriores a p_hasta y devuelve, ya reclamados, los avisos de cambio o suspensión para quienes siguen a cada conjunto: una fila por aviso y dispositivo. Sólo service role.';

-- ---------------------------------------------------------------- cierre

create function public.cerrar_avisos(p_avisos bigint[]) returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  update public.avisos_enviados
    set enviado_en = now()
  where id = any (p_avisos) and enviado_en is null
$$;

comment on function public.cerrar_avisos(bigint[]) is
  'Marca como enviados los avisos que el servicio de push aceptó. Sólo service role.';

revoke all on function public.tomar_avisos_del_dia(date) from public, anon, authenticated;
revoke all on function public.tomar_avisos_de_cambios(date, timestamptz) from public, anon, authenticated;
revoke all on function public.cerrar_avisos(bigint[]) from public, anon, authenticated;
grant execute on function public.tomar_avisos_del_dia(date) to service_role;
grant execute on function public.tomar_avisos_de_cambios(date, timestamptz) to service_role;
grant execute on function public.cerrar_avisos(bigint[]) to service_role;
