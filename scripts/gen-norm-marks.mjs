// Genera la migración de `public.norm` (docs/DECISIONES.md, decisión 22).
//
// La función de SQL replica regla por regla a `norm()` de packages/shared/src/norm.ts.
// La regla «sacar \p{M}» no se puede escribir así en una regex de Postgres: se reemplaza por
// la lista completa de rangos de la propiedad M (Mn, Mc, Me), calculada acá con el Unicode
// del Node que corre el script. La versión de Node y de Unicode queda anotada en la migración.
//
// Uso:
//   node scripts/gen-norm-marks.mjs                 imprime el SQL
//   node scripts/gen-norm-marks.mjs --out <archivo> lo escribe (LF, UTF-8)
//   node scripts/gen-norm-marks.mjs --check <archivo> falla si el archivo no coincide
//
// Si `norm` cambia, va en una migración nueva, y esa misma migración tiene que recalcular
// las columnas generadas y las tablas de claves que dependen de ella.
import { readFileSync, writeFileSync } from 'node:fs'

const MAX = 0x10ffff
const isSurrogate = (c) => c >= 0xd800 && c <= 0xdfff
const mark = /^\p{M}$/u

const ranges = []
let count = 0
let start = -1
for (let c = 0; c <= MAX + 1; c++) {
  const isMark = c <= MAX && !isSurrogate(c) && mark.test(String.fromCodePoint(c))
  if (isMark) count++
  if (isMark && start < 0) start = c
  if (!isMark && start >= 0) {
    ranges.push([start, c - 1])
    start = -1
  }
}

// Escapes de las regex de Postgres: \uXXXX y, fuera del plano básico, \UXXXXXXXX.
const esc = (c) =>
  c > 0xffff ? '\\U' + c.toString(16).padStart(8, '0') : '\\u' + c.toString(16).padStart(4, '0')
const marks = ranges.map(([a, b]) => (a === b ? esc(a) : `${esc(a)}-${esc(b)}`)).join('')

// `\s` de JavaScript, menos lo que NFKD ya convirtió en un espacio común (U+00A0, U+2000 a
// U+200A, U+202F, U+205F y U+3000 se descomponen en U+0020).
const spaces = '\\t\\n\\v\\f\\r \\u1680\\u2028\\u2029\\ufeff'

const sql = `-- public.norm: la normalización de nombres, igual a norm() de @cuerda/shared
-- (docs/DECISIONES.md, decisión 22).
--
-- GENERADO por scripts/gen-norm-marks.mjs: no editar a mano.
--   Node ${process.version}, Unicode ${process.versions.unicode}, ICU ${process.versions.icu}
--   Propiedad M (Mn, Mc, Me): ${ranges.length} rangos, ${count} caracteres
--
-- Mismas reglas y mismo orden que la de TypeScript:
--   1. minúsculas (colación ICU raíz, como toLowerCase());
--   2. ß pasa a ss;
--   3. NFKD;
--   4. se sacan las marcas combinantes (\\p{M});
--   5. los espacios (\\s) seguidos pasan a un solo espacio;
--   6. sin espacios en las puntas.
-- Sin unaccent: sus reglas no coinciden con las de TypeScript (´, º, ligaduras).
--
-- Si esta función cambia, va en una migración nueva que además recalcule las columnas
-- generadas y las tablas de claves que la usan.
create function public.norm(t text) returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        normalize(replace(lower(t collate "und-x-icu"), 'ß', 'ss'), nfkd),
        '[${marks}]',
        '',
        'g'
      ),
      '[${spaces}]+',
      ' ',
      'g'
    ),
    ' '
  )
$$;

comment on function public.norm(text) is
  'Normaliza un nombre para compararlo: minúsculas, sin tildes, espacios simples. Igual a norm() de @cuerda/shared.';

revoke all on function public.norm(text) from public, anon, authenticated;
grant execute on function public.norm(text) to anon, authenticated, service_role;
`

const [flag, file] = process.argv.slice(2)
if (flag === '--out' && file) {
  writeFileSync(file, sql, 'utf8')
  console.log(
    `${file}: ${ranges.length} rangos, ${count} caracteres, Unicode ${process.versions.unicode}`,
  )
} else if (flag === '--check' && file) {
  const current = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  if (current !== sql) {
    console.error(
      `${file} no coincide con lo que genera este Node (${process.version}, Unicode ${process.versions.unicode}).`,
    )
    process.exit(1)
  }
  console.log(`${file}: al día`)
} else if (!flag) {
  process.stdout.write(sql)
} else {
  console.error('Uso: node scripts/gen-norm-marks.mjs [--out <archivo> | --check <archivo>]')
  process.exit(2)
}
