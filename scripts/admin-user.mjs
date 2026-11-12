#!/usr/bin/env node
// Admins del panel (docs/DECISIONES.md, decisiones 23 y 69).
//
// Un admin es un usuario de Supabase Auth con `app_metadata.rol = 'admin'`. Ese claim sólo se
// escribe con la service role, y este script es el único lugar donde se hace.
//
//   pnpm admin:alta ana@ejemplo.com             lo crea (o le da el permiso, si ya existe)
//   pnpm admin:alta ana@ejemplo.com --clave     le pone una contraseña nueva a uno que ya existe
//   pnpm admin:baja ana@ejemplo.com             le quita el permiso; el usuario queda
//   pnpm admin:baja ana@ejemplo.com --borrar    borra el usuario
//   pnpm admin:lista                            quiénes son admin
//
// Sin variables de entorno trabaja contra el Supabase local (toma la URL y la key de
// `supabase status`). Contra un proyecto remoto hay que pasar `--remoto` y definir en la
// terminal, sólo para ese comando, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. La service role
// no va en ningún archivo del repo ni en el `.env` de la app o del panel.
//
// El alta muestra la contraseña una sola vez. Quitar el permiso tarda hasta una hora en
// hacerse efectivo: lo que tarda en vencer la sesión que el usuario ya tenía abierta.
import { execSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]'])

function fail(message) {
  console.error(`admin: ${message}`)
  process.exit(1)
}

const [command, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((arg) => arg.startsWith('--')))
const [email, ...extra] = rest.filter((arg) => !arg.startsWith('--'))
const known = new Set(['--remoto', '--clave', '--borrar'])

const usage =
  'uso: pnpm admin:alta <email> [--clave] | pnpm admin:baja <email> [--borrar] | pnpm admin:lista   (con --remoto, contra el proyecto de SUPABASE_URL)'
if (!['alta', 'baja', 'lista'].includes(command)) fail(usage)
for (const flag of flags) if (!known.has(flag)) fail(`no conozco la opción ${flag}. ${usage}`)
if (extra.length > 0) fail(usage)
if (command === 'lista' ? email : !email) fail(usage)
if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`«${email}» no parece un email.`)

function localEnv() {
  const pathKey = Object.keys(process.env).find((k) => k.toLowerCase() === 'path') ?? 'PATH'
  const binDir = path.join(root, 'node_modules', '.bin')
  let out
  try {
    out = execSync('supabase status -o env', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, [pathKey]: binDir + path.delimiter + (process.env[pathKey] ?? '') },
    })
  } catch {
    fail('no pude leer el Supabase local. ¿Está levantado? Corré `pnpm supabase start`.')
  }
  const read = (key) => new RegExp(`^${key}="?(.*?)"?$`, 'm').exec(out)?.[1]
  const url = read('API_URL')
  const key = read('SERVICE_ROLE_KEY')
  if (!url || !key) fail('`supabase status` no devolvió la URL o la service role key.')
  return { url, key }
}

function target() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!flags.has('--remoto')) {
    if (url || key) {
      fail(
        'hay SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno. Para trabajar contra ese proyecto agregá --remoto; para el local, sacá esas variables.',
      )
    }
    return localEnv()
  }
  if (!url || !key) fail('con --remoto hacen falta SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.')
  let host
  try {
    host = new URL(url).hostname
  } catch {
    fail(`SUPABASE_URL no es una dirección: ${url}`)
  }
  if (LOOPBACK.has(host)) fail('--remoto es para un proyecto remoto; para el local no hace falta.')
  return { url: url.replace(/\/$/, ''), key }
}

const { url, key } = target()
const where = new URL(url).host

async function api(method, route, body) {
  let res
  try {
    res = await fetch(`${url}/auth/v1/admin${route}`, {
      method,
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (cause) {
    fail(`no pude conectarme a ${where} (${cause.message}).`)
  }
  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // Una respuesta que no es JSON: se informa tal cual más abajo.
  }
  if (!res.ok) {
    fail(`${where} respondió ${res.status}: ${data?.msg ?? data?.message ?? text.slice(0, 200)}`)
  }
  return data
}

async function allUsers() {
  const users = []
  for (let page = 1; ; page++) {
    const data = await api('GET', `/users?page=${page}&per_page=200`)
    const batch = data?.users ?? []
    users.push(...batch)
    if (batch.length < 200) return users
  }
}

const isAdmin = (user) => user.app_metadata?.rol === 'admin'
const findByEmail = async (address) =>
  (await allUsers()).find((user) => user.email?.toLowerCase() === address.toLowerCase())
const newPassword = () => randomBytes(18).toString('base64url')

function showPassword(password) {
  console.log(`  contraseña: ${password}`)
  console.log('  No se vuelve a mostrar: pasásela por un canal seguro y que la guarde.')
}

if (command === 'lista') {
  const admins = (await allUsers()).filter(isAdmin)
  console.log(`admin: ${admins.length} en ${where}`)
  for (const user of admins) {
    console.log(`  ${user.email}   último ingreso: ${user.last_sign_in_at ?? 'nunca'}`)
  }
}

if (command === 'alta') {
  const user = await findByEmail(email)
  if (!user) {
    const password = newPassword()
    await api('POST', '/users', {
      email,
      password,
      email_confirm: true,
      app_metadata: { rol: 'admin' },
    })
    console.log(`admin: ${email} creado como admin en ${where}.`)
    showPassword(password)
  } else {
    const password = flags.has('--clave') ? newPassword() : undefined
    await api('PUT', `/users/${user.id}`, {
      app_metadata: { ...user.app_metadata, rol: 'admin' },
      ...(password ? { password } : {}),
    })
    console.log(
      isAdmin(user)
        ? `admin: ${email} ya era admin en ${where}.`
        : `admin: ${email} ya existía en ${where}; ahora es admin.`,
    )
    if (password) showPassword(password)
    else console.log('  Su contraseña no cambió. Para ponerle una nueva: --clave.')
  }
}

if (command === 'baja') {
  const user = await findByEmail(email)
  if (!user) fail(`no hay ningún usuario con el email ${email} en ${where}.`)
  if (flags.has('--borrar')) {
    await api('DELETE', `/users/${user.id}`)
    console.log(`admin: ${email} borrado de ${where}.`)
  } else {
    await api('PUT', `/users/${user.id}`, { app_metadata: { ...user.app_metadata, rol: null } })
    console.log(`admin: ${email} ya no es admin en ${where}. El usuario sigue existiendo.`)
  }
  console.log('  Si tenía el panel abierto, puede seguir escribiendo hasta una hora más.')
}
