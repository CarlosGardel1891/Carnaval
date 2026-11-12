#!/usr/bin/env node
// Genera los datos de ejemplo que el build `beta` de la app lleva empaquetados (decisión 85):
//
//   pnpm gen:demo
//
// Carga en el Supabase LOCAL los tres juegos de datos de prueba (`pnpm db:noche-real`,
// `db:fixture` y `db:llamadas`), los exporta a `app/src/demo/data/` y los vuelve a quitar. Los
// archivos van al repo: se regeneran sólo si cambia alguno de esos datos de prueba. Nada de
// esto toca el proyecto remoto.
//
// Sólo se exportan slugs, nunca ids: la app resuelve cada conjunto y cada escenario contra el
// catálogo real del remoto, y lo que no está ahí no se muestra.

import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(repoRoot, 'app', 'src', 'demo', 'data')
const NIGHT = '2026-02-28'

function loader(...args) {
  const result = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'scripts', 'db-grilla.mjs'), ...args],
    {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'inherit'],
    },
  )
  if (result.status !== 0) {
    console.error(
      `gen:demo: falló db-grilla ${args.join(' ')} (¿está levantado el Supabase local?).`,
    )
    process.exit(1)
  }
}

function query(sql) {
  const out = execFileSync(
    'docker',
    [
      'exec',
      'supabase_db_cuerda',
      'psql',
      '-U',
      'postgres',
      '-At',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  )
  return JSON.parse(out)
}

function write(name, data) {
  writeFileSync(path.join(outDir, name), JSON.stringify(data, null, 2) + '\n')
  console.log(`  ${name}: ${Array.isArray(data) ? data.length : Object.keys(data).length} filas`)
}

mkdirSync(outDir, { recursive: true })
loader('--real')
loader('--fixture')
loader('--llamadas')

try {
  write(
    'night.json',
    query(`
      select coalesce(json_agg(t order by t.inicio, t.escenario_slug, t.conjunto_slug), '[]') from (
        select inicio, estado, etapa_rueda, etapa_numero, conjunto_slug, escenario_slug, direccion
          from public.actuaciones_de_la_noche('${NIGHT}')
      ) t`),
  )
  write(
    'order.json',
    query(`
      select coalesce(json_agg(t order by t.evento_slug, t.posicion), '[]') from (
        select e.slug as evento_slug, o.posicion, c.slug as conjunto_slug
          from public.orden_desfile o
          join public.eventos e on e.id = o.evento_id
          join public.conjuntos c on c.id = o.conjunto_id
         where o.fuente = 'orden-ficticio'
      ) t`),
  )
  write(
    'fixture.json',
    query(`
      select coalesce(json_agg(t order by t.fecha, t.inicio, t.conjunto_slug), '[]') from (
        select rueda, numero, fecha, inicio, estado, conjunto_slug
          from public.fixture_del_concurso(2027)
         where fuente = 'fixture-ficticio'
      ) t`),
  )
} finally {
  loader('--real', '--quitar')
  loader('--fixture', '--quitar')
  loader('--llamadas', '--quitar')
}
console.log(`gen:demo: listo en ${path.relative(repoRoot, outDir)}`)
