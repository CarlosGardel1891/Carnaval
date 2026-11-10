-- Favoritos: los conjuntos que sigue cada usuario (anónimo o no). Sólo los ve y los toca su
-- dueño. Sin sesión no se lee nada. La service role los lee para mandar las push.

create table public.favoritos (
  usuario_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  conjunto_id bigint not null references public.conjuntos (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (usuario_id, conjunto_id)
);

comment on table public.favoritos is 'Conjuntos que sigue cada usuario. Privada: sólo su dueño.';
comment on column public.favoritos.usuario_id is
  'Por defecto, el usuario de la sesión. Se borra con el usuario (limpieza de anónimos).';

create index favoritos_conjunto_idx on public.favoritos (conjunto_id);

alter table public.favoritos enable row level security;

revoke all on table public.favoritos from anon, authenticated;
grant select, insert, delete on table public.favoritos to authenticated;

create policy "favoritos: los ve su dueño"
  on public.favoritos for select to authenticated
  using (usuario_id = (select auth.uid()));
create policy "favoritos: los agrega su dueño"
  on public.favoritos for insert to authenticated
  with check (usuario_id = (select auth.uid()));
create policy "favoritos: los quita su dueño"
  on public.favoritos for delete to authenticated
  using (usuario_id = (select auth.uid()));
