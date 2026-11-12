-- Borrar mis datos y purga de los usuarios anónimos inactivos (decisión 84).
--
-- La app no pide registro: el primer «Seguir» crea un usuario anónimo (decisión 44). De ese
-- usuario cuelgan sus seguidos (`favoritos`), su dispositivo (`dispositivos_push`) y sus avisos
-- (`avisos_enviados`), todos con `on delete cascade` hacia `auth.users` (decisión 23). Borrar
-- el usuario se lleva todo.

-- Lo llama la app, con la sesión del propio usuario. No recibe ningún id: sólo borra al que
-- llama. Sin sesión no hace nada.
create function public.borrar_mis_datos()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := (select auth.uid());
  v_anonimo boolean;
begin
  if v_usuario is null then
    return;
  end if;

  select u.is_anonymous into v_anonimo from auth.users u where u.id = v_usuario;

  -- Lo de la app se borra siempre, sea quien sea.
  delete from public.favoritos where usuario_id = v_usuario;
  delete from public.dispositivos_push where usuario_id = v_usuario;
  delete from public.avisos_enviados where usuario_id = v_usuario;

  -- El usuario, sólo si es anónimo: una cuenta con email es de un admin del panel y se da de
  -- baja con `pnpm admin:baja`, no desde la app.
  if coalesce(v_anonimo, false) then
    delete from auth.users where id = v_usuario;
  end if;
end;
$$;

comment on function public.borrar_mis_datos() is
  'Borra los seguidos, los dispositivos y los avisos de quien la llama y, si es un usuario anónimo, también el usuario (decisión 84).';

revoke all on function public.borrar_mis_datos() from public, anon;
grant execute on function public.borrar_mis_datos() to authenticated;

-- Purga: los usuarios anónimos sin actividad desde antes de `p_antes` (decisión 84: 13 meses).
-- La fecha llega como parámetro, igual que la noche lógica en el resto de las funciones: la
-- calcula la tarea programada (`supabase/remoto/programar_avisos.sql`). «Actividad» es lo
-- último de: el alta, el último inicio o refresco de sesión, el último «Seguir» y la última
-- vez que la app registró el dispositivo (lo hace en cada arranque).
create function public.purgar_anonimos_inactivos(p_antes timestamptz, p_limite integer default 1000)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_borrados integer;
begin
  if p_antes is null then
    raise exception 'Falta la fecha de corte.';
  end if;

  with inactivos as (
    select u.id
      from auth.users u
     where u.is_anonymous
       and greatest(
             u.created_at,
             coalesce(u.last_sign_in_at, u.created_at),
             coalesce((select max(greatest(s.created_at, coalesce(s.refreshed_at at time zone 'utc', s.created_at), coalesce(s.updated_at, s.created_at)))
                         from auth.sessions s where s.user_id = u.id), u.created_at),
             coalesce((select max(f.creado_en) from public.favoritos f where f.usuario_id = u.id), u.created_at),
             coalesce((select max(d.actualizado_en) from public.dispositivos_push d where d.usuario_id = u.id), u.created_at)
           ) < p_antes
     order by u.created_at
     limit greatest(coalesce(p_limite, 1000), 0)
  ),
  borrados as (
    delete from auth.users u using inactivos i where u.id = i.id returning 1
  )
  select count(*) into v_borrados from borrados;

  return v_borrados;
end;
$$;

comment on function public.purgar_anonimos_inactivos(timestamptz, integer) is
  'Borra los usuarios anónimos sin actividad desde antes de la fecha dada, y con ellos sus datos. Sólo la service role (decisión 84).';

revoke all on function public.purgar_anonimos_inactivos(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.purgar_anonimos_inactivos(timestamptz, integer) to service_role;
