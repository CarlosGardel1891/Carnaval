-- Conjuntos, su participación por temporada y escenarios, con la unicidad de nombre + alias
-- normalizados (docs/DECISIONES.md, decisiones 22 a 24).
--
-- En todas las tablas: RLS activada, lectura pública y escritura sólo de admin. Supabase da
-- todos los privilegios sobre las tablas nuevas a anon y authenticated: se quitan y se da
-- sólo lo necesario. Los textos opcionales son null cuando no hay dato, nunca vacíos.

-- ---------------------------------------------------------------- tipos y helpers

create type public.categoria_conjunto as enum (
  'murga', 'parodistas', 'humoristas', 'revista', 'comparsa', 'samba', 'otro'
);

create type public.tipo_escenario as enum (
  'teatro_verano', 'privado', 'popular', 'movil', 'gratuito', 'barrio_a_barrio'
);

-- `norm` de cada elemento, en el mismo orden. Para la columna generada `alias_norm`.
create function public.norm_lista(t text[]) returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(public.norm(u.x) order by u.i), '{}'::text[])
  from unnest(t) with ordinality as u(x, i)
$$;

comment on function public.norm_lista(text[]) is
  'Aplica public.norm a cada elemento de la lista, en el mismo orden.';

revoke all on function public.norm_lista(text[]) from public, anon, authenticated;
grant execute on function public.norm_lista(text[]) to anon, authenticated, service_role;

-- ---------------------------------------------------------------- conjuntos

create table public.conjuntos (
  id bigint generated always as identity primary key,
  slug text not null unique,
  nombre text not null,
  alias text[] not null default '{}',
  categoria public.categoria_conjunto not null,
  barrio text,
  bio text,
  instagram text,
  facebook text,
  foto_url text,
  verificado boolean not null default false,
  fuente_url text[] not null default '{}',
  nombre_norm text generated always as (public.norm(nombre)) stored,
  alias_norm text[] generated always as (public.norm_lista(alias)) stored,
  constraint conjuntos_slug_ok check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint conjuntos_nombre_ok check (public.norm(nombre) <> ''),
  constraint conjuntos_alias_ok check (
    array_position(alias, null) is null and not ('' = any (public.norm_lista(alias)))
  ),
  constraint conjuntos_fuente_url_ok check (
    array_position(fuente_url, null) is null and not ('' = any (fuente_url))
  ),
  constraint conjuntos_textos_ok check (
    barrio <> '' and bio <> '' and instagram <> '' and facebook <> '' and foto_url <> ''
  )
);

comment on table public.conjuntos is
  'Murgas, comparsas y demás conjuntos. Los datos que cambian por temporada van en conjunto_temporada.';
comment on column public.conjuntos.alias is
  'Otras formas de escribir el nombre, tal como aparecen en carteleras y grillas.';
comment on column public.conjuntos.verificado is
  'False si la fila salió de una sola fuente no oficial y falta confirmarla.';
comment on column public.conjuntos.nombre_norm is 'public.norm(nombre). Generada.';
comment on column public.conjuntos.alias_norm is 'public.norm de cada alias, en el mismo orden. Generada.';

-- ---------------------------------------------------------------- escenarios

create table public.escenarios (
  id bigint generated always as identity primary key,
  slug text not null unique,
  nombre text not null,
  alias text[] not null default '{}',
  tipo public.tipo_escenario,
  direccion text,
  barrio text,
  ubicacion extensions.geography (Point, 4326),
  precio_texto text,
  gratis boolean,
  activo boolean not null default true,
  itinerante boolean,
  fuente_url text[] not null default '{}',
  nombre_norm text generated always as (public.norm(nombre)) stored,
  alias_norm text[] generated always as (public.norm_lista(alias)) stored,
  constraint escenarios_slug_ok check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint escenarios_nombre_ok check (public.norm(nombre) <> ''),
  constraint escenarios_alias_ok check (
    array_position(alias, null) is null and not ('' = any (public.norm_lista(alias)))
  ),
  constraint escenarios_fuente_url_ok check (
    array_position(fuente_url, null) is null and not ('' = any (fuente_url))
  ),
  constraint escenarios_textos_ok check (direccion <> '' and barrio <> '' and precio_texto <> '')
);

