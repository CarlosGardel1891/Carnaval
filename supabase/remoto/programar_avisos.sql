-- Programa las Edge Functions de avisos y la purga de usuarios anónimos inactivos en el
-- proyecto REMOTO (decisiones 47, 48, 77 y 84).
--
-- No es una migración ni un seed: se corre a mano, una vez, en el SQL editor del proyecto
-- remoto. Se puede volver a correr: reemplaza las dos tareas. En el Supabase local no se usa
-- (ahí las funciones se llaman a mano; ver CLAUDE.md).
--
-- Antes, una sola vez y también en el SQL editor, guardar en Vault la dirección del proyecto y
-- una secret key. Esos dos valores NO van en este archivo ni en ningún otro del repo:
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('sb_secret_…', 'secret_key');
--
-- La secret key es la «default» de Project Settings → API keys → Secret keys (o
-- `pnpm supabase projects api-keys --reveal`). Las funciones la reciben en SUPABASE_SECRET_KEYS
-- y comparan el encabezado `apikey` del pedido contra ese valor. No es un JWT: no va en
-- `Authorization` (decisión 78).
--
-- El cron corre en UTC y sólo despierta a las funciones: la hora de Montevideo y la ventana
-- de 12:00 a 19:00 las decide cada función (decisión 47).

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if (select count(*) from vault.decrypted_secrets where name in ('project_url', 'secret_key')) <> 2 then
    raise exception 'Faltan los secretos «project_url» y «secret_key» en Vault: ver el encabezado de este archivo.';
  end if;
end
$$;

-- Cambios y suspensiones: cada minuto.
select cron.schedule(
  'avisos-de-cambios',
  '* * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/avisos-de-cambios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);

-- «Tu conjunto actúa hoy»: cada 30 minutos. Fuera de su horario la función no hace nada.
select cron.schedule(
  'avisos-del-dia',
  '*/30 * * * *',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/avisos-del-dia',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);

-- Purga de los usuarios anónimos sin actividad en 13 meses (decisión 84): una vez por día, a
-- las 07:15 UTC (04:15 en Montevideo). No pasa por una Edge Function: es una función de la base.
select cron.schedule(
  'purga-anonimos',
  '15 7 * * *',
  $cron$ select public.purgar_anonimos_inactivos(now() - interval '13 months'); $cron$
);

-- Lo que quedó programado.
select jobname, schedule, active from cron.job
 where jobname like 'avisos-%' or jobname = 'purga-anonimos' order by jobname;

-- Para mirar cómo vienen saliendo (las últimas corridas y la respuesta de cada función):
--   select jobname, status, start_time from cron.job_run_details d join cron.job j using (jobid)
--    order by start_time desc limit 10;
--   select status_code, content::text from net._http_response order by id desc limit 5;
--
-- Para sacarlas: select cron.unschedule('avisos-de-cambios'); select cron.unschedule('avisos-del-dia');
--                 select cron.unschedule('purga-anonimos');
