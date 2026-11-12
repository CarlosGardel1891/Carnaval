#!/usr/bin/env python3
"""Genera supabase/seeds/02_research.sql a partir de los CSV de research/.

Antes de generar corre research/validate.py: si hay errores, no escribe nada.

El SQL se puede correr más de una vez: inserta o actualiza por slug, y sólo toca las
columnas que salen de los CSV (no pisa bio, foto, ubicación, recorrido ni la venta de
entradas). La `info` de un evento sale del calendario cuando la trae; si el CSV la deja vacía,
se conserva la que haya en la base. Los alias de conjuntos y escenarios se unen con los que ya
haya: uno agregado desde el panel no se pierde, y uno que se saca del CSV no se borra solo.

Participación en la temporada (`conjunto_temporada`): sólo para las filas respaldadas por
una lista oficial de esa temporada (`temporada_lista` igual al año). Las demás quedan en el
catálogo de conjuntos, sin participación.

El fixture del Concurso Oficial sale de research/fixture_{año}.csv. Mientras no se publique,
el archivo tiene sólo el encabezado y el seed no carga ninguna etapa.

Uso:
    python scripts/gen_seed.py                 valida y escribe el seed
    python scripts/gen_seed.py --post-prueba   igual, validando con --post-prueba
    python scripts/gen_seed.py --check         falla si el seed no está al día
    python scripts/gen_seed.py --solo-fixture ARCHIVO
                                               imprime sólo el SQL del fixture de ese archivo,
                                               sin validar ni escribir nada (para probarlo)
    python scripts/gen_seed.py --solo-orden ARCHIVO
                                               lo mismo, con el orden de desfile de las Llamadas

Sólo usa la biblioteca estándar (research/validate.py necesita pandas).
"""
import argparse
import csv
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RESEARCH = RAIZ / "research"
SEED = RAIZ / "supabase" / "seeds" / "02_research.sql"

TEMPORADA = 2027
CALENDARIO = f"calendario_{TEMPORADA}.csv"
FIXTURE = f"fixture_{TEMPORADA}.csv"
RECORRIDO = f"llamadas_recorrido_{TEMPORADA}.csv"
CORTES = f"llamadas_cortes_{TEMPORADA}.csv"
ORDEN = f"llamadas_orden_{TEMPORADA}.csv"
FUENTE_ORDEN = f"research/{ORDEN}"
# El escenario del Concurso y la marca de lo que sale del fixture publicado.
TEATRO_DE_VERANO = "teatro-de-verano-ramon-collazo"
FUENTE_FIXTURE = f"research/{FIXTURE}"


def validar(post_prueba):
    orden = [sys.executable, str(RESEARCH / "validate.py"), "--quiet"]
    if post_prueba:
        orden.append("--post-prueba")
    if subprocess.run(orden, cwd=RAIZ).returncode != 0:
        sys.exit("gen_seed: research/validate.py encontró errores; no se genera el seed.")