comment on table public.escenarios is 'Tablados y escenarios donde actúan los conjuntos.';
comment on column public.escenarios.tipo is 'Null si todavía no se sabe.';
comment on column public.escenarios.ubicacion is
  'Punto fijo del escenario. Null si no se relevó o si es itinerante (se ubica por sus actuaciones).';
comment on column public.escenarios.gratis is 'Null si todavía no se sabe.';
comment on column public.escenarios.activo is 'False si no funciona en la temporada actual.';
comment on column public.escenarios.itinerante is
  'True si cambia de lugar cada noche (escenarios móviles). Null si todavía no se sabe.';
comment on column public.escenarios.nombre_norm is 'public.norm(nombre). Generada.';
comment on column public.escenarios.alias_norm is 'public.norm de cada alias, en el mismo orden. Generada.';

create index escenarios_ubicacion_idx on public.escenarios using gist (ubicacion);

-- ---------------------------------------------------------------- conjunto_temporada

create table public.conjunto_temporada (
  conjunto_id bigint not null references public.conjuntos (id) on delete cascade,
  temporada_id bigint not null references public.temporadas (id),
  en_concurso boolean,
  en_llamadas boolean not null default false,
  primary key (conjunto_id, temporada_id)
);

comment on table public.conjunto_temporada is 'Participación de un conjunto en una temporada.';
comment on column public.conjunto_temporada.en_concurso is
  'Si está en el Concurso Oficial. Null = pendiente (por ejemplo, hasta la Prueba de Admisión).';
comment on column public.conjunto_temporada.en_llamadas is 'Si desfila en las Llamadas.';

create index conjunto_temporada_temporada_idx on public.conjunto_temporada (temporada_id);

-- ---------------------------------------------------------------- unicidad de nombre + alias

-- Un nombre o alias normalizado apunta a un solo conjunto (o a un solo escenario): es lo que
-- usa el importador de grillas para reconocer «CABALLEROS». Una clave por fila; las mantiene
-- un trigger y nadie las escribe a mano.
create table public.conjunto_nombres (
  nombre_norm text primary key,
  conjunto_id bigint not null references public.conjuntos (id) on delete cascade
);

comment on table public.conjunto_nombres is
  'Claves normalizadas (nombre y alias) de cada conjunto. La mantiene un trigger; sólo lectura.';

create index conjunto_nombres_conjunto_idx on public.conjunto_nombres (conjunto_id);

create table public.escenario_nombres (
  nombre_norm text primary key,
  escenario_id bigint not null references public.escenarios (id) on delete cascade
);

comment on table public.escenario_nombres is
  'Claves normalizadas (nombre y alias) de cada escenario. La mantiene un trigger; sólo lectura.';

create index escenario_nombres_escenario_idx on public.escenario_nombres (escenario_id);

-- Security definer con search_path fijo: quien escribe en conjuntos es un admin con rol
-- `authenticated`, que no tiene permiso de escritura sobre la tabla de claves.
create function public.conjuntos_sincronizar_nombres() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  choque record;
begin
  delete from public.conjunto_nombres where conjunto_id = new.id;

  select n.nombre_norm, c.slug into choque
  from public.conjunto_nombres n
  join public.conjuntos c on c.id = n.conjunto_id
  where n.nombre_norm = any (array[new.nombre_norm] || new.alias_norm)
  limit 1;
  if found then
    raise exception 'El nombre o alias «%» ya es del conjunto «%».', choque.nombre_norm, choque.slug
      using errcode = 'unique_violation';
  end if;

  insert into public.conjunto_nombres (nombre_norm, conjunto_id)
  select distinct k, new.id
  from unnest(array[new.nombre_norm] || new.alias_norm) as k;
  return null;
