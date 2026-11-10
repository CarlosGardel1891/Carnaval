import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { TestProject } from 'vitest/node'
import { readLocalEnv, type LocalEnv } from './local-env'

export interface TestUser {
  id: string
  token: string
}

export interface TestContext {
  env: LocalEnv
  /** Dos usuarios anónimos de verdad (signInAnonymously): rol `authenticated`, sin claim de admin. */
  anonimoA: TestUser
  anonimoB: TestUser
  /** Usuario con `app_metadata.rol = 'admin'`: lo único que `es_admin()` acepta. */
  admin: TestUser
  /** Usuario que se puso `rol: 'admin'` en `user_metadata` (editable por él): no cuenta. */
  falsoAdmin: TestUser
}

declare module 'vitest' {
  export interface ProvidedContext {
    cuerda: TestContext
  }
}

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

export default async function setup(project: TestProject) {
  const env = readLocalEnv()
  const service = createClient(env.apiUrl, env.serviceRoleKey, noSession)
  const created: string[] = []

  const signInAnonymously = async (): Promise<TestUser> => {
    const client = createClient(env.apiUrl, env.anonKey, noSession)
    const { data, error } = await client.auth.signInAnonymously()
    if (error || !data.session || !data.user) {
      throw new Error(
        `No se pudo crear un usuario anónimo (${error?.message ?? 'sin sesión'}). ` +
          'Si es el límite de altas por IP del auth local, reinicialo: `docker restart supabase_auth_cuerda`.',
        { cause: error },
      )
    }
    created.push(data.user.id)
    return { id: data.user.id, token: data.session.access_token }
  }

  const createWithPassword = async (metadata: {
    app_metadata?: Record<string, unknown>
    user_metadata?: Record<string, unknown>
  }): Promise<TestUser> => {
    const email = `test-${randomUUID()}@cuerda.invalid`
    const password = randomUUID()
    const { data: made, error: createError } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      ...metadata,
    })
    if (createError || !made.user) {
      throw new Error(`No se pudo crear el usuario de prueba: ${createError?.message}`, {
        cause: createError,
      })
    }
    created.push(made.user.id)
    const client = createClient(env.apiUrl, env.anonKey, noSession)
    const { data, error } = await client.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      throw new Error(`No se pudo iniciar sesión con el usuario de prueba: ${error?.message}`, {
        cause: error,
      })
    }
    return { id: made.user.id, token: data.session.access_token }
  }

  const teardown = async () => {
    for (const id of created) await service.auth.admin.deleteUser(id)
  }

  try {
    const context: TestContext = {
      env,
      anonimoA: await signInAnonymously(),
      anonimoB: await signInAnonymously(),
      admin: await createWithPassword({ app_metadata: { rol: 'admin' } }),
      falsoAdmin: await createWithPassword({ user_metadata: { rol: 'admin' } }),
    }
    project.provide('cuerda', context)
  } catch (error) {
    await teardown()
    throw error
  }

  return teardown
}
