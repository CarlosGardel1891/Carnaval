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
    "calendario_2027.csv": ["slug", "evento", "tipo", "fecha_inicio", "fecha_fin", "lugar", "estado", "info", "fuente_url"],
}

# El fixture del Concurso Oficial: una fila por conjunto y noche. No es un catálogo como los
# otros tres (no tiene slug ni nombre): se valida aparte, con chequeo_fixture.
FIXTURE = "fixture_2027.csv"
FIXTURE_COLUMNAS = ["rueda", "numero", "fecha", "hora", "conjunto", "fuente_url"]
RUEDAS = ["primera", "segunda", "liguilla"]
HORA_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")

# El recorrido y los cortes de calle del Desfile de Llamadas. Tampoco son catálogos: se
# validan aparte (chequeo_recorrido y chequeo_cortes).
RECORRIDO = "llamadas_recorrido_2027.csv"
RECORRIDO_COLUMNAS = ["orden", "calle", "cruce", "lat", "lng", "fuente_url"]
CORTES = "llamadas_cortes_2027.csv"
CORTES_COLUMNAS = ["noche", "slug", "tipo", "descripcion", "desde", "hasta", "puntos", "fuente_url"]
TIPOS_CORTE = ["corte", "estacionamiento"]
MOMENTO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$")
# Montevideo y alrededores: una coordenada fuera de acá está mal escrita (o al revés).
LAT_MVD, LNG_MVD = (-35.1, -34.6), (-56.6, -55.8)

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


def leer(archivo, columnas=None, ruta=None):
    ruta = ruta or AQUI / archivo
    columnas = columnas or COLUMNAS[archivo]
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
    if list(df.columns) != columnas:
        err(archivo, "-", f"columnas {list(df.columns)} != esperadas {columnas}")
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
        # El nombre es corto: las aclaraciones (cuántos conjuntos, de dónde sale la fecha) van en `info`.
        if "(" in row["evento"] or ")" in row["evento"]:
            err(a, fila_id(df, i), "el nombre del evento tiene una aclaración entre paréntesis: pasarla a 'info'")
        if row["tipo"] == "llamadas" and "fecha_inicio" in fechas and fechas["fecha_inicio"].month != 2:
            aviso(a, fila_id(df, i), "tipo=llamadas fuera de febrero (¿dispararía el modo Llamadas antes de tiempo?)")


def chequeo_fixture(df, conjuntos):
    """El fixture del Concurso: cada fila es un conjunto en una noche (etapa) del Teatro de Verano.

    `hora` es la hora de Montevideo. Una hora antes de las 06:00 es de la madrugada siguiente
    y sigue perteneciendo a la noche de `fecha` (la noche lógica).
    """
    a = FIXTURE
    slugs = set(conjuntos["slug"]) if conjuntos is not None else None
    en_concurso = (
        dict(zip(conjuntos["slug"], conjuntos["en_concurso"])) if conjuntos is not None else {}
    )
    fecha_de_etapa, etapa_de_fecha, vistos = {}, {}, set()
    for i, row in df.iterrows():
        fila = f"fila {i + 2} ({row['rueda']} {row['numero']}, {row['conjunto']})"
        if row["rueda"] not in RUEDAS:
            err(a, fila, f"rueda {row['rueda']!r} no es una de {RUEDAS}")
        if not (row["numero"].isdigit() and int(row["numero"]) > 0):
            err(a, fila, f"numero no es un entero positivo: {row['numero']!r}")
        fecha_ok = False
        if not FECHA_RE.match(row["fecha"]):
            err(a, fila, f"fecha no es AAAA-MM-DD: {row['fecha']!r}")
        else:
            try:
                date.fromisoformat(row["fecha"])
                fecha_ok = True
            except ValueError:
                err(a, fila, f"fecha no es una fecha válida: {row['fecha']!r}")
        if not HORA_RE.match(row["hora"]):
            err(a, fila, f"hora no es HH:MM (24 horas): {row['hora']!r}")
        elif "06:00" <= row["hora"] < "12:00":
            aviso(a, fila, f"hora {row['hora']}: ¿una actuación del Concurso a la mañana?")
        if row["conjunto"] == "":
            err(a, fila, "falta el conjunto")
        elif slugs is not None and row["conjunto"] not in slugs:
            err(a, fila, f"el conjunto {row['conjunto']!r} no es un slug de conjuntos.csv")
        elif en_concurso.get(row["conjunto"]) != "true":
            aviso(a, fila, f"{row['conjunto']} no figura con en_concurso = true en conjuntos.csv")
        if row["fuente_url"] and not URL_RE.match(row["fuente_url"]):
            err(a, fila, f"fuente_url no es una URL: {row['fuente_url']!r}")

        etapa = (row["rueda"], row["numero"])
        if fecha_ok:
            anterior = fecha_de_etapa.setdefault(etapa, row["fecha"])
            if anterior != row["fecha"]:
                err(a, fila, f"la etapa {etapa[0]} {etapa[1]} tiene dos fechas: {anterior} y {row['fecha']}")
            otra = etapa_de_fecha.setdefault(row["fecha"], etapa)
            if otra != etapa:
                err(a, fila, f"el {row['fecha']} ya es de la etapa {otra[0]} {otra[1]}")
        clave = (etapa, row["conjunto"])
        if clave in vistos:
            err(a, fila, "el conjunto está dos veces en la misma etapa")
        vistos.add(clave)


