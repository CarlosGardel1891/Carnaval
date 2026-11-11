-- Venta de entradas de un evento (docs/DECISIONES.md, decisión 60).
--
-- El enlace a la venta oficial es un dato, no código: la venta del Concurso se anuncia días
-- antes de que empiece, después de mandar la app a las tiendas. Se carga por evento; el del
-- Concurso es el de su evento de tipo `concurso`. La app no vende: muestra dónde se compra, y
-- sólo si hay algo cargado.

alter table public.eventos
  add column entradas_url text,
  add column entradas_texto text;

alter table public.eventos
  add constraint eventos_entradas_ok check (
    entradas_url ~ '^https?://\S+$' and entradas_texto <> ''
  );

comment on column public.eventos.entradas_url is
  'Dirección de la venta oficial de entradas. Null mientras no se anuncie. No sale del seed: se carga cuando se publica.';
comment on column public.eventos.entradas_texto is
  'Dónde y desde cuándo se venden las entradas, en pocas palabras (por ejemplo, la boletería y los locales). Null si no hay dato.';
