-- Fixture del Concurso Oficial (docs/DECISIONES.md, decisión 57).
--
-- El modelo no cambia: una noche del Concurso es una fila de `etapas_concurso` y sus conjuntos
-- son las `actuaciones` del Teatro de Verano que llevan ese `etapa_id`. Acá se agrega de dónde
-- salió cada etapa (para poder marcar las de prueba, como en `actuaciones`) y la consulta que
-- arma el fixture entero.

-- ---------------------------------------------------------------- fuente de la etapa

-- La tabla está vacía en todos lados (el fixture 2027 todavía no se publicó). El valor por
-- defecto es sólo para poder agregar la columna si hubiera filas; se quita enseguida: de acá
-- en más, quien carga una etapa tiene que decir de dónde salió.
alter table public.etapas_concurso
  add column fuente text not null default 'sin fuente',
  add column fuente_url text;

alter table public.etapas_concurso alter column fuente drop default;

alter table public.etapas_concurso
  add constraint etapas_concurso_textos_ok check (fuente <> '' and fuente_url <> '');

comment on column public.etapas_concurso.fuente is
  'De dónde salió la etapa (por ejemplo, el fixture publicado por DAECPU). «fixture-ficticio» marca datos de desarrollo.';
comment on column public.etapas_concurso.fuente_url is 'Dirección de la fuente, si hay.';

-- ---------------------------------------------------------------- fixture_del_concurso

-- El fixture de una temporada: una fila por conjunto y noche, en el orden en que se muestra
-- (rueda, número de etapa, hora). Una etapa que todavía no tiene conjuntos cargados sale
-- igual, con una sola fila sin actuación. Si la temporada no tiene etapas no devuelve nada:
-- el fixture no está publicado.
--
-- Recibe el año de la temporada y no «la vigente»: sirve igual para años anteriores, que es
-- lo que va a pedir el historial (decisión 58).
create function public.fixture_del_concurso(p_anio integer)
returns table (
  etapa_id bigint,
  rueda public.rueda_concurso,
  numero smallint,
  fecha date,
  fuente text,
  actuacion_id bigint,
  inicio timestamptz,
  estado public.estado_actuacion,
  conjunto_id bigint,
  conjunto_slug text,
  conjunto_nombre text,
  conjunto_categoria public.categoria_conjunto
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    et.id,
    et.rueda,
    et.numero,
    et.fecha,
    et.fuente,
    a.id,
    a.inicio,
    a.estado,
    c.id,
    c.slug,
    c.nombre,
    c.categoria
  from public.etapas_concurso et
  join public.temporadas t on t.id = et.temporada_id
  left join public.actuaciones a on a.etapa_id = et.id
  left join public.conjuntos c on c.id = a.conjunto_id
  where t.anio = p_anio
  order by et.rueda, et.numero, a.inicio, c.nombre, a.id
$$;

comment on function public.fixture_del_concurso(integer) is
  'Fixture del Concurso Oficial de una temporada (por año): una fila por conjunto y noche, por rueda, etapa y hora. Las etapas sin conjuntos salen con la actuación en null. Vacío si no hay fixture publicado.';

revoke all on function public.fixture_del_concurso(integer) from public, anon, authenticated;
grant execute on function public.fixture_del_concurso(integer) to anon, authenticated, service_role;