def fuentes_ok(a, fila, valor):
    if not valor:
        err(a, fila, "fuente_url vacía")
        return
    for parte in valor.split(" | "):
        if not URL_RE.match(parte):
            err(a, fila, f"fuente_url: no es URL: {parte!r}")


def coordenada_ok(a, fila, lat, lng):
    try:
        lat_f, lng_f = float(lat), float(lng)
    except ValueError:
        err(a, fila, f"coordenada que no es un número: {lat!r}, {lng!r}")
        return False
    if not (LAT_MVD[0] <= lat_f <= LAT_MVD[1] and LNG_MVD[0] <= lng_f <= LNG_MVD[1]):
        err(a, fila, f"coordenada fuera de Montevideo (¿latitud y longitud al revés?): {lat}, {lng}")
        return False
    return True


def chequeo_recorrido(df):
    """El recorrido del Desfile de Llamadas: las esquinas, en orden, de la salida a la llegada."""
    a = RECORRIDO
    if len(df) == 1:
        err(a, "-", "un recorrido necesita al menos dos esquinas")
    for i, row in df.iterrows():
        fila = f"fila {i + 2} ({row['calle']} y {row['cruce']})"
        if row["orden"] != str(i + 1):
            err(a, fila, f"orden {row['orden']!r}: las esquinas van numeradas 1, 2, 3… sin saltos")
        for c in ("calle", "cruce"):
            if not row[c] or row[c] != row[c].strip():
                err(a, fila, f"'{c}' vacío o con espacios sobrantes")
        coordenada_ok(a, fila, row["lat"], row["lng"])
        fuentes_ok(a, fila, row["fuente_url"])


def chequeo_cortes(df):
    """Los cortes de calle y las prohibiciones de estacionar de cada noche del desfile.

    `desde` y `hasta` son hora de Montevideo (AAAA-MM-DDTHH:MM) y pueden faltar. `puntos` es el
    tramo, como «longitud latitud» separados por «;», y también puede faltar.
    """
    a = CORTES
    vistos = set()
    for i, row in df.iterrows():
        fila = f"fila {i + 2} (noche {row['noche']}, {row['slug']})"
        if row["noche"] not in ("1", "2"):
            err(a, fila, f"noche {row['noche']!r}: tiene que ser 1 o 2")
        if not SLUG_RE.match(row["slug"]):
            err(a, fila, f"slug inválido: {row['slug']!r}")
        if (row["noche"], row["slug"]) in vistos:
            err(a, fila, "slug repetido en la misma noche")
        vistos.add((row["noche"], row["slug"]))
        if row["tipo"] not in TIPOS_CORTE:
            err(a, fila, f"tipo {row['tipo']!r} no es uno de {TIPOS_CORTE}")
        if not row["descripcion"] or row["descripcion"] != row["descripcion"].strip():
            err(a, fila, "descripcion vacía o con espacios sobrantes")
        for c in ("desde", "hasta"):
            if row[c] and not MOMENTO_RE.match(row[c]):
                err(a, fila, f"{c} no es AAAA-MM-DDTHH:MM: {row[c]!r}")
        if row["desde"] and row["hasta"] and row["hasta"] < row["desde"]:
            err(a, fila, "hasta anterior a desde")
        if row["puntos"]:
            puntos = row["puntos"].split(";")
            if len(puntos) < 2:
                err(a, fila, "un tramo necesita al menos dos puntos")
            for punto in puntos:
                partes = punto.split(" ")
                if len(partes) != 2:
                    err(a, fila, f"punto mal escrito (va «longitud latitud»): {punto!r}")
                else:
                    coordenada_ok(a, fila, partes[1], partes[0])
        fuentes_ok(a, fila, row["fuente_url"])


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
    r = dfs.get(RECORRIDO)
    if r is not None:
        print(f"{RECORRIDO}: {len(r)} esquinas ({max(len(r) - 1, 0)} cuadras)")
    k = dfs.get(CORTES)
    if k is not None:
        print(f"{CORTES}: {len(k)} filas", dict(Counter(zip(k["noche"], k["tipo"]))))
    f = dfs.get(FIXTURE)
    if f is not None:
        if len(f) == 0:
            print(f"{FIXTURE}: sin filas (el fixture del Concurso todavía no se publicó)")
        else:
            noches = Counter(r for r, _ in set(zip(f["rueda"], f["numero"])))
            print(f"{FIXTURE}: {len(f)} actuaciones;", "noches por rueda:", dict(noches))
    print("=" * 60)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--post-prueba", action="store_true",
                    help="exigir en_concurso completo y 39 conjuntos en el Concurso 2027")
    ap.add_argument("-q", "--quiet", action="store_true", help="no listar advertencias, sólo contarlas")
    ap.add_argument("--fixture", metavar="ARCHIVO", type=Path,
                    help=f"validar ese archivo como fixture del Concurso, en vez de research/{FIXTURE}")
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
    recorrido = leer(RECORRIDO, RECORRIDO_COLUMNAS)
    if recorrido is not None:
        dfs[RECORRIDO] = recorrido
        chequeo_recorrido(recorrido)
    cortes = leer(CORTES, CORTES_COLUMNAS)
    if cortes is not None:
        dfs[CORTES] = cortes
        chequeo_cortes(cortes)
    fixture = leer(FIXTURE, FIXTURE_COLUMNAS, args.fixture)
    if fixture is not None:
        dfs[FIXTURE] = fixture
        chequeo_fixture(fixture, dfs.get("conjuntos.csv"))

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
