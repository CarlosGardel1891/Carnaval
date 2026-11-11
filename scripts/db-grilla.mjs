#!/usr/bin/env node
// Carga en el Supabase local los datos de prueba de supabase/local/.
//
// La grilla ficticia (grilla_ficticia.sql):
//
//   pnpm db:grilla               tres noches desde el 2027-01-28
//   pnpm db:grilla hoy           tres noches desde la noche lógica de hoy
//   pnpm db:grilla 2027-02-01    tres noches desde esa fecha
//   pnpm db:grilla --quitar      borra la grilla ficticia
//
// La noche real del 28/02/2026, según la cartelera publicada (noche_real_2026-02-28.sql):
//
//   pnpm db:noche-real             en su fecha: 2026-02-28
//   pnpm db:noche-real hoy         en la noche lógica de hoy
//   pnpm db:noche-real 2027-02-01  en esa fecha
//   pnpm db:noche-real --quitar    la borra
//
// Al cargarla lista los nombres de la cartelera que no coinciden con ningún nombre ni
// alias del seed (esas líneas no se cargan).
//
// El fixture ficticio del Concurso Oficial (fixture_ficticio.sql):
//
//   pnpm db:fixture               las tres ruedas desde el 2027-01-25
//   pnpm db:fixture hoy           desde la noche lógica de hoy
//   pnpm db:fixture 2027-02-01    desde esa fecha
//   pnpm db:fixture --quitar      lo borra
//
// Entra por `docker exec` al contenedor de la base local: no usa URL ni keys, así que no
// puede llegar a un proyecto remoto.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATASETS = {
  ficticia: {
    command: 'db:grilla',
    label: 'grilla ficticia',
    file: 'grilla_ficticia.sql',
    removeSql: `
      delete from public.actuaciones where fuente = 'ficticia';
      delete from public.escenarios where slug like 'ficticio-%';
    `,
  },
  fixture: {
    command: 'db:fixture',
    label: 'fixture ficticio del Concurso',
    file: 'fixture_ficticio.sql',
    // Primero las actuaciones: sin ellas, borrar la etapa no deja ninguna con la etapa en null.
    removeSql: `
      delete from public.actuaciones where fuente = 'fixture-ficticio';
      delete from public.etapas_concurso where fuente = 'fixture-ficticio';
    `,
  },
  real: {
    command: 'db:noche-real',
    label: 'noche real del 28/02/2026',
    file: 'noche_real_2026-02-28.sql',
    removeSql: `delete from public.actuaciones where fuente = 'cartelera-2026-02-28';`,
  },
}

const args = process.argv.slice(2)
const dataset = args.includes('--real')
  ? DATASETS.real
  : args.includes('--fixture')
    ? DATASETS.fixture
    : DATASETS.ficticia
const sqlFile = path.join(root, 'supabase', 'local', dataset.file)

function fail(message) {
  console.error(`${dataset.command}: ${message}`)
  process.exit(1)
}

const remove = args.includes('--quitar')
const rest = args.filter((a) => a !== '--quitar' && a !== '--real' && a !== '--fixture')
if (rest.length > 1 || (remove && rest.length > 0)) {
  fail(`uso: pnpm ${dataset.command} [hoy | YYYY-MM-DD] | pnpm ${dataset.command} --quitar`)
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
  {
    input: remove ? dataset.removeSql : readFileSync(sqlFile),
    stdio: ['pipe', 'inherit', 'inherit'],
  },
)

if (result.error || result.status !== 0) {
  fail(
    result.error
      ? `no pude correr docker (${result.error.message}).`
      : 'no se cargó. ¿Está levantado el Supabase local? Corré `pnpm supabase start`.',
  )
}
console.log(`${dataset.command}: ${dataset.label}: ${remove ? 'se borró' : 'se cargó'}.`)
