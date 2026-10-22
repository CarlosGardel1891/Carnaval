#!/usr/bin/env python3
"""Valida los CSV semilla de research/ antes de cargarlos en Supabase.

Uso:
    python research/validate.py                # chequeo normal
    python research/validate.py --post-prueba  # además exige que el Concurso 2027 esté completo
                                               # (usar después del resultado de la Prueba de Admisión)

Sale con código 1 si hay errores. Las advertencias no cortan.
Sólo depende de pandas.
"""
import argparse
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

import pandas as pd

AQUI = Path(__file__).resolve().parent

# ---------------------------------------------------------------- configuración
COMPARSAS_EN_LLAMADAS = 46   # 23 por el desfile 2026 + 23 por Llamadas de Admisión
CONCURSO_2027_TOTAL = 39     # 23 cupos directos + 16 cupos de la Prueba (sólo con --post-prueba)

COLUMNAS = {
    "conjuntos.csv": ["slug", "nombre", "alias", "categoria", "barrio", "temporada_lista", "en_concurso",
                      "en_llamadas", "instagram_url", "facebook_url", "tipo_cuenta_ig", "verificado", "fuente_url"],
    "escenarios.csv": ["slug", "nombre", "alias", "tipo", "direccion", "barrio", "precio_texto", "gratis", "activo",
                       "itinerante", "temporada_referencia", "fuente_url"],
    "calendario_2027.csv": ["slug", "evento", "tipo", "fecha_inicio", "fecha_fin", "lugar", "estado", "fuente_url"],
}

BOOL = {"true", "false"}
# columna -> (valores válidos, ¿se permite vacío?, ¿vacío es sólo advertencia?)
ENUMS = {
    "conjuntos.csv": {
        "categoria": ({"murga", "parodistas", "humoristas", "revista", "comparsa", "samba", "otro"}, False),
        "temporada_lista": ({"2026", "2027"}, False),
        "en_concurso": (BOOL, True),      # vacío = pendiente (Prueba de Admisión)
        "en_llamadas": (BOOL, True),
        "tipo_cuenta_ig": ({"business", "creator", "personal", "desconocido"}, False),
        "verificado": (BOOL, False),
    },
    "escenarios.csv": {
        "tipo": ({"teatro_verano", "privado", "popular", "movil", "gratuito", "barrio_a_barrio"}, True),
        "gratis": (BOOL, True),
        "activo": (BOOL, False),
        "itinerante": (BOOL, True),
    },
    "calendario_2027.csv": {
        "tipo": ({"inaugural", "samba", "llamadas", "corso", "admision", "concurso", "otro"}, False),
        "estado": ({"confirmado", "estimado"}, False),
    },
}
NOMBRE = {"conjuntos.csv": "nombre", "escenarios.csv": "nombre", "calendario_2027.csv": "evento"}

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FECHA_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
URL_RE = re.compile(r"^https?://\S+$")
IG_RE = re.compile(r"^https://www\.instagram\.com/[A-Za-z0-9._]+/?$")
FB_RE = re.compile(r"^https://www\.facebook\.com/\S+$")

errores, avisos = [], []


def err(archivo, fila, msg):
    errores.append(f"[{archivo}] {fila}: {msg}")


def aviso(archivo, fila, msg):
    avisos.append(f"[{archivo}] {fila}: {msg}")


def norm(s):
    """Para comparar nombres y alias: sin mayúsculas, sin tildes, espacios simples."""
    s = unicodedata.normalize("NFKD", s.casefold())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip()


def leer(archivo):
    ruta = AQUI / archivo
    if not ruta.exists():
        err(archivo, "-", "no existe")
        return None
    crudo = ruta.read_bytes()
    if crudo.startswith(b"\xef\xbb\xbf"):
        err(archivo, "-", "tiene BOM (guardar como UTF-8 sin BOM)")
    try:
        crudo.decode("utf-8")
    except UnicodeDecodeError as e:
        err(archivo, "-", f"no es UTF-8 válido: {e}")
        return None
    if b"\r\n" in crudo:
        aviso(archivo, "-", "fin de línea CRLF (se recomienda LF)")
    df = pd.read_csv(ruta, dtype=str, keep_default_na=False, na_filter=False, encoding="utf-8-sig")
    if list(df.columns) != COLUMNAS[archivo]:
        err(archivo, "-", f"columnas {list(df.columns)} != esperadas {COLUMNAS[archivo]}")
        return None
    return df


def fila_id(df, i):
    return f"fila {i + 2} ({df.at[i, 'slug'] or df.at[i, df.columns[1]]})"


