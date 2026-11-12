import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient, withSql } from './clients'
import { admin, ok } from './helpers'

// Estado del sistema (decisión 89): cada tarea programada deja un latido y
// `estado_del_sistema()` dice cuáles están al día.

const TAREAS = ['avisos-de-cambios', 'avisos-del-dia', 'purga-anonimos']
let previas: { tarea: string; ultimo_ok: string; detalle: unknown }[] = []

const borrar = () => withSql((sql) => sql.query(`delete from public.latidos`))

const latido = (tarea: string, detalle: Record<string, unknown> | null = null) =>
  serviceClient().rpc('registrar_latido', { p_tarea: tarea, p_detalle: detalle as never })

const envejecer = (tarea: string, minutos: number) =>
  withSql((sql) =>
    sql.query(
      `update public.latidos set ultimo_ok = now() - make_interval(mins => $2) where tarea = $1`,
      [tarea, minutos],
    ),
  )

const estado = async () =>
  Object.fromEntries(ok(await admin().rpc('estado_del_sistema')).map((fila) => [fila.tarea, fila]))

beforeAll(async () => {
  previas = await withSql(async (sql) => (await sql.query(`select * from public.latidos`)).rows)
  await borrar()
})

afterAll(async () => {
  await borrar()
  await withSql(async (sql) => {
    for (const fila of previas) {
      await sql.query(
        `insert into public.latidos (tarea, ultimo_ok, detalle) values ($1, $2, $3)`,
        [fila.tarea, fila.ultimo_ok, fila.detalle === null ? null : JSON.stringify(fila.detalle)],
      )
    }
  })
})

describe('estado_del_sistema', () => {
  it('sin ningún latido, lista las tres tareas como caídas', async () => {
    await borrar()
    const filas = ok(await admin().rpc('estado_del_sistema'))
    expect(filas.map((f) => f.tarea)).toEqual(TAREAS)
    expect(
      filas.every((f) => f.al_dia === false && f.ultimo_ok === null && f.minutos === null),
    ).toBe(true)
  })

  it('una tarea que acaba de correr está al día, con lo que informó', async () => {
    expect((await latido('avisos-de-cambios', { simulacro: true, avisos: 0 })).error).toBeNull()
    const { 'avisos-de-cambios': fila } = await estado()
    expect(fila).toMatchObject({ al_dia: true, minutos: 0, limite_min: 10 })
    expect(fila!.detalle).toEqual({ simulacro: true, avisos: 0 })
  })

  it('cada tarea tiene su límite: pasado ese tiempo sin latido, está caída', async () => {
    for (const tarea of TAREAS) expect((await latido(tarea)).error).toBeNull()

    await envejecer('avisos-de-cambios', 9)
    await envejecer('avisos-del-dia', 99)
    await envejecer('purga-anonimos', 25 * 60)
    expect(Object.values(await estado()).map((f) => f.al_dia)).toEqual([true, true, true])

    await envejecer('avisos-de-cambios', 11)
    await envejecer('avisos-del-dia', 101)
    await envejecer('purga-anonimos', 27 * 60)
    const caidas = await estado()
    expect(Object.values(caidas).map((f) => f.al_dia)).toEqual([false, false, false])
    expect(caidas['avisos-de-cambios']!.minutos).toBe(11)
  })

  it('un latido nuevo la vuelve a poner al día', async () => {
    await envejecer('avisos-de-cambios', 500)
    expect((await estado())['avisos-de-cambios']!.al_dia).toBe(false)
    expect((await latido('avisos-de-cambios')).error).toBeNull()
    expect((await estado())['avisos-de-cambios']!.al_dia).toBe(true)
  })

  it('lo ven un admin y la service role; los demás no', async () => {
    expect(ok(await serviceClient().rpc('estado_del_sistema'))).toHaveLength(3)
    for (const db of [anonClient(), userClient(ctx().anonimoA), userClient(ctx().falsoAdmin)]) {
      expect((await db.rpc('estado_del_sistema')).error?.code).toBe('42501')
    }
  })

  it('sólo la service role deja un latido, y nadie lee ni escribe la tabla por la API', async () => {
    for (const db of [anonClient(), userClient(ctx().anonimoA), admin()]) {
      expect((await db.rpc('registrar_latido', { p_tarea: 'zz-intruso' })).error).not.toBeNull()
      const lectura = await db.from('latidos').select()
      expect(lectura.error?.code).toBe('42501')
      const alta = await db.from('latidos').insert({ tarea: 'zz-intruso' })
      expect(alta.error?.code).toBe('42501')
    }
    const filas = await withSql(
      async (sql) =>
        (await sql.query(`select 1 from public.latidos where tarea = 'zz-intruso'`)).rows,
    )
    expect(filas).toEqual([])
  })
})
