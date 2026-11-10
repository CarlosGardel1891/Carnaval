#!/usr/bin/env python3
"""Genera supabase/seeds/02_research.sql a partir de los CSV de research/.

Antes de generar corre research/validate.py: si hay errores, no escribe nada.

El SQL se puede correr más de una vez: inserta o actualiza por slug, y sólo toca las
columnas que salen de los CSV (no pisa bio, foto, ubicación, recorrido ni info).

Participación en la temporada (`conjunto_temporada`): sólo para las filas respaldadas por
una lista oficial de esa temporada (`temporada_lista` igual al año). Las demás quedan en el
catálogo de conjuntos, sin participación.

Uso:
    python scripts/gen_seed.py                 valida y escribe el seed
    python scripts/gen_seed.py --post-prueba   igual, validando con --post-prueba
    python scripts/gen_seed.py --check         falla si el seed no está al día

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


def validar(post_prueba):
    orden = [sys.executable, str(RESEARCH / "validate.py"), "--quiet"]
    if post_prueba:
        orden.append("--post-prueba")
    if subprocess.run(orden, cwd=RAIZ).returncode != 0:
        sys.exit("gen_seed: research/validate.py encontró errores; no se genera el seed.")


def leer(archivo):
    with open(RESEARCH / archivo, encoding="utf-8-sig", newline="") as fh:
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
  alias = excluded.alias,
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
  alias = excluded.alias,
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
            lista(e["fuente_url"], " | "),
        )
        for e in eventos
    )
    return f"""-- ---------------------------------------------------------------- eventos ({len(eventos)})

insert into public.eventos
  (temporada_id, slug, tipo, nombre, fecha_inicio, fecha_fin, lugar, estado, fuente_url)
select t.id, v.slug, v.tipo::public.tipo_evento, v.nombre, v.fecha_inicio, v.fecha_fin, v.lugar,
       v.estado::public.estado_evento, v.fuente_url
from (values
{valores}
) as v (slug, tipo, nombre, fecha_inicio, fecha_fin, lugar, estado, fuente_url)
join public.temporadas t on t.anio = {TEMPORADA}
on conflict (slug) do update set
  temporada_id = excluded.temporada_id,
  tipo = excluded.tipo,
  nombre = excluded.nombre,
  fecha_inicio = excluded.fecha_inicio,
  fecha_fin = excluded.fecha_fin,
  lugar = excluded.lugar,
  estado = excluded.estado,
  fuente_url = excluded.fuente_url;
"""


def generar():
    conjuntos = leer("conjuntos.csv")
    escenarios = leer("escenarios.csv")
    eventos = leer(CALENDARIO)
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
        "commit;\n",
    ]
    resumen = (
        f"{len(conjuntos)} conjuntos ({con_lista} con participación {TEMPORADA}, "
        f"{sin_lista} sin lista {TEMPORADA}), {len(escenarios)} escenarios, {len(eventos)} eventos"
    )
    return "\n".join(partes), resumen


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--post-prueba", action="store_true",
                    help="validar con --post-prueba (después del resultado de la Prueba de Admisión)")
    ap.add_argument("--check", action="store_true", help="no escribir: fallar si el seed no está al día")
    args = ap.parse_args()

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
