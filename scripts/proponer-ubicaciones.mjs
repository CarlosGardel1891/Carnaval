#!/usr/bin/env node
// Propone la ubicación de los escenarios que no la tienen, geocodificando su dirección con
// OpenStreetMap (Nominatim). Decisión 87: lo que encuentra NO queda como ubicación del
// escenario; queda como propuesta, para que un admin la confirme mirándola en el panel.
//
//   pnpm escenarios:proponer            contra el Supabase local
//   pnpm escenarios:proponer --seco     sólo muestra lo que encontraría, sin guardar nada
//   pnpm escenarios:proponer --remoto   contra el proyecto remoto (con SUPABASE_URL y
//                                       SUPABASE_SERVICE_ROLE_KEY definidas en la terminal)
//
// Busca los escenarios activos, no itinerantes, con dirección y sin ubicación. Una consulta
// por segundo, como pide Nominatim. A OpenStreetMap sólo le llega la dirección del escenario.
// Volver a correrlo reemplaza las propuestas que ya había.

import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--seco')
const remote = args.includes('--remoto')

function fail(message) {
  console.error(`escenarios:proponer: ${message}`)
  process.exit(1)
}

function target() {
  if (remote) {
    const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) fail('con --remoto hacen falta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
    return { url, key }
  }
  if (process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) {
    fail(
      'hay SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno. Para ese proyecto agregá --remoto; para el local, sacá esas variables.',
    )
  }
  let status
  try {
    status = execFileSync('corepack', ['pnpm', 'supabase', 'status', '-o', 'env'], {
      cwd: repoRoot,
      encoding: 'utf8',
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    fail('no se pudo leer `supabase status` (¿está levantado el Supabase local?).')
  }
  const read = (name) => status.match(new RegExp(`^${name}="?([^"\\n]+)"?$`, 'm'))?.[1]
  const url = read('API_URL')
  const key = read('SERVICE_ROLE_KEY')
  if (!url || !key) fail('`supabase status` no devolvió la URL o la service role key.')
  return { url, key }
}

const { url, key } = target()
const headers = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }

async function rest(pathname, init = {}) {
  const res = await fetch(`${url}/rest/v1/${pathname}`, {
    ...init,
    headers: { ...headers, ...init.headers },
  })
  if (!res.ok) fail(`${pathname} respondió ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.status === 204 ? null : res.json()
}

// El departamento de Montevideo, con margen: lo que caiga afuera no se propone.
const BOUNDS = { south: -34.95, north: -34.69, west: -56.45, east: -55.98 }
const inBounds = (lat, lng) =>
  lat >= BOUNDS.south && lat <= BOUNDS.north && lng >= BOUNDS.west && lng <= BOUNDS.east

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** «Av. Tal 123 esq. Otra» → lo que Nominatim entiende mejor: sin lo que va después de «esq.». */
function queryFor(stage) {
  const street = stage.direccion.replace(/\s+(esq\.?|esquina|casi|entre)\s+.*$/i, '').trim()
  return `${street}, Montevideo, Uruguay`
}

async function geocode(query) {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '1',
    countrycodes: 'uy',
    viewbox: `${BOUNDS.west},${BOUNDS.north},${BOUNDS.east},${BOUNDS.south}`,
    bounded: '1',
  })
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: { 'user-agent': 'carnavalero-escenarios/1.0', 'accept-language': 'es' },
  })
  if (!res.ok) throw new Error(`Nominatim respondió ${res.status}`)
  const [hit] = await res.json()
  if (!hit) return null
  const lat = Number(hit.lat)
  const lng = Number(hit.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inBounds(lat, lng)) return null
  return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), resultado: hit.display_name }
}

const stages = (await rest('rpc/escenarios_con_ubicacion', { method: 'POST', body: '{}' })).filter(
  (stage) =>
    stage.activo && stage.itinerante !== true && stage.lat === null && stage.direccion?.trim(),
)
console.log(
  `escenarios:proponer: ${stages.length} escenarios con dirección y sin ubicación en ${new URL(url).host}${dryRun ? ' (en seco)' : ''}`,
)

const found = []
const missing = []
for (const stage of stages) {
  const consulta = queryFor(stage)
  try {
    const hit = await geocode(consulta)
    if (hit) {
      found.push({ escenario_id: stage.id, ...hit, consulta, fuente: 'openstreetmap' })
      console.log(`  ok    ${stage.nombre}: ${hit.lat}, ${hit.lng}\n        ${hit.resultado}`)
    } else {
      missing.push(stage)
      console.log(`  nada  ${stage.nombre}: «${consulta}»`)
    }
  } catch (error) {
    missing.push(stage)
    console.log(`  falla ${stage.nombre}: ${error.message}`)
  }
  await sleep(1100)
}

if (!dryRun && found.length > 0) {
  await rest('ubicaciones_propuestas?on_conflict=escenario_id', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(found),
  })
}

console.log(
  `\n${found.length} propuestas${dryRun ? ' (no se guardaron)' : ' guardadas'}; ${missing.length} sin resultado.`,
)
if (missing.length > 0) {
  console.log('Sin resultado (hay que ubicarlos a mano en el panel):')
  for (const stage of missing) console.log(`  - ${stage.nombre}: ${stage.direccion}`)
}
console.log(
  'Cada propuesta se confirma en el panel, en Escenarios: no es la ubicación hasta guardarla.',
)
