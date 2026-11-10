#!/usr/bin/env node
// Carga la grilla ficticia (supabase/local/grilla_ficticia.sql) en el Supabase local.
//
//   pnpm db:grilla               tres noches desde el 2027-01-28
//   pnpm db:grilla hoy           tres noches desde la noche lógica de hoy
//   pnpm db:grilla 2027-02-01    tres noches desde esa fecha
//   pnpm db:grilla --quitar      borra la grilla ficticia
//
// Entra por `docker exec` al contenedor de la base local: no usa URL ni keys, así que no
// puede llegar a un proyecto remoto.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sqlFile = path.join(root, 'supabase', 'local', 'grilla_ficticia.sql')
const REMOVE_SQL = `
  delete from public.actuaciones where fuente = 'ficticia';
  delete from public.escenarios where slug like 'ficticio-%';
`

function fail(message) {
  console.error(`db:grilla: ${message}`)
  process.exit(1)
}

const args = process.argv.slice(2)
const remove = args.includes('--quitar')
const rest = args.filter((a) => a !== '--quitar')
if (rest.length > 1 || (remove && rest.length > 0)) {
  fail('uso: pnpm db:grilla [hoy | YYYY-MM-DD] | pnpm db:grilla --quitar')
}
const from = rest[0] ?? ''
if (from && from !== 'hoy' && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
  fail(`«${from}» no es una fecha (YYYY-MM-DD) ni «hoy».`)
}

// El contenedor se llama supabase_db_<project_id>.
const config = readFileSync(path.join(root, 'supabase', 'config.toml'), 'utf8')
const projectId = /^project_id\s*=\s*"([^"]+)"/m.exec(config)?.[1]
if (!projectId) fail('no encontré project_id en supabase/config.toml.')

const settings = ['-c cuerda.grilla_ficticia=local']
if (from) settings.push(`-c cuerda.grilla_desde=${from}`)

const result = spawnSync(
  'docker',
  [
    'exec',
    '-i',
    '-e',
    `PGOPTIONS=${settings.join(' ')}`,
    '-e',
    'PGCLIENTENCODING=UTF8',
    `supabase_db_${projectId}`,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-q',
    '-f',
    '-',
  ],
  { input: remove ? REMOVE_SQL : readFileSync(sqlFile), stdio: ['pipe', 'inherit', 'inherit'] },
)

if (result.error || result.status !== 0) {
  fail(
    result.error
      ? `no pude correr docker (${result.error.message}).`
      : 'no se cargó. ¿Está levantado el Supabase local? Corré `pnpm supabase start`.',
  )
}
console.log(remove ? 'db:grilla: grilla ficticia borrada.' : 'db:grilla: grilla ficticia cargada.')
