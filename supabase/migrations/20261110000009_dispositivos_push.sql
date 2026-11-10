-- Dispositivos registrados para recibir push. Sólo los ve y los borra su dueño. El alta y la
-- reasignación pasan por registrar_dispositivo_push; la service role los lee para mandar.

create type public.plataforma_push as enum ('ios', 'android');
create type public.idioma_app as enum ('es', 'en');

create table public.dispositivos_push (
  token text primary key,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  plataforma public.plataforma_push not null,
  idioma public.idioma_app not null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint dispositivos_push_token_ok check (
    btrim(token) <> '' and char_length(token) <= 4096
  )
);

comment on table public.dispositivos_push is
  'Tokens de push por dispositivo. Privada: sólo su dueño. Se escribe con registrar_dispositivo_push.';
comment on column public.dispositivos_push.token is
  'Token de FCM o APNs. Identifica al dispositivo: si cambia el usuario, la fila se reasigna.';
comment on column public.dispositivos_push.idioma is 'Idioma en el que se le mandan las push.';

create index dispositivos_push_usuario_idx on public.dispositivos_push (usuario_id);

create trigger dispositivos_push_tocar_actualizado_en
  before update on public.dispositivos_push
  for each row execute function public.tocar_actualizado_en();

alter table public.dispositivos_push enable row level security;

revoke all on table public.dispositivos_push from anon, authenticated;
grant select, delete on table public.dispositivos_push to authenticated;

create policy "dispositivos_push: los ve su dueño"
  on public.dispositivos_push for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy "dispositivos_push: los borra su dueño"
  on public.dispositivos_push for delete to authenticated
  using (usuario_id = (select auth.uid()));

-- Alta o reasignación del token al usuario de la sesión. Un mismo dispositivo puede pasar de
-- un usuario anónimo a otro (reinstalación, datos borrados): el token es el mismo y la fila
-- vieja es de otro usuario, que la RLS no deja tocar. Por eso es security definer, con
-- search_path fijo, y el usuario sale siempre de la sesión, nunca de un parámetro.
create function public.registrar_dispositivo_push(
  p_token text,
  p_plataforma public.plataforma_push,
  p_idioma public.idioma_app
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario uuid := auth.uid();
begin
  if v_usuario is null then
    raise exception 'Hace falta una sesión para registrar un dispositivo.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.dispositivos_push (token, usuario_id, plataforma, idioma)
  values (p_token, v_usuario, p_plataforma, p_idioma)
  on conflict (token) do update
    set usuario_id = excluded.usuario_id,
        plataforma = excluded.plataforma,
        idioma = excluded.idioma;
end
$$;

comment on function public.registrar_dispositivo_push(text, public.plataforma_push, public.idioma_app) is
  'Registra el token de push para el usuario de la sesión, o lo reasigna si ya era de otro. La app la llama en cada arranque.';

revoke all on function public.registrar_dispositivo_push(text, public.plataforma_push, public.idioma_app)
  from public, anon, authenticated;
grant execute on function public.registrar_dispositivo_push(text, public.plataforma_push, public.idioma_app)
  to authenticated;