def leer(archivo):
    with open(Path(archivo) if Path(archivo).is_absolute() else RESEARCH / archivo,
              encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


# ---------------------------------------------------------------- literales SQL

def texto(valor):
    """Literal de texto; vacío es null."""
    return "'" + valor.replace("'", "''") + "'" if valor else "null"


def lista(valor, separador):
    """Literal text[] a partir de un campo con separador; vacío es un array vacío."""
    partes = [p.strip() for p in valor.split(separador) if p.strip()]
    if not partes:
        return "'{}'::text[]"
    return "array[" + ", ".join(texto(p) for p in partes) + "]"


def booleano(valor, columna, slug, admite_vacio=True):
    if valor in ("true", "false"):
        return valor
    if valor == "" and admite_vacio:
        return "null::boolean"
    sys.exit(f"gen_seed: {columna} = «{valor}» en {slug}: la base no lo admite.")


def filas(tuplas):
    return ",\n".join("  (" + ", ".join(t) + ")" for t in tuplas)


# ---------------------------------------------------------------- secciones

def sql_conjuntos(conjuntos):
    valores = filas(
        (
            texto(c["slug"]),
            texto(c["nombre"]),
            lista(c["alias"], "|"),
            texto(c["categoria"]),
            texto(c["barrio"]),
            texto(c["instagram_url"]),
            texto(c["facebook_url"]),
            booleano(c["verificado"], "verificado", c["slug"], admite_vacio=False),
            lista(c["fuente_url"], " | "),
        )
        for c in conjuntos
    )
    return f"""-- ---------------------------------------------------------------- conjuntos ({len(conjuntos)})

insert into public.conjuntos
  (slug, nombre, alias, categoria, barrio, instagram, facebook, verificado, fuente_url)
select v.slug, v.nombre, v.alias, v.categoria::public.categoria_conjunto, v.barrio,
       v.instagram, v.facebook, v.verificado, v.fuente_url
from (values
{valores}
) as v (slug, nombre, alias, categoria, barrio, instagram, facebook, verificado, fuente_url)
on conflict (slug) do update set
  nombre = excluded.nombre,
  -- Los alias se unen: los que ya hay en la base (por ejemplo, agregados desde el panel) se
  -- conservan y se suman los del CSV que falten (decisión 75).
  alias = conjuntos.alias || array(
    select a.alias
    from unnest(excluded.alias) with ordinality as a (alias, n)
    where public.norm(a.alias) <> all (conjuntos.alias_norm)
    order by a.n
  ),
  categoria = excluded.categoria,
  barrio = excluded.barrio,
  instagram = excluded.instagram,
  facebook = excluded.facebook,
  verificado = excluded.verificado,
  fuente_url = excluded.fuente_url;
"""


def sql_conjunto_temporada(conjuntos):
    con_lista = [c for c in conjuntos if c["temporada_lista"] == str(TEMPORADA)]
    sin_lista = [c for c in conjuntos if c["temporada_lista"] != str(TEMPORADA)]
    valores = filas(
        (
            texto(c["slug"]),
            booleano(c["en_concurso"], "en_concurso", c["slug"]),
            booleano(c["en_llamadas"], "en_llamadas", c["slug"], admite_vacio=False),
        )
        for c in con_lista
    )
    sql = f"""-- ---------------------------------------------------------------- conjunto_temporada {TEMPORADA} ({len(con_lista)})

-- Sólo los conjuntos respaldados por una lista oficial {TEMPORADA}. en_concurso null = pendiente.
insert into public.conjunto_temporada (conjunto_id, temporada_id, en_concurso, en_llamadas)
select c.id, t.id, v.en_concurso, v.en_llamadas
from (values
{valores}
) as v (slug, en_concurso, en_llamadas)
join public.conjuntos c on c.slug = v.slug
join public.temporadas t on t.anio = {TEMPORADA}
on conflict (conjunto_id, temporada_id) do update set
  en_concurso = excluded.en_concurso,
  en_llamadas = excluded.en_llamadas;
"""
    if sin_lista:
        slugs = ",\n".join("    " + texto(c["slug"]) for c in sin_lista)
        sql += f"""
-- Sin lista {TEMPORADA} que los respalde ({len(sin_lista)}): quedan en el catálogo, sin participación.
delete from public.conjunto_temporada ct
using public.conjuntos c, public.temporadas t
where c.id = ct.conjunto_id
  and t.id = ct.temporada_id
  and t.anio = {TEMPORADA}
  and c.slug in (
{slugs}
  );
"""
    return sql, len(con_lista), len(sin_lista)


def sql_escenarios(escenarios):
    valores = filas(
        (
            texto(e["slug"]),
            texto(e["nombre"]),
            lista(e["alias"], "|"),
            texto(e["tipo"]),
            texto(e["direccion"]),
            texto(e["barrio"]),
            texto(e["precio_texto"]),
            booleano(e["gratis"], "gratis", e["slug"]),
            booleano(e["activo"], "activo", e["slug"], admite_vacio=False),
            booleano(e["itinerante"], "itinerante", e["slug"]),
            lista(e["fuente_url"], " | "),
        )
        for e in escenarios
    )
    return f"""-- ---------------------------------------------------------------- escenarios ({len(escenarios)})

-- Sin ubicación: las coordenadas se cargan aparte, cuando estén verificadas.
insert into public.escenarios
  (slug, nombre, alias, tipo, direccion, barrio, precio_texto, gratis, activo, itinerante, fuente_url)
select v.slug, v.nombre, v.alias, v.tipo::public.tipo_escenario, v.direccion, v.barrio,
       v.precio_texto, v.gratis, v.activo, v.itinerante, v.fuente_url
from (values
{valores}
) as v (slug, nombre, alias, tipo, direccion, barrio, precio_texto, gratis, activo, itinerante, fuente_url)
on conflict (slug) do update set
  nombre = excluded.nombre,
  -- Los alias se unen: los que ya hay en la base (por ejemplo, agregados desde el panel) se
  -- conservan y se suman los del CSV que falten (decisión 75).
  alias = escenarios.alias || array(
    select a.alias
    from unnest(excluded.alias) with ordinality as a (alias, n)
    where public.norm(a.alias) <> all (escenarios.alias_norm)
    order by a.n
  ),
  tipo = excluded.tipo,
  direccion = excluded.direccion,
  barrio = excluded.barrio,
  precio_texto = excluded.precio_texto,
  gratis = excluded.gratis,
  activo = excluded.activo,
  itinerante = excluded.itinerante,
  fuente_url = excluded.fuente_url;
"""


def sql_eventos(eventos):
    valores = filas(
        (
            texto(e["slug"]),
            texto(e["tipo"]),
            texto(e["evento"]),
            texto(e["fecha_inicio"]) + "::date",
            texto(e["fecha_fin"]) + "::date",
            texto(e["lugar"]),
            texto(e["estado"]),
            texto(e["info"]),
            lista(e["fuente_url"], " | "),
        )
        for e in eventos
    )
    return f"""-- ---------------------------------------------------------------- eventos ({len(eventos)})

insert into public.eventos
  (temporada_id, slug, tipo, nombre, fecha_inicio, fecha_fin, lugar, estado, info, fuente_url)
select t.id, v.slug, v.tipo::public.tipo_evento, v.nombre, v.fecha_inicio, v.fecha_fin, v.lugar,
       v.estado::public.estado_evento, v.info, v.fuente_url
from (values
{valores}
) as v (slug, tipo, nombre, fecha_inicio, fecha_fin, lugar, estado, info, fuente_url)
join public.temporadas t on t.anio = {TEMPORADA}
on conflict (slug) do update set
  temporada_id = excluded.temporada_id,
  tipo = excluded.tipo,
  nombre = excluded.nombre,
  fecha_inicio = excluded.fecha_inicio,
  fecha_fin = excluded.fecha_fin,
  lugar = excluded.lugar,
  estado = excluded.estado,
  -- Si el calendario no trae info, queda la que se haya cargado en la base.
  info = coalesce(excluded.info, public.eventos.info),
  fuente_url = excluded.fuente_url;
"""


def sql_fixture(fixture):
    """El fixture del Concurso: las etapas (una por noche) y sus actuaciones en el Teatro de Verano.

    Igual que el resto del seed, inserta o actualiza y no borra: si una fila sale del CSV, la
    actuación queda en la base y hay que quitarla a mano. Una actuación que ya estaba y no
    cambió no se toca, así volver a correr el seed no encola avisos de cambio.
    """
    titulo = f"-- ---------------------------------------------------------------- fixture del Concurso ({len(fixture)})\n"
    if not fixture:
        return titulo + f"""
-- research/{FIXTURE} todavía no tiene filas: el fixture {TEMPORADA} no se publicó.
"""
    etapas = sorted({(f["rueda"], int(f["numero"]), f["fecha"]) for f in fixture},
                    key=lambda e: (["primera", "segunda", "liguilla"].index(e[0]), e[1]))
    fuente_de_etapa = {}
    for f in fixture:
        fuente_de_etapa.setdefault((f["rueda"], int(f["numero"])), f["fuente_url"])
    valores_etapas = filas(
        (texto(rueda), str(numero), texto(fecha) + "::date", texto(fuente_de_etapa[(rueda, numero)]))
        for rueda, numero, fecha in etapas
    )
    valores_actuaciones = filas(
        (
            texto(f["rueda"]),
            str(int(f["numero"])),
            texto(f["fecha"]) + "::date",
            texto(f["hora"]) + "::time",
            texto(f["conjunto"]),
            texto(f["fuente_url"]),
        )
        for f in fixture
    )
    return titulo + f"""
do $$
begin
  if exists (select 1 from public.etapas_concurso where fuente = 'fixture-ficticio') then
    raise exception 'Hay un fixture ficticio cargado: quitarlo antes con `pnpm db:fixture --quitar`.';
  end if;
end
$$;

insert into public.etapas_concurso (temporada_id, rueda, numero, fecha, fuente, fuente_url)
select t.id, v.rueda::public.rueda_concurso, v.numero, v.fecha, {texto(FUENTE_FIXTURE)}, v.fuente_url
from (values
{valores_etapas}
) as v (rueda, numero, fecha, fuente_url)
join public.temporadas t on t.anio = {TEMPORADA}
on conflict (temporada_id, rueda, numero) do update set
  fecha = excluded.fecha,
  fuente = excluded.fuente,
  fuente_url = excluded.fuente_url;

-- La hora es la de Montevideo. Antes de las 06:00 es la madrugada siguiente, que sigue
-- siendo la noche de la etapa.
insert into public.actuaciones as a (escenario_id, conjunto_id, etapa_id, inicio, fuente, fuente_url)
select
  es.id,
  c.id,
  e.id,
  (v.fecha + v.hora + case when v.hora < time '06:00' then interval '1 day' else interval '0' end)
    at time zone 'America/Montevideo',
  {texto(FUENTE_FIXTURE)},
  v.fuente_url
from (values
{valores_actuaciones}
) as v (rueda, numero, fecha, hora, conjunto, fuente_url)
join public.temporadas t on t.anio = {TEMPORADA}
join public.etapas_concurso e
  on e.temporada_id = t.id and e.rueda = v.rueda::public.rueda_concurso and e.numero = v.numero
join public.conjuntos c on c.slug = v.conjunto
join public.escenarios es on es.slug = {texto(TEATRO_DE_VERANO)}
on conflict on constraint actuaciones_clave_natural do update set
  etapa_id = excluded.etapa_id,
  inicio = excluded.inicio,
  fuente = excluded.fuente,
  fuente_url = excluded.fuente_url
where (a.etapa_id, a.inicio, a.fuente, a.fuente_url)
  is distinct from (excluded.etapa_id, excluded.inicio, excluded.fuente, excluded.fuente_url);
"""


def sql_recorrido(esquinas):
    """El recorrido del Desfile de Llamadas, igual para las dos noches, como estimado.

    El recorrido de una noche que ya está confirmado (el oficial, cargado después) no se toca.
    En las demás se reemplaza entero: las esquinas son una lista ordenada, no filas sueltas.
    """
    titulo = f"-- ---------------------------------------------------------------- recorrido de las Llamadas ({len(esquinas)} esquinas)\n"
    if not esquinas:
        return titulo + f"\n-- research/{RECORRIDO} no tiene filas: no hay recorrido que cargar.\n"
    fuentes = []
    for e in esquinas:
        for url in e["fuente_url"].split(" | "):
            if url and url not in fuentes:
                fuentes.append(url)
    valores = filas(
        (e["orden"], texto(e["calle"]), texto(e["cruce"]),
         f"'SRID=4326;POINT({e['lng']} {e['lat']})'::extensions.geography")
        for e in esquinas
    )
    por_tocar = f"""select ev.id
  from public.eventos ev
  join public.temporadas t on t.id = ev.temporada_id
  where t.anio = {TEMPORADA}
    and ev.tipo = 'llamadas'
    and ev.recorrido_estado is distinct from 'confirmado'"""
    return titulo + f"""
delete from public.desfile_esquinas where evento_id in (
  {por_tocar}
);

insert into public.desfile_esquinas (evento_id, orden, calle, cruce, punto)
select ev.id, v.orden, v.calle, v.cruce, v.punto
from (values
{valores}
) as v (orden, calle, cruce, punto)
cross join (
  {por_tocar}
) as ev;

update public.eventos
   set recorrido_estado = 'estimado',
       recorrido_fuente_url = {lista(" | ".join(fuentes), " | ")}
 where id in (
  {por_tocar}
);
"""


def sql_cortes(cortes):
    """Los cortes de calle de cada noche, como estimados. Inserta o actualiza por (evento, slug),
    no borra, y no toca un corte que ya está confirmado."""
    titulo = f"-- ---------------------------------------------------------------- cortes de calle de las Llamadas ({len(cortes)})\n"
    if not cortes:
        return titulo + f"\n-- research/{CORTES} no tiene filas: no hay cortes que cargar.\n"

    def momento(valor):
        # Hora de Montevideo, escrita sin zona en el CSV.
        return f"({texto(valor.replace('T', ' '))}::timestamp at time zone 'America/Montevideo')" if valor else "null::timestamptz"

    def tramo(valor):
        if not valor:
            return "null::extensions.geography"
        return f"'SRID=4326;LINESTRING({valor.replace(';', ', ')})'::extensions.geography"

    valores = filas(
        (
            texto(f"llamadas-noche-{c['noche']}-{TEMPORADA}"),
            texto(c["slug"]),
            texto(c["tipo"]),
            texto(c["descripcion"]),
            momento(c["desde"]),
            momento(c["hasta"]),
            tramo(c["puntos"]),
            lista(c["fuente_url"], " | "),
        )
        for c in cortes
    )
    return titulo + f"""
insert into public.cortes_calle as k
  (evento_id, slug, tipo, descripcion, desde, hasta, tramo, estado, fuente_url)
select ev.id, v.slug, v.tipo::public.tipo_corte, v.descripcion, v.desde, v.hasta, v.tramo,
       'estimado', v.fuente_url
from (values
{valores}
) as v (evento, slug, tipo, descripcion, desde, hasta, tramo, fuente_url)
join public.eventos ev on ev.slug = v.evento
on conflict on constraint cortes_calle_slug_unico do update set
  tipo = excluded.tipo,
  descripcion = excluded.descripcion,
  desde = excluded.desde,
  hasta = excluded.hasta,
  tramo = excluded.tramo,
  fuente_url = excluded.fuente_url
where k.estado <> 'confirmado';
"""


def sql_orden(orden):
    """El orden de desfile de cada noche de las Llamadas.

    Un orden es una lista: se reemplaza entero. El seed sólo reemplaza lo que él mismo cargó;
    si una noche tiene un orden de otra fuente (cargado a mano a último momento), no la toca.
    """
    titulo = f"-- ---------------------------------------------------------------- orden de desfile de las Llamadas ({len(orden)})\n"
    if not orden:
        return titulo + f"""
-- research/{ORDEN} todavía no tiene filas: el orden de desfile {TEMPORADA} no se publicó.
"""
    valores = filas(
        (
            texto(f"llamadas-noche-{o['noche']}-{TEMPORADA}"),
            str(int(o["posicion"])),
            texto(o["conjunto"]),
            texto(o["fuente_url"].split(" | ")[0]),
        )
        for o in orden
    )
    return titulo + f"""
do $$
begin
  if exists (select 1 from public.orden_desfile where fuente = 'orden-ficticio') then
    raise exception 'Hay un orden ficticio cargado: quitarlo antes con `pnpm db:llamadas --quitar`.';
  end if;
end
$$;

delete from public.orden_desfile where fuente = {texto(FUENTE_ORDEN)};

insert into public.orden_desfile (evento_id, conjunto_id, posicion, fuente, fuente_url)
select ev.id, c.id, v.posicion, {texto(FUENTE_ORDEN)}, v.fuente_url
from (values
{valores}
) as v (evento, posicion, conjunto, fuente_url)
join public.eventos ev on ev.slug = v.evento
join public.conjuntos c on c.slug = v.conjunto
-- Una noche con un orden de otra fuente queda como está.
where not exists (select 1 from public.orden_desfile otro where otro.evento_id = ev.id);
"""


def generar():
    conjuntos = leer("conjuntos.csv")
    escenarios = leer("escenarios.csv")
    eventos = leer(CALENDARIO)
    fixture = leer(FIXTURE)
    esquinas = leer(RECORRIDO)
    cortes = leer(CORTES)
    orden = leer(ORDEN)
    temporada, con_lista, sin_lista = sql_conjunto_temporada(conjuntos)
    cabecera = f"""-- Generado por scripts/gen_seed.py a partir de research/*.csv. No editar a mano:
-- cambiar los CSV, correr `python research/validate.py` y regenerar con `pnpm gen:seed`.
--
-- Se puede correr más de una vez: inserta o actualiza por slug y sólo toca las columnas que
-- salen de los CSV. Necesita la temporada {TEMPORADA} (supabase/seeds/01_temporadas.sql).

begin;

do $$
begin
  if not exists (select 1 from public.temporadas where anio = {TEMPORADA}) then
    raise exception 'Falta la temporada {TEMPORADA}: cargar antes supabase/seeds/01_temporadas.sql.';
  end if;
end
$$;
"""
    partes = [
        cabecera,
        sql_conjuntos(conjuntos),
        temporada,
        sql_escenarios(escenarios),
        sql_eventos(eventos),
        sql_fixture(fixture),
        sql_recorrido(esquinas),
        sql_cortes(cortes),
        sql_orden(orden),
        "commit;\n",
    ]
    resumen = (
        f"{len(conjuntos)} conjuntos ({con_lista} con participación {TEMPORADA}, "
        f"{sin_lista} sin lista {TEMPORADA}), {len(escenarios)} escenarios, {len(eventos)} eventos, "
f"{len(fixture)} actuaciones del fixture del Concurso, "
        f"{len(esquinas)} esquinas, {len(cortes)} cortes y {len(orden)} lugares del orden de las Llamadas"
    )
    return "\n".join(partes), resumen


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--post-prueba", action="store_true",
                    help="validar con --post-prueba (después del resultado de la Prueba de Admisión)")
    ap.add_argument("--check", action="store_true", help="no escribir: fallar si el seed no está al día")
    ap.add_argument("--solo-orden", metavar="ARCHIVO", type=Path,
                    help="imprimir sólo el SQL del orden de desfile de ese archivo, sin validar ni escribir")
    ap.add_argument("--solo-fixture", metavar="ARCHIVO", type=Path,
                    help="imprimir sólo el SQL del fixture de ese archivo, sin validar ni escribir")
    args = ap.parse_args()

    if args.solo_orden:
        sys.stdout.reconfigure(encoding="utf-8", newline="\n")
        print(sql_orden(leer(args.solo_orden.resolve())))
        return

    if args.solo_fixture:
        sys.stdout.reconfigure(encoding="utf-8", newline="\n")
        print(sql_fixture(leer(args.solo_fixture.resolve())))
        return

    validar(args.post_prueba)
    sql, resumen = generar()
    relativo = SEED.relative_to(RAIZ).as_posix()

    if args.check:
        actual = SEED.read_text(encoding="utf-8") if SEED.exists() else ""
        if actual != sql:
            sys.exit(f"gen_seed: {relativo} no está al día. Corré `pnpm gen:seed`.")
        print(f"gen_seed: {relativo} al día ({resumen}).")
        return

    SEED.parent.mkdir(parents=True, exist_ok=True)
    SEED.write_text(sql, encoding="utf-8", newline="\n")
    print(f"gen_seed: {relativo} escrito ({resumen}).")


if __name__ == "__main__":
    main()
