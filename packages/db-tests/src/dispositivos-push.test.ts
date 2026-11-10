import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient, type Db } from './clients'
import { admin, limpiar, ok } from './helpers'

const T1 = 'zz-token-uno'
const T2 = 'zz-token-dos'

const a = () => userClient(ctx().anonimoA)
const b = () => userClient(ctx().anonimoB)

const registrar = (
  db: Db,
  token: string,
  plataforma: 'ios' | 'android' = 'android',
  idioma: 'es' | 'en' = 'es',
) =>
  db.rpc('registrar_dispositivo_push', {
    p_token: token,
    p_plataforma: plataforma,
    p_idioma: idioma,
  })

const fila = async (token: string) =>
  ok(await serviceClient().from('dispositivos_push').select().eq('token', token))

const tokensDe = async (db: Db) =>
  ok(await db.from('dispositivos_push').select('token').like('token', 'zz-%'))
    .map((d) => d.token)
    .sort()

beforeAll(limpiar)
afterAll(limpiar)

describe('registrar_dispositivo_push', () => {
  it('A registra su dispositivo y sólo él lo ve', async () => {
    expect((await registrar(a(), T1)).error).toBeNull()
    expect(await fila(T1)).toMatchObject([
      { token: T1, usuario_id: ctx().anonimoA.id, plataforma: 'android', idioma: 'es' },
    ])
    expect(await tokensDe(a())).toEqual([T1])
    expect(await tokensDe(b())).toEqual([])
  })

  it('volver a registrarlo actualiza la misma fila (por ejemplo, el idioma)', async () => {
    const [antes] = await fila(T1)
    expect((await registrar(a(), T1, 'android', 'en')).error).toBeNull()
    const filas = await fila(T1)
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ usuario_id: ctx().anonimoA.id, idioma: 'en' })
    expect(filas[0]!.creado_en).toBe(antes!.creado_en)
    expect(new Date(filas[0]!.actualizado_en).getTime()).toBeGreaterThan(
      new Date(antes!.actualizado_en).getTime(),
    )
  })

  it('si el mismo dispositivo pasa a otro usuario, el token se reasigna', async () => {
    expect((await registrar(b(), T1, 'android', 'es')).error).toBeNull()
    const filas = await fila(T1)
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ usuario_id: ctx().anonimoB.id, idioma: 'es' })
    expect(await tokensDe(a())).toEqual([])
    expect(await tokensDe(b())).toEqual([T1])
  })

  it('sin sesión no se puede registrar', async () => {
    const { error } = await registrar(anonClient(), 'zz-token-sin-sesion')
    expect(error?.code).toBe('42501')
    expect(await fila('zz-token-sin-sesion')).toEqual([])
  })

  it('rechaza tokens vacíos y plataformas o idiomas desconocidos', async () => {
    expect((await registrar(a(), '   ')).error?.code).toBe('23514')
    expect((await registrar(a(), 'zz-token-x', 'windows' as 'ios')).error?.code).toBe('22P02')
    expect((await registrar(a(), 'zz-token-x', 'ios', 'pt' as 'es')).error?.code).toBe('22P02')
    expect(await fila('zz-token-x')).toEqual([])
  })
})

describe('dispositivos_push: RLS', () => {
  beforeAll(async () => {
    expect((await registrar(a(), T2, 'ios', 'en')).error).toBeNull()
  })

  it('nadie escribe en la tabla a mano: sólo por la función', async () => {
    const alta = await a().from('dispositivos_push').insert({
      token: 'zz-token-a-mano',
      usuario_id: ctx().anonimoA.id,
      plataforma: 'ios',
      idioma: 'es',
    })
    expect(alta.error?.code).toBe('42501')
    // B intenta quedarse con el dispositivo de A cambiando la fila.
    const cambio = await b()
      .from('dispositivos_push')
      .update({ usuario_id: ctx().anonimoB.id })
      .eq('token', T2)
    expect(cambio.error?.code).toBe('42501')
    expect(await fila(T2)).toMatchObject([{ usuario_id: ctx().anonimoA.id }])
  })

  it('B no puede borrar el dispositivo de A; A sí', async () => {
    expect(ok(await b().from('dispositivos_push').delete().eq('token', T2).select())).toEqual([])
    expect(await fila(T2)).toHaveLength(1)
    expect(ok(await a().from('dispositivos_push').delete().eq('token', T2).select())).toHaveLength(
      1,
    )
    expect(await fila(T2)).toEqual([])
  })

  it('sin sesión no se leen ni se borran', async () => {
    const lectura = await anonClient().from('dispositivos_push').select('token')
    expect(lectura.error?.code).toBe('42501')
    const baja = await anonClient().from('dispositivos_push').delete().eq('token', T1)
    expect(baja.error?.code).toBe('42501')
  })

  it('un admin tampoco ve ni borra los dispositivos ajenos', async () => {
    expect(await tokensDe(admin())).toEqual([])
    expect(ok(await admin().from('dispositivos_push').delete().eq('token', T1).select())).toEqual(
      [],
    )
    expect(await fila(T1)).toHaveLength(1)
  })

  it('al borrar un usuario se van sus dispositivos', async () => {
    const service = serviceClient()
    const { data, error } = await service.auth.admin.createUser({
      email: `zz-efimero-push-${Date.now()}@cuerda.test`,
      email_confirm: true,
    })
    expect(error).toBeNull()
    const usuarioId = data.user!.id
    ok(
      await service
        .from('dispositivos_push')
        .insert({
          token: 'zz-token-efimero',
          usuario_id: usuarioId,
          plataforma: 'ios',
          idioma: 'es',
        })
        .select(),
    )
    expect((await service.auth.admin.deleteUser(usuarioId)).error).toBeNull()
    expect(await fila('zz-token-efimero')).toEqual([])
  })
})
