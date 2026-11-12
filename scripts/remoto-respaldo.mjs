#!/usr/bin/env node
// Saca una copia de la base del proyecto remoto (decisión 89):
//
//   pnpm remoto:respaldo
//
// Deja el esquema y los datos en `~/.carnavalero/respaldos/<fecha y hora>/`, fuera del repo.
// Usa `supabase db dump` contra el proyecto enlazado: hace falta `pnpm supabase login` (en una
// terminal propia), `pnpm supabase link` y Docker andando. Conviene correrlo antes de cada
// migración y antes de cada carga grande; no reemplaza las copias diarias del plan Pro.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stamp = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-')
const dir = path.join(os.homedir(), '.carnavalero', 'respaldos', stamp)
mkdirSync(dir, { recursive: true })

function dump(file, extra) {
  const target = path.join(dir, file)
  const result = spawnSync(
    'corepack',
    ['pnpm', 'supabase', 'db', 'dump', '--linked', ...extra, '-f', `"${target}"`],
    { cwd: repoRoot, shell: true, stdio: ['ignore', 'ignore', 'inherit'] },
  )
  if (result.status !== 0 || !existsSync(target) || statSync(target).size === 0) {
    console.error(`remoto:respaldo: no se pudo sacar ${file}.`)
    process.exit(1)
  }
  console.log(`  ${file}: ${(statSync(target).size / 1024).toFixed(0)} KB`)
}

console.log(`remoto:respaldo: ${dir}`)
dump('esquema.sql', [])
dump('datos.sql', ['--data-only', '--use-copy'])
console.log(
  'Listo. Para restaurar: primero esquema.sql y después datos.sql, con psql, en una base vacía.',
)