end
$$;

create function public.escenarios_sincronizar_nombres() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  choque record;
begin
  delete from public.escenario_nombres where escenario_id = new.id;

  select n.nombre_norm, e.slug into choque
  from public.escenario_nombres n
  join public.escenarios e on e.id = n.escenario_id
  where n.nombre_norm = any (array[new.nombre_norm] || new.alias_norm)
  limit 1;
  if found then
    raise exception 'El nombre o alias «%» ya es del escenario «%».', choque.nombre_norm, choque.slug
      using errcode = 'unique_violation';
  end if;

  insert into public.escenario_nombres (nombre_norm, escenario_id)
  select distinct k, new.id
  from unnest(array[new.nombre_norm] || new.alias_norm) as k;
  return null;
end
$$;

revoke all on function public.conjuntos_sincronizar_nombres() from public, anon, authenticated;
revoke all on function public.escenarios_sincronizar_nombres() from public, anon, authenticated;

create trigger conjuntos_sincronizar_nombres
  after insert or update of nombre, alias on public.conjuntos
  for each row execute function public.conjuntos_sincronizar_nombres();

create trigger escenarios_sincronizar_nombres
  after insert or update of nombre, alias on public.escenarios
  for each row execute function public.escenarios_sincronizar_nombres();

-- ---------------------------------------------------------------- permisos y RLS

alter table public.conjuntos enable row level security;
alter table public.escenarios enable row level security;
alter table public.conjunto_temporada enable row level security;
alter table public.conjunto_nombres enable row level security;
alter table public.escenario_nombres enable row level security;

revoke all on table
  public.conjuntos, public.escenarios, public.conjunto_temporada,
  public.conjunto_nombres, public.escenario_nombres
  from anon, authenticated;

grant select on table
  public.conjuntos, public.escenarios, public.conjunto_temporada,
  public.conjunto_nombres, public.escenario_nombres
  to anon, authenticated;

grant insert, update, delete on table
  public.conjuntos, public.escenarios, public.conjunto_temporada
  to authenticated;

-- conjuntos
create policy "conjuntos: lectura pública"
  on public.conjuntos for select to anon, authenticated using (true);
create policy "conjuntos: alta sólo admin"
  on public.conjuntos for insert to authenticated with check ((select public.es_admin()));
create policy "conjuntos: cambio sólo admin"
  on public.conjuntos for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "conjuntos: baja sólo admin"
  on public.conjuntos for delete to authenticated using ((select public.es_admin()));

-- escenarios
create policy "escenarios: lectura pública"
  on public.escenarios for select to anon, authenticated using (true);
create policy "escenarios: alta sólo admin"
  on public.escenarios for insert to authenticated with check ((select public.es_admin()));
create policy "escenarios: cambio sólo admin"
  on public.escenarios for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "escenarios: baja sólo admin"
  on public.escenarios for delete to authenticated using ((select public.es_admin()));

-- conjunto_temporada
create policy "conjunto_temporada: lectura pública"
  on public.conjunto_temporada for select to anon, authenticated using (true);
create policy "conjunto_temporada: alta sólo admin"
  on public.conjunto_temporada for insert to authenticated with check ((select public.es_admin()));
create policy "conjunto_temporada: cambio sólo admin"
  on public.conjunto_temporada for update to authenticated
  using ((select public.es_admin())) with check ((select public.es_admin()));
create policy "conjunto_temporada: baja sólo admin"
  on public.conjunto_temporada for delete to authenticated using ((select public.es_admin()));

-- tablas de claves: sólo lectura para todos; las escribe el trigger
create policy "conjunto_nombres: lectura pública"
  on public.conjunto_nombres for select to anon, authenticated using (true);
create policy "escenario_nombres: lectura pública"
  on public.escenario_nombres for select to anon, authenticated using (true);
