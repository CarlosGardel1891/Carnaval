import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient, withSql } from './clients'
import { admin, expectRechazo, limpiar, ok } from './helpers'

// Ubicaciones propuestas (decisión 87): lo que devuelve el geocodificador queda aparte, y no
// llega a la app hasta que un admin lo confirma guardando el escenario.

const NOCHE = '2032-03-01'
const PUNTO = { lat: -34.9011, lng: -56.1645 }
let fijo = 0
let otro = 0

const propuesta = (escenarioId: number) => ({
  escenario_id: escenarioId,
  ...PUNTO,
  consulta: 'Calle de Prueba 123, Montevideo, Uruguay',
  resultado: '123, Calle de Prueba, Centro, Montevideo, 11000, Uruguay',
  fuente: 'openstreetmap',
})

const propuestasDe = async (id: number) =>
  ok(await serviceClient().from('ubicaciones_propuestas').select().eq('escenario_id', id))

async function proponer(id: number) {
  expect(
    (await serviceClient().from('ubicaciones_propuestas').upsert(propuesta(id))).error,
  ).toBeNull()
}

beforeAll(async () => {
  await limpiar()
  const filas = ok(
    await serviceClient()
      .from('escenarios')
      .insert([
        { slug: 'zz-prop-fijo', nombre: 'ZZ Propuesta Fijo', direccion: 'Calle de Prueba 123' },
        { slug: 'zz-prop-otro', nombre: 'ZZ Propuesta Otro', direccion: 'Calle de Prueba 456' },
      ])
      .select('id, slug'),
  )
  fijo = filas.find((f) => f.slug === 'zz-prop-fijo')!.id
  otro = filas.find((f) => f.slug === 'zz-prop-otro')!.id
})

afterAll(limpiar)

describe('ubicaciones_propuestas', () => {
  it('una propuesta no es la ubicación del escenario: la app no la ve', async () => {
    await proponer(fijo)

    const cercanos = ok(
      await anonClient().rpc('escenarios_cercanos', {
        p_lat: PUNTO.lat,
        p_lng: PUNTO.lng,
        p_radio_m: 100_000,
        p_noche: NOCHE,
      }),
    )
    expect(cercanos.some((e) => e.slug === 'zz-prop-fijo')).toBe(false)
    const panel = ok(await admin().rpc('escenarios_con_ubicacion'))
    const fila = panel.find((e) => e.slug === 'zz-prop-fijo')!
    expect([fila.lat, fila.lng]).toEqual([null, null])
  })

  it('sólo un admin la lee', async () => {
    await proponer(fijo)
    expect(
      ok(await admin().from('ubicaciones_propuestas').select().eq('escenario_id', fijo)),
    ).toHaveLength(1)

    for (const db of [anonClient(), userClient(ctx().anonimoA), userClient(ctx().falsoAdmin)]) {
      const res = await db.from('ubicaciones_propuestas').select().eq('escenario_id', fijo)
      if (res.error) expect(res.error.code).toBe('42501')
      else expect(res.data).toEqual([])
    }
  })

  it('nadie la carga ni la cambia por la API, tampoco un admin: la carga el script', async () => {
    for (const db of [anonClient(), userClient(ctx().anonimoA), admin()]) {
      const alta = await db.from('ubicaciones_propuestas').insert(propuesta(otro)).select()
      expect(alta.error?.code).toBe('42501')
      const cambio = await db
        .from('ubicaciones_propuestas')
        .update({ lat: 0 })
        .eq('escenario_id', fijo)
        .select()
      expect(cambio.error?.code).toBe('42501')
    }
    expect(await propuestasDe(otro)).toEqual([])
  })

  it('un admin la descarta; los demás no', async () => {
    await proponer(fijo)
    for (const db of [anonClient(), userClient(ctx().anonimoA), userClient(ctx().falsoAdmin)]) {
      expectRechazo(
        await db.from('ubicaciones_propuestas').delete().eq('escenario_id', fijo).select(),
      )
    }
    expect(await propuestasDe(fijo)).toHaveLength(1)

    ok(await admin().from('ubicaciones_propuestas').delete().eq('escenario_id', fijo).select())
    expect(await propuestasDe(fijo)).toEqual([])
  })

  it('al guardar la ubicación del escenario, la propuesta se va sola', async () => {
    await proponer(fijo)
    await proponer(otro)

    const res = await admin()
      .from('escenarios')
      .update({ ubicacion: `SRID=4326;POINT(${PUNTO.lng} ${PUNTO.lat})` })
      .eq('id', fijo)
      .select('id')
    expect(ok(res)).toHaveLength(1)

    expect(await propuestasDe(fijo)).toEqual([])
    // La de otro escenario sigue, y cambiar otra cosa de ese escenario no la toca.
    ok(await admin().from('escenarios').update({ barrio: 'Centro' }).eq('id', otro).select('id'))
    expect(await propuestasDe(otro)).toHaveLength(1)
    const panel = ok(await admin().rpc('escenarios_con_ubicacion'))
    const fila = panel.find((e) => e.slug === 'zz-prop-fijo')!
    expect(fila.lat).toBeCloseTo(PUNTO.lat, 6)
    expect(fila.lng).toBeCloseTo(PUNTO.lng, 6)
  })

  it('se va con el escenario', async () => {
    await proponer(otro)
    await withSql((sql) => sql.query(`delete from public.escenarios where id = $1`, [otro]))
    expect(await propuestasDe(otro)).toEqual([])
  })

  it('rechaza coordenadas imposibles', async () => {
    const res = await serviceClient()
      .from('ubicaciones_propuestas')
      .upsert({ ...propuesta(fijo), lat: 120 })
    expect(res.error).not.toBeNull()
  })
})
