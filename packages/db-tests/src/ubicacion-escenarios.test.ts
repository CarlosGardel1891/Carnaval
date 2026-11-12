import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, serviceClient } from './clients'
import { admin, expectRechazo, intrusos, limpiar, ok } from './helpers'

// Cargar la ubicación de un escenario desde el panel (decisión 74): se guarda por la API con
// la sesión del admin, y desde ahí el escenario entra en «cerca mío».

const LAT = -34.9059
const LNG = -56.1852
const NOCHE = '2031-05-10'

let stageId: number

const located = async () => {
  const rows = ok(await admin().rpc('escenarios_con_ubicacion'))
  return rows.find((row) => row.id === stageId)!
}

const nearby = async () =>
  ok(
    await anonClient().rpc('escenarios_cercanos', {
      p_lat: LAT,
      p_lng: LNG,
      p_radio_m: 500,
      p_noche: NOCHE,
    }),
  ).filter((row) => row.escenario_id === stageId)

beforeAll(async () => {
  await limpiar()
  stageId = ok(
    await serviceClient()
      .from('escenarios')
      .insert({ slug: 'zz-ubicacion', nombre: 'Zz Ubicación', tipo: 'popular', itinerante: false })
      .select('id')
      .single(),
  ).id
})

afterAll(limpiar)

describe('ubicación de un escenario', () => {
  it('sin ubicación no tiene coordenadas ni aparece cerca', async () => {
    expect(await located()).toMatchObject({ slug: 'zz-ubicacion', lat: null, lng: null })
    expect(await nearby()).toEqual([])
  })

  it.each(intrusos)('%s no puede cargarla', async (_nombre, cliente) => {
    expectRechazo(
      await cliente()
        .from('escenarios')
        .update({ ubicacion: `SRID=4326;POINT(${LNG} ${LAT})` })
        .eq('id', stageId)
        .select('id'),
    )
    expect(await located()).toMatchObject({ lat: null, lng: null })
  })

  it('un admin la carga y el escenario aparece en «cerca mío»', async () => {
    ok(
      await admin()
        .from('escenarios')
        .update({ ubicacion: `SRID=4326;POINT(${LNG} ${LAT})` })
        .eq('id', stageId)
        .select('id'),
    )
    const row = await located()
    expect(row.lat).toBeCloseTo(LAT, 6)
    expect(row.lng).toBeCloseTo(LNG, 6)

    const [close] = await nearby()
    expect(close).toBeDefined()
    expect(close!.distancia_m).toBeLessThan(1)
  })

  it('un admin la puede quitar', async () => {
    ok(await admin().from('escenarios').update({ ubicacion: null }).eq('id', stageId).select('id'))
    expect(await located()).toMatchObject({ lat: null, lng: null })
    expect(await nearby()).toEqual([])
  })

  it.each(intrusos.slice(0, 1))(
    '%s no puede listar los escenarios del panel',
    async (_n, cliente) => {
      const res = await cliente().rpc('escenarios_con_ubicacion')
      expect(res.error?.code).toBe('42501')
    },
  )
})