def chequeos_comunes(archivo, df):
    col_nombre = NOMBRE[archivo]
    # espacios sobrantes
    for i, row in df.iterrows():
        for c in df.columns:
            v = row[c]
            if v != v.strip() or "  " in v or "\n" in v or "\t" in v:
                err(archivo, fila_id(df, i), f"espacios sobrantes en '{c}': {v!r}")
    # slug
    for i, s in df["slug"].items():
        if not SLUG_RE.match(s):
            err(archivo, fila_id(df, i), f"slug inválido: {s!r}")
    for s, n in Counter(df["slug"]).items():
        if n > 1:
            err(archivo, "-", f"slug repetido {n} veces: {s!r}")
    # nombre / evento
    for i, v in df[col_nombre].items():
        if not v:
            err(archivo, fila_id(df, i), f"'{col_nombre}' vacío")
    # enums
    for col, (validos, vacio_ok) in ENUMS[archivo].items():
        for i, v in df[col].items():
            if v == "":
                if not vacio_ok:
                    err(archivo, fila_id(df, i), f"'{col}' vacío")
            elif v not in validos:
                err(archivo, fila_id(df, i), f"'{col}' = {v!r} no está en {sorted(validos)}")
    # fuente_url
    for i, v in df["fuente_url"].items():
        if not v:
            err(archivo, fila_id(df, i), "fuente_url vacía")
            continue
        partes = v.split(" | ")
        if any(p != p.strip() or "|" in p for p in partes):
            err(archivo, fila_id(df, i), "fuente_url: separador distinto de ' | '")
        for p in partes:
            if not URL_RE.match(p.strip()):
                err(archivo, fila_id(df, i), f"fuente_url: no es URL: {p!r}")
        for p, n in Counter(partes).items():
            if n > 1:
                err(archivo, fila_id(df, i), f"fuente_url repetida: {p}")


def chequeo_alias(archivo, df):
    """Cada nombre y alias (normalizado) tiene que apuntar a una sola fila."""
    if "alias" not in df.columns:
        return
    dueño = defaultdict(set)
    for i, row in df.iterrows():
        claves = [row["nombre"]]
        if row["alias"]:
            partes = row["alias"].split("|")
            for p in partes:
                if p == "" or p != p.strip():
                    err(archivo, fila_id(df, i), f"alias vacío o con espacios alrededor de '|': {row['alias']!r}")
            vistos = Counter(norm(p) for p in partes)
            for k, n in vistos.items():
                if n > 1:
                    err(archivo, fila_id(df, i), f"alias repetido dentro de la fila: {k!r}")
            claves += partes
        for k in {norm(c) for c in claves if c.strip()}:
            dueño[k].add(row["slug"])
    for k, slugs in dueño.items():
        if len(slugs) > 1:
            err(archivo, "-", f"nombre/alias {k!r} choca entre filas: {sorted(slugs)}")


def chequeo_conjuntos(df, post_prueba):
    a = "conjuntos.csv"
    for i, row in df.iterrows():
        if row["instagram_url"] and not IG_RE.match(row["instagram_url"]):
            err(a, fila_id(df, i), f"instagram_url con formato raro: {row['instagram_url']}")
        if row["facebook_url"] and not FB_RE.match(row["facebook_url"]):
            err(a, fila_id(df, i), f"facebook_url con formato raro: {row['facebook_url']}")
        if row["en_llamadas"] == "true" and row["categoria"] != "comparsa":
            err(a, fila_id(df, i), "en_llamadas=true pero la categoría no es comparsa")
        if row["en_concurso"] == "true" and row["temporada_lista"] != "2027":
            err(a, fila_id(df, i), "en_concurso=true pero temporada_lista no es 2027")
    no_verif = df.loc[df["verificado"] == "false", "slug"].tolist()
    if no_verif:
        aviso(a, "-", f"{len(no_verif)} conjuntos con verificado=false: {', '.join(no_verif)}")
    llamadas = int(((df["categoria"] == "comparsa") & (df["en_llamadas"] == "true")).sum())
    if llamadas != COMPARSAS_EN_LLAMADAS:
        err(a, "-", f"comparsas con en_llamadas=true: {llamadas} (se esperan {COMPARSAS_EN_LLAMADAS})")
    pendientes = df[(df["en_concurso"] == "") & (df["verificado"] == "true")]
    if post_prueba:
        for i in pendientes.index:
            err(a, fila_id(df, i), "en_concurso sigue vacío (--post-prueba)")
        en_concurso = int((df["en_concurso"] == "true").sum())
        if en_concurso != CONCURSO_2027_TOTAL:
            err(a, "-", f"en_concurso=true: {en_concurso} (se esperan {CONCURSO_2027_TOTAL} con --post-prueba)")
    elif len(pendientes):
        aviso(a, "-", f"{len(pendientes)} conjuntos con en_concurso pendiente (Prueba de Admisión)")


