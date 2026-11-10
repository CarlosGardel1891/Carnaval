#!/usr/bin/env python3
"""Genera packages/db-tests/fixtures/norm_cases.json (docs/DECISIONES.md, decisión 22).

Los casos con los que se comprueba que `public.norm` (SQL) da lo mismo que `norm()` de
TypeScript:

- reales: cada nombre, alias, barrio, dirección y lugar de los CSV de research/, en el
  orden de los archivos y con repetidos;
- sintéticos: casos borde elegidos a mano (mayúsculas especiales, ligaduras, espacios raros,
  marcas combinantes de otros alfabetos).

Cada caso lleva también el resultado de la `norm` de Python (la de research/validate.py),
para dejar a la vista dónde difiere de la de TypeScript.

Uso:
    python scripts/gen_norm_cases.py            escribe el fixture
    python scripts/gen_norm_cases.py --check    falla si el fixture no está al día

Sólo usa la biblioteca estándar.
"""
import argparse
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RESEARCH = RAIZ / "research"
FIXTURE = RAIZ / "packages" / "db-tests" / "fixtures" / "norm_cases.json"

# (archivo, columna del nombre)
FUENTES = (
    ("conjuntos.csv", "nombre"),
    ("escenarios.csv", "nombre"),
    ("calendario_2027.csv", "evento"),
)
OTRAS_COLUMNAS = ("barrio", "direccion", "lugar")

# Escritos con escapes para que los caracteres invisibles se vean en el código.
SINTETICOS = [
    # mayúsculas, minúsculas y ligaduras
    "Straße",
    "ǅungla",
    "İstanbul",
    "ΌΣΟΣ",
    "ſaber",
    "ﬁesta",
    "LOS BUBY´S",
    "Nº 1",
    "1° DE MAYO",
    "a b",
    "a b",
    "x﻿y",
    "x​y",
    "Ça va",
    "ŉ",
    "K (kelvin K)",
    "Å Å",
    "Q̈",
    "ñandú Ñ",
    "²",
    "½ hora",
    "ẞ",
    "aःb",
    "a⃝b",
    "a\u001c\u001db",
    "a\u0085b",
    # nombres del carnaval escritos de varias formas
    "Samburú Morán",
    "ESCENARIOS MÓVILES IM",
    "DoÑa Bastarda",
    "  La   Sara\tdel\nCordón  ",
    "LOS BUBY´S",
    "Straße",
    "Ay Q'darle",
    "Centro Cultural Alba Roballo - Eduardo Lladó",
    "LA LINEA MAGINOT",
    "La Línea Maginot",
    "BAFO DA ONCA",
    "Bafo da Onça",
    # espacios
    "a b",
    "a b",
    "a b",
    "a　b",
    "x﻿y",
    "x​y",
    "a b",
    "a b",
    "a\u000bb\u000cc\rd",
    "a\u0085b\u001cc",
    "  x  ",
    # letras que no se descomponen, dígrafos, símbolos
    "Æther Øre Łódź đ",
    "ǅ ǆ",
    "№ 5",
    "ª º",
    "é",
    # marcas combinantes de otros alfabetos
    "שָׁלוֹם",
    "हिन्दी",
    "ไทย์",
    "a⃝b",
    "ΌΣΟΣ",
    "İ I ı",
    "¨a ¸c ¯x",
    "a\U0001d165b",
]


def norm(s):
    """La misma que research/validate.py."""
    s = unicodedata.normalize("NFKD", s.casefold())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip()


def reales():
    items = []
    for archivo, columna in FUENTES:
        with open(RESEARCH / archivo, encoding="utf-8-sig", newline="") as fh:
            for fila in csv.DictReader(fh):
                items.append(fila[columna])
                items.extend(a for a in (fila.get("alias") or "").split("|") if a)
                items.extend(fila[c] for c in OTRAS_COLUMNAS if fila.get(c))
    return items


def generar():
    casos = [("real", s) for s in reales()] + [("sintetico", s) for s in SINTETICOS]
    lineas = [
        json.dumps({"grupo": grupo, "s": s, "py": norm(s)}, ensure_ascii=True)
        for grupo, s in casos
    ]
    return "[\n" + ",\n".join("  " + linea for linea in lineas) + "\n]\n", len(casos)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true", help="no escribe: falla si el fixture no está al día")
    args = ap.parse_args()

    texto, total = generar()
    if args.check:
        actual = FIXTURE.read_text(encoding="utf-8") if FIXTURE.exists() else ""
        if actual.replace("\r\n", "\n") != texto:
            print(f"{FIXTURE.relative_to(RAIZ).as_posix()} no está al día: correr python scripts/gen_norm_cases.py")
            return 1
        print(f"{FIXTURE.relative_to(RAIZ).as_posix()}: al día ({total} casos)")
        return 0

    FIXTURE.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE.write_text(texto, encoding="utf-8", newline="\n")
    print(f"{FIXTURE.relative_to(RAIZ).as_posix()}: {total} casos ({total - len(SINTETICOS)} reales, {len(SINTETICOS)} sintéticos)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
