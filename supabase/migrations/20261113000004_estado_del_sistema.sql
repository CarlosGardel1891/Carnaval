-- Estado del sistema (decisión 89): saber, sin entrar a mirar logs, si las tareas programadas
-- del proyecto remoto vienen corriendo.
--
-- Cada tarea deja un «latido» cuando termina bien: las dos Edge Functions de avisos lo dejan
-- al final de cada pasada, y la purga de anónimos, desde su tarea de pg_cron. Si una tarea deja
-- de correr o empieza a fallar, su latido queda viejo. `estado_del_sistema()` compara cada uno
-- contra su límite; lo leen el panel y la Edge Function `estado`, que consulta un monitor
-- externo para avisar por mail.

create table public.latidos (
  tarea text primary key check (btrim(tarea) <> ''),
  ultimo_ok timestamptz not null default now(),
  -- Lo último que informó la tarea (por ejemplo, cuántos avisos mandó o si corre en simulacro).
  detalle jsonb
);

comment on table public.latidos is
  'La última vez que cada tarea programada terminó bien (decisión 89). La escriben las tareas; se lee con estado_del_sistema().';

alter table public.latidos enable row level security;
revoke all on table public.latidos from anon, authenticated;

create function public.registrar_latido(p_tarea text, p_detalle jsonb default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.latidos (tarea, ultimo_ok, detalle)
  values (p_tarea, now(), p_detalle)
  on conflict (tarea) do update set ultimo_ok = excluded.ultimo_ok, detalle = excluded.detalle
$$;

comment on function public.registrar_latido(text, jsonb) is
  'Anota que una tarea programada terminó bien. Sólo la service role y las tareas de pg_cron.';

revoke all on function public.registrar_latido(text, jsonb) from public, anon, authenticated;
grant execute on function public.registrar_latido(text, jsonb) to service_role;

-- Las tareas que tienen que estar corriendo, con los minutos que puede pasar sin latido cada
-- una antes de darla por caída: varias veces su frecuencia, para no avisar por una pasada
-- que tardó o falló sola.
--   avisos-de-cambios   cada minuto        → 10 minutos
--   avisos-del-dia      cada 30 minutos    → 100 minutos
--   purga-anonimos      una vez por día    → 26 horas
create function public.estado_del_sistema()
returns table (
  tarea text,
  ultimo_ok timestamptz,
  minutos integer,
  limite_min integer,
  al_dia boolean,
  detalle jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if coalesce((select auth.role()), '') <> 'service_role' and not (select public.es_admin()) then
    raise exception 'Sólo un admin puede ver el estado del sistema.' using errcode = '42501';
  end if;

  return query
  select
    t.tarea,
    l.ultimo_ok,
    (floor(extract(epoch from (now() - l.ultimo_ok)) / 60))::integer,
    t.limite_min,
    coalesce(l.ultimo_ok > now() - make_interval(mins => t.limite_min), false),
    l.detalle
  from (
    values
      ('avisos-de-cambios', 10),
      ('avisos-del-dia', 100),
      ('purga-anonimos', 26 * 60)
  ) as t (tarea, limite_min)
  left join public.latidos l on l.tarea = t.tarea
  order by t.tarea;
end;
$$;

comment on function public.estado_del_sistema() is
  'Cada tarea programada con la última vez que terminó bien y si está al día. Para el panel (admins) y la Edge Function estado (service role).';

revoke all on function public.estado_del_sistema() from public, anon;
grant execute on function public.estado_del_sistema() to authenticated, service_role;
