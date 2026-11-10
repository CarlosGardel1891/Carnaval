-- Quién es admin (docs/DECISIONES.md, decisión 23).
--
-- Los usuarios de la app inician sesión anónima y por eso tienen el rol `authenticated`:
-- ese rol no alcanza para escribir datos públicos. Admin es quien tiene el claim
-- `app_metadata.rol = 'admin'` en su JWT. `app_metadata` sólo se cambia con la service role;
-- `user_metadata` lo edita el propio usuario y por eso no se mira.
create function public.es_admin() returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'rol', '') = 'admin'
$$;

comment on function public.es_admin() is
  'True si el JWT de la sesión tiene app_metadata.rol = admin. Las policies de escritura la exigen.';

revoke all on function public.es_admin() from public, anon, authenticated;
grant execute on function public.es_admin() to anon, authenticated, service_role;

-- temporadas: lectura pública, escritura sólo de admin.
-- Supabase da todos los privilegios sobre las tablas nuevas de `public` a anon y authenticated:
-- se quitan todos y se da sólo lo que hace falta. La escritura de `authenticated` la filtra RLS.
revoke all on table public.temporadas from anon, authenticated;
grant select on table public.temporadas to anon, authenticated;
grant insert, update, delete on table public.temporadas to authenticated;

create policy "temporadas: alta sólo admin"
  on public.temporadas for insert
  to authenticated
  with check ((select public.es_admin()));

create policy "temporadas: cambio sólo admin"
  on public.temporadas for update
  to authenticated
  using ((select public.es_admin()))
  with check ((select public.es_admin()));

create policy "temporadas: baja sólo admin"
  on public.temporadas for delete
  to authenticated
  using ((select public.es_admin()));
