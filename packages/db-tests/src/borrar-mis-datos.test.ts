import { createClient } from '@supabase/supabase-js'
import type { Database } from '@cuerda/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient, withSql, type Db } from './clients'
import { admin, limpiar, ok } from './helpers'
import type { TestUser } from './global-setup'

// Borrar mis datos y la purga de anónimos inactivos (decisión 84). Los usuarios que se borran
// se crean acá: los anónimos compartidos de los demás tests no se tocan.

const NOCHE = '2032-02-01'
const creados: string[] = []
let conjuntoId = 0

async function nuevoAnonimo(): Promise<TestUser> {
  const { env } = ctx()
  const client = createClient<Database>(env.apiUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.signInAnonymously()
  if (error || !data.session || !data.user) {
    throw new Error(`No se pudo crear un usuario anónimo: ${error?.message ?? 'sin sesión'}`)
  }
  creados.push(data.user.id)
  return { id: data.user.id, token: data.session.access_token }
}

/** Le carga a un usuario un seguido, un dispositivo y un aviso. */
async function conDatos(user: TestUser, token: string): Promise<void> {
  const db = userClient(user)
  expect((await db.from('favoritos').insert({ conjunto_id: conjuntoId })).error).toBeNull()
  expect(
    (
      await db.rpc('registrar_dispositivo_push', {
        p_token: token,
        p_plataforma: 'android',
        p_idioma: 'es',
      })
    ).error,
  ).toBeNull()
  await withSql((sql) =>
    sql.query(
      `insert into public.avisos_enviados (usuario_id, tipo, noche, clave)
       values ($1, 'hoy', $2, $3)`,
      [user.id, NOCHE, `zz-borrar-${token}`],
    ),
  )
}

/** Sigue al conjunto de prueba; si ya lo seguía, no pasa nada. */
async function seguir(db: Db): Promise<void> {
  const { error } = await db.from('favoritos').insert({ conjunto_id: conjuntoId })
  if (error && error.code !== '23505') throw new Error(error.message)
}

/** Cuántas filas quedan de un usuario en cada lugar. */
async function restos(id: string) {
  return withSql(async (sql) => {
    const count = async (query: string) => Number((await sql.query(query, [id])).rows[0].n)
    return {
      usuario: await count('select count(*) n from auth.users where id = $1'),
      sesiones: await count('select count(*) n from auth.sessions where user_id = $1'),
      identidades: await count('select count(*) n from auth.identities where user_id = $1'),
      favoritos: await count('select count(*) n from public.favoritos where usuario_id = $1'),
      dispositivos: await count(
        'select count(*) n from public.dispositivos_push where usuario_id = $1',
      ),
      avisos: await count('select count(*) n from public.avisos_enviados where usuario_id = $1'),
    }
  })
}

const NADA = { usuario: 0, sesiones: 0, identidades: 0, favoritos: 0, dispositivos: 0, avisos: 0 }

/** Corre hacia atrás toda la actividad de un usuario. */
async function envejecer(id: string, meses: number): Promise<void> {
  await withSql(async (sql) => {
    const hace = `now() - interval '${meses} months'`
    await sql.query(
      `update auth.users set created_at = ${hace}, last_sign_in_at = ${hace} where id = $1`,
      [id],
    )
    await sql.query(
      `update auth.sessions
          set created_at = ${hace}, updated_at = ${hace},
              refreshed_at = (${hace}) at time zone 'utc'
        where user_id = $1`,
      [id],
    )
    await sql.query(`update public.favoritos set creado_en = ${hace} where usuario_id = $1`, [id])
    await sql.query(
      `alter table public.dispositivos_push disable trigger dispositivos_push_tocar_actualizado_en`,
    )
    await sql.query(
      `update public.dispositivos_push set actualizado_en = ${hace} where usuario_id = $1`,
      [id],
    )
    await sql.query(
      `alter table public.dispositivos_push enable trigger dispositivos_push_tocar_actualizado_en`,
    )
  })
}

const purgar = (db: Db, meses = 13) =>
  db.rpc('purgar_anonimos_inactivos', {
    p_antes: new Date(Date.now() - meses * 30.5 * 24 * 3600 * 1000).toISOString(),
    p_limite: 1000,
  })

async function borrarCreados(): Promise<void> {
  await withSql(async (sql) => {
    await sql.query(`delete from public.avisos_enviados where clave like 'zz-borrar-%'`)
    await sql.query(`delete from public.dispositivos_push where token like 'zz-borrar-%'`)
    if (creados.length > 0) {
      await sql.query(`delete from auth.users where id = any($1::uuid[])`, [creados])
    }
    await sql.query(
      `delete from public.favoritos where usuario_id = any($1::uuid[]) and conjunto_id = $2`,
      [[ctx().anonimoA.id, ctx().admin.id], conjuntoId],
    )
  })
}

beforeAll(async () => {
  await limpiar()
  const conjuntos = ok(await serviceClient().from('conjuntos').select('id').order('id').limit(1))
  conjuntoId = conjuntos[0]!.id
})

afterAll(async () => {
  await borrarCreados()
  await limpiar()
})

describe('borrar_mis_datos', () => {
  it('borra al usuario anónimo y no deja nada suyo en la base', async () => {
    const user = await nuevoAnonimo()
    await conDatos(user, 'zz-borrar-uno')
    expect(await restos(user.id)).toMatchObject({
      usuario: 1,
      favoritos: 1,
      dispositivos: 1,
      avisos: 1,
    })

    expect((await userClient(user).rpc('borrar_mis_datos')).error).toBeNull()

    expect(await restos(user.id)).toEqual(NADA)
  })

  it('no toca los datos de otro usuario', async () => {
    const otro = userClient(ctx().anonimoA)
    await seguir(otro)
    const user = await nuevoAnonimo()
    await conDatos(user, 'zz-borrar-dos')

    expect((await userClient(user).rpc('borrar_mis_datos')).error).toBeNull()

    expect(await restos(user.id)).toEqual(NADA)
    expect(await restos(ctx().anonimoA.id)).toMatchObject({ usuario: 1, favoritos: 1 })
  })

  it('después de borrar, la sesión vieja ya no sirve para seguir', async () => {
    const user = await nuevoAnonimo()
    expect((await userClient(user).rpc('borrar_mis_datos')).error).toBeNull()

    const res = await userClient(user).from('favoritos').insert({ conjunto_id: conjuntoId })
    expect(res.error).not.toBeNull()
    expect(await restos(user.id)).toEqual(NADA)
  })

  it('se puede llamar dos veces', async () => {
    const user = await nuevoAnonimo()
    expect((await userClient(user).rpc('borrar_mis_datos')).error).toBeNull()
    expect((await userClient(user).rpc('borrar_mis_datos')).error).toBeNull()
  })

  it('a una cuenta con email le borra lo de la app, no la cuenta', async () => {
    await seguir(admin())

    expect((await admin().rpc('borrar_mis_datos')).error).toBeNull()

    expect(await restos(ctx().admin.id)).toMatchObject({ usuario: 1, favoritos: 0 })
  })

  it('sin sesión no se puede llamar', async () => {
    expect((await anonClient().rpc('borrar_mis_datos')).error).not.toBeNull()
  })
})

describe('purgar_anonimos_inactivos', () => {
  it('borra al anónimo sin actividad en 13 meses, con todo lo suyo', async () => {
    const viejo = await nuevoAnonimo()
    await conDatos(viejo, 'zz-borrar-viejo')
    await envejecer(viejo.id, 14)

    const borrados = ok(await purgar(serviceClient()))

    expect(borrados).toBeGreaterThanOrEqual(1)
    expect(await restos(viejo.id)).toEqual(NADA)
  })

  it('no borra al que se creó hace mucho pero siguió usando la app', async () => {
    const activo = await nuevoAnonimo()
    await conDatos(activo, 'zz-borrar-activo')
    await envejecer(activo.id, 14)
    // Abrió la app hace poco: la app vuelve a registrar el dispositivo en cada arranque.
    await withSql((sql) =>
      sql.query(`update public.dispositivos_push set idioma = 'en' where usuario_id = $1`, [
        activo.id,
      ]),
    )

    ok(await purgar(serviceClient()))

    expect(await restos(activo.id)).toMatchObject({ usuario: 1, favoritos: 1, dispositivos: 1 })
  })

  it('no borra a los recientes ni a las cuentas con email, por viejas que sean', async () => {
    const reciente = await nuevoAnonimo()
    await envejecer(reciente.id, 12)
    const antes = await withSql(async (sql) => {
      const { rows } = await sql.query(
        `select created_at, last_sign_in_at from auth.users where id = $1`,
        [ctx().admin.id],
      )
      await sql.query(
        `update auth.users set created_at = now() - interval '3 years',
                last_sign_in_at = now() - interval '3 years' where id = $1`,
        [ctx().admin.id],
      )
      return rows[0]
    })

    try {
      ok(await purgar(serviceClient()))
      expect(await restos(reciente.id)).toMatchObject({ usuario: 1 })
      expect(await restos(ctx().admin.id)).toMatchObject({ usuario: 1 })
      expect(await restos(ctx().anonimoA.id)).toMatchObject({ usuario: 1 })
    } finally {
      await withSql((sql) =>
        sql.query(`update auth.users set created_at = $2, last_sign_in_at = $3 where id = $1`, [
          ctx().admin.id,
          antes.created_at,
          antes.last_sign_in_at,
        ]),
      )
    }
  })

  it('respeta el límite por pasada', async () => {
    const uno = await nuevoAnonimo()
    await envejecer(uno.id, 20)
    const res = await serviceClient().rpc('purgar_anonimos_inactivos', {
      p_antes: new Date(Date.now() - 13 * 30.5 * 24 * 3600 * 1000).toISOString(),
      p_limite: 0,
    })
    expect(res.error).toBeNull()
    expect(res.data).toBe(0)
    expect(await restos(uno.id)).toMatchObject({ usuario: 1 })
  })

  it('sólo la corre la service role', async () => {
    for (const db of [anonClient(), userClient(ctx().anonimoA), admin()]) {
      expect((await purgar(db)).error).not.toBeNull()
    }
  })
})
