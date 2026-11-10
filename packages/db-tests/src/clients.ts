import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@cuerda/shared'
import pg from 'pg'
import { inject } from 'vitest'
import type { TestContext, TestUser } from './global-setup'

export type Db = SupabaseClient<Database>

const noSession = { persistSession: false, autoRefreshToken: false }

export const ctx = (): TestContext => inject('cuerda')

/** Sin sesión: rol `anon` (la app antes de iniciar la sesión anónima, o cualquiera con la key pública). */
export function anonClient(): Db {
  const { env } = ctx()
  return createClient<Database>(env.apiUrl, env.anonKey, { auth: noSession })
}

/** Con el JWT de un usuario: pasa por RLS como él. */
export function userClient(user: TestUser): Db {
  const { env } = ctx()
  return createClient<Database>(env.apiUrl, env.anonKey, {
    auth: noSession,
    global: { headers: { Authorization: `Bearer ${user.token}` } },
  })
}

/** Service role: saltea RLS. Sólo para preparar y verificar datos, nunca para probar permisos. */
export function serviceClient(): Db {
  const { env } = ctx()
  return createClient<Database>(env.apiUrl, env.serviceRoleKey, { auth: noSession })
}

/** Conexión directa a Postgres como superusuario, para lo que no pasa por la API. */
export async function withSql<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: ctx().env.dbUrl })
  await client.connect()
  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}
