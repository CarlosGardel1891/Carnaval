-- Una fila por edición del carnaval. El modo Llamadas se activa por estas fechas,
-- nunca por el tipo de evento (docs/DECISIONES.md).
create table public.temporadas (
  id bigint generated always as identity primary key,
  anio smallint not null unique check (anio between 2000 and 2100),
  fecha_inicio date not null,
  fecha_fin date not null,
  modo_llamadas_desde date,
  modo_llamadas_hasta date,
  constraint temporadas_fechas_ok check (fecha_fin >= fecha_inicio),
  constraint temporadas_llamadas_completas check (
    (modo_llamadas_desde is null) = (modo_llamadas_hasta is null)
  ),
  constraint temporadas_llamadas_ok check (
    modo_llamadas_desde is null
    or (
      modo_llamadas_hasta >= modo_llamadas_desde
      and modo_llamadas_desde >= fecha_inicio
      and modo_llamadas_hasta <= fecha_fin
    )
  )
);

comment on table public.temporadas is 'Ediciones del carnaval y ventana del modo Llamadas.';

-- Lectura pública; escritura sólo con service role (que saltea RLS).
alter table public.temporadas enable row level security;

create policy "temporadas: lectura pública"
  on public.temporadas for select
  to anon, authenticated
  using (true);

revoke insert, update, delete, truncate on public.temporadas from anon, authenticated;
