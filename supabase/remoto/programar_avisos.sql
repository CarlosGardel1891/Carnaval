-- Programa las Edge Functions de avisos en el proyecto REMOTO (decisiones 47, 48 y 77).
--
-- No es una migración ni un seed: se corre a mano, una vez, en el SQL editor del proyecto
-- remoto. Se puede volver a correr: reemplaza las dos tareas. En el Supabase local no se usa
-- (ahí las funciones se llaman a mano; ver CLAUDE.md).
--
-- Antes, una sola vez y también en el SQL editor, guardar en Vault la dirección del proyecto y
-- la service role key. Esos dos valores NO van en este archivo ni en ningún otro del repo:
--
--   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
--   select vault.create_secret('<service role key>', 'service_role_key');
--
-- La service role key es la misma que las funciones reciben en SUPABASE_SERVICE_ROLE_KEY (la
-- «service_role» de Project Settings → API keys): comparan el pedido contra ese valor.
--
-- El cron corre en UTC y sólo despierta a las funciones: la hora de Montevideo y la ventana
-- de 12:00 a 19:00 las decide cada función (decisión 47).

create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$
begin
  if (select count(*) from vault.decrypted_secrets where name in ('project_url', 'service_role_key')) <> 2 then
    raise exception 'Faltan los secretos «project_url» y «service_role_key» en Vault: ver el encabezado de este archivo.';
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
      'Authorization', 'Bearer '
        || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
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
      'Authorization', 'Bearer '
        || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $cron$
);

-- Lo que quedó programado.
select jobname, schedule, active from cron.job where jobname like 'avisos-%' order by jobname;

-- Para mirar cómo vienen saliendo (las últimas corridas y la respuesta de cada función):
--   select jobname, status, start_time from cron.job_run_details d join cron.job j using (jobid)
--    order by start_time desc limit 10;
--   select status_code, content::text from net._http_response order by id desc limit 5;
--
-- Para sacarlas: select cron.unschedule('avisos-de-cambios'); select cron.unschedule('avisos-del-dia');
