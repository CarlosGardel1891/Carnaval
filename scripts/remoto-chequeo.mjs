#!/usr/bin/env node
// Chequea un proyecto REMOTO de Supabase después de armarlo o de tocarlo (decisión 77):
//
//   - que tenga las migraciones y el seed (temporada, conjuntos, escenarios, eventos);
//   - que no haya llegado nada de prueba (decisiones 27 y 76);
//   - que los inicios de sesión anónimos estén activados;
//   - que las Edge Functions de avisos respondan, y si mandan de verdad o en simulacro.
//
//   pnpm remoto:chequeo
//
// Necesita, definidas en la terminal sólo para este comando, SUPABASE_URL,
// SUPABASE_ANON_KEY (la pública) y SUPABASE_SERVICE_ROLE_KEY (la secret key del proyecto,
// `sb_secret_…`; decisión 78). Ninguna va en un archivo del repo. No cambia datos: crea y borra un usuario anónimo de prueba, y llama a las dos funciones
// de avisos igual que las llama el cron (si hay avisos pendientes, salen en ese momento).

const url = process.env.SUPABASE_URL?.replace(/\/$/, '')
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceKey) {
  console.error(
    'remoto:chequeo: faltan SUPABASE_URL, SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY en el entorno.',
  )
  process.exit(1)
}
if (['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) {
  console.error(
    'remoto:chequeo: es para un proyecto remoto; el local se prueba con `pnpm test:db`.',
  )
  process.exit(1)
}

const service = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }
let failures = 0

function report(ok, text) {
  if (!ok) failures += 1
  console.log(`${ok ? '  ok  ' : ' FALLA'} ${text}`)
}

/** Cuántas filas de una tabla cumplen un filtro de PostgREST. */
async function count(table, filter = '') {
  const res = await fetch(`${url}/rest/v1/${table}?select=*${filter ? `&${filter}` : ''}`, {
    method: 'HEAD',
    headers: { ...service, prefer: 'count=exact', range: '0-0' },
  })
  if (!res.ok && res.status !== 206 && res.status !== 416) {
    throw new Error(`${table} respondió ${res.status}`)
  }
  return Number(res.headers.get('content-range')?.split('/')[1] ?? Number.NaN)
}

async function check(text, run) {
  try {
    const result = await run()
    report(result.ok, `${text}: ${result.detail}`)
  } catch (error) {
    report(false, `${text}: ${error.message}`)
  }
}

console.log(`remoto:chequeo: ${new URL(url).host}`)

console.log('\nMigraciones y seed')
for (const [table, filter, min] of [
  ['temporadas', 'anio=eq.2027', 1],
  ['conjuntos', '', 100],
  ['escenarios', '', 30],
  ['eventos', '', 10],
  ['registro_cambios', '', 1],
]) {
  await check(table, async () => {
    const n = await count(table, filter)
    return { ok: n >= min, detail: `${n} filas (se esperan ${min} o más)` }
  })
}
await check('funciones del importador', async () => {
  const res = await fetch(`${url}/rest/v1/rpc/fuente_reservada`, {
    method: 'POST',
    headers: { ...service, 'content-type': 'application/json' },
    body: JSON.stringify({ p_fuente: 'ficticia' }),
  })
  return { ok: res.ok && (await res.json()) === true, detail: `respondió ${res.status}` }
})

console.log('\nNada de prueba')
for (const [table, filter, what] of [
  ['actuaciones', 'fuente=in.(ficticia,fixture-ficticio)', 'grilla o fixture ficticios'],
  ['actuaciones', 'fuente=like.cartelera-*', 'la noche real de prueba'],
  ['etapas_concurso', 'fuente=eq.fixture-ficticio', 'etapas del fixture ficticio'],
  ['orden_desfile', 'fuente=eq.orden-ficticio', 'orden de desfile ficticio'],
  ['escenarios', 'slug=like.ficticio-*', 'escenarios inventados'],
  ['conjuntos', 'slug=like.zz-*', 'conjuntos de los tests'],
]) {
  await check(what, async () => {
    const n = await count(table, filter)
    return { ok: n === 0, detail: n === 0 ? 'no hay' : `hay ${n} filas en ${table}` }
  })
}

console.log('\nAuth')
await check('inicios de sesión anónimos', async () => {
  const res = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'content-type': 'application/json' },
    body: '{}',
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.user?.id) {
    return {
      ok: false,
      detail: `respondió ${res.status} (${body.msg ?? body.error_code ?? 'sin sesión'})`,
    }
  }
  await fetch(`${url}/auth/v1/admin/users/${body.user.id}`, { method: 'DELETE', headers: service })
  return { ok: true, detail: 'activados (se creó y se borró un usuario de prueba)' }
})
await check('un usuario anónimo no puede escribir', async () => {
  const res = await fetch(`${url}/rest/v1/conjuntos`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ slug: 'zz-chequeo', nombre: 'Zz Chequeo', categoria: 'otro' }),
  })
  return { ok: res.status === 401 || res.status === 403, detail: `respondió ${res.status}` }
})

console.log('\nEdge Functions')
for (const [name, body] of [
  ['avisos-de-cambios', {}],
  ['avisos-del-dia', {}],
]) {
  await check(name, async () => {
    const res = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      // Como el cron: la key va sólo en `apikey` (decisión 78).
      headers: { apikey: serviceKey, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    const mode = data.simulacro === true ? 'en SIMULACRO (falta Firebase)' : 'manda de verdad'
    return { ok: res.ok, detail: res.ok ? `responde, ${mode}` : `respondió ${res.status}` }
  })
}
await check('las funciones rechazan a quien no es admin', async () => {
  const res = await fetch(`${url}/functions/v1/avisos-de-cambios`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      'content-type': 'application/json',
    },
    body: '{}',
  })
  return { ok: res.status === 401 || res.status === 403, detail: `respondió ${res.status}` }
})

console.log(
  '\nNo se chequea desde acá: que las dos tareas de pg_cron estén programadas (lo muestra el final de supabase/remoto/programar_avisos.sql) y los límites de auth por IP.',
)
console.log(failures === 0 ? '\nTodo bien.' : `\n${failures} cosas para revisar.`)
process.exit(failures === 0 ? 0 : 1)