def chequeo_escenarios(df):
    a = "escenarios.csv"
    for i, row in df.iterrows():
        if row["itinerante"] == "true" and row["direccion"]:
            err(a, fila_id(df, i), "itinerante=true pero tiene dirección (va por actuación)")
        if row["temporada_referencia"] and not re.fullmatch(r"\d{4}", row["temporada_referencia"]):
            err(a, fila_id(df, i), f"temporada_referencia inválida: {row['temporada_referencia']!r}")
        if row["tipo"] in {"movil", "gratuito", "barrio_a_barrio"} and row["gratis"] != "true":
            aviso(a, fila_id(df, i), f"tipo {row['tipo']} con gratis={row['gratis']!r}")
        for c in ("tipo", "gratis", "itinerante"):
            if row[c] == "":
                aviso(a, fila_id(df, i), f"'{c}' sin dato")


def chequeo_calendario(df):
    a = "calendario_2027.csv"
    for i, row in df.iterrows():
        fechas = {}
        for c in ("fecha_inicio", "fecha_fin"):
            v = row[c]
            if not FECHA_RE.match(v):
                err(a, fila_id(df, i), f"{c} no es AAAA-MM-DD: {v!r}")
                continue
            try:
                fechas[c] = date.fromisoformat(v)
            except ValueError:
                err(a, fila_id(df, i), f"{c} no es una fecha válida: {v!r}")
        if len(fechas) == 2 and fechas["fecha_fin"] < fechas["fecha_inicio"]:
            err(a, fila_id(df, i), "fecha_fin anterior a fecha_inicio")
        if row["tipo"] == "llamadas" and "fecha_inicio" in fechas and fechas["fecha_inicio"].month != 2:
            aviso(a, fila_id(df, i), "tipo=llamadas fuera de febrero (¿dispararía el modo Llamadas antes de tiempo?)")


def resumen(dfs):
    print("=" * 60)
    print("RESUMEN")
    c = dfs.get("conjuntos.csv")
    if c is not None:
        print(f"conjuntos.csv: {len(c)} filas")
        print("  categoría:", dict(Counter(c["categoria"]).most_common()))
        print("  en_concurso:", {k or '(pendiente)': v for k, v in Counter(c["en_concurso"]).items()})
        print("  comparsas en Llamadas:", int(((c["categoria"] == "comparsa") & (c["en_llamadas"] == "true")).sum()))
        print("  verificado:", dict(Counter(c["verificado"])))
        print(f"  con Instagram: {(c['instagram_url'] != '').sum()}  con Facebook: {(c['facebook_url'] != '').sum()}"
              f"  con barrio: {(c['barrio'] != '').sum()}  con alias: {(c['alias'] != '').sum()}")
    e = dfs.get("escenarios.csv")
    if e is not None:
        print(f"escenarios.csv: {len(e)} filas ({(e['activo'] == 'true').sum()} activos)")
        print("  tipo (activos):", dict(Counter(e.loc[e["activo"] == "true", "tipo"].replace("", "(sin dato)"))))
        print("  itinerantes:", int((e["itinerante"] == "true").sum()), " con alias:", int((e["alias"] != "").sum()))
    k = dfs.get("calendario_2027.csv")
    if k is not None:
        print(f"calendario_2027.csv: {len(k)} eventos", dict(Counter(k["estado"])))
        print("  tipo:", dict(Counter(k["tipo"])))
    print("=" * 60)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--post-prueba", action="store_true",
                    help="exigir en_concurso completo y 39 conjuntos en el Concurso 2027")
    ap.add_argument("-q", "--quiet", action="store_true", help="no listar advertencias, sólo contarlas")
    args = ap.parse_args()

    dfs = {}
    for archivo in COLUMNAS:
        df = leer(archivo)
        if df is None:
            continue
        dfs[archivo] = df
        chequeos_comunes(archivo, df)
        chequeo_alias(archivo, df)
    if "conjuntos.csv" in dfs:
        chequeo_conjuntos(dfs["conjuntos.csv"], args.post_prueba)
    if "escenarios.csv" in dfs:
        chequeo_escenarios(dfs["escenarios.csv"])
    if "calendario_2027.csv" in dfs:
        chequeo_calendario(dfs["calendario_2027.csv"])

    resumen(dfs)
    if avisos:
        print(f"ADVERTENCIAS ({len(avisos)})")
        if not args.quiet:
            for a in avisos:
                print("  -", a)
    if errores:
        print(f"ERRORES ({len(errores)})")
        for e in errores:
            print("  x", e)
        sys.exit(1)
    print("OK: sin errores")


if __name__ == "__main__":
    main()
