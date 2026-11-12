import type { Json } from '@cuerda/shared'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { anonClient, serviceClient } from './clients'
import { admin, expectRechazo, intrusos, limpiar, ok } from './helpers'

// Cargar el desfile de Llamadas desde el panel: el orden y el recorrido se reemplazan enteros.

let eventoId: number
let uno: number
let dos: number
let tres: number

const order = async () =>
  ok(await anonClient().rpc('orden_del_desfile', { p_evento_id: eventoId })).map((row) => [
    row.posicion,
    row.conjunto_id,
    row.fuente,
  ])

const route = async () =>
  ok(await anonClient().rpc('recorrido_del_desfile', { p_evento_id: eventoId })).map((row) => [
    row.orden,
    row.calle,
    row.cruce,
  ])

const CORNERS = [
  { calle: 'Isla de Flores', cruce: 'Zelmar Michelini', lat: -34.9101, lng: -56.1905 },
  { calle: 'Isla de Flores', cruce: 'Ejido', lat: -34.9104, lng: -56.1872 },
  { calle: 'Isla de Flores', cruce: 'Minas', lat: -34.9111, lng: -56.1795 },
]

beforeEach(async () => {
  await limpiar()
  const service = serviceClient()
  const temporada = ok(await service.from('temporadas').select('id').eq('anio', 2027).single())
  eventoId = ok(
    await service
      .from('eventos')
      .insert({
        temporada_id: temporada.id,
        slug: 'zz-desfile',
        tipo: 'llamadas',
        nombre: 'Zz Desfile',
        fecha_inicio: '2027-02-05',
        fecha_fin: '2027-02-05',
        estado: 'confirmado',
      })
      .select('id')
      .single(),
  ).id
  const groups = ok(
    await service
      .from('conjuntos')
      .insert(
        ['uno', 'dos', 'tres'].map((k) => ({
          slug: `zz-desfile-${k}`,
          nombre: `Zz Desfile ${k}`,
          categoria: 'comparsa' as const,
        })),
      )
      .select('id, slug'),
  )
  const id = (k: string) => groups.find((g) => g.slug === `zz-desfile-${k}`)!.id
  uno = id('uno')
  dos = id('dos')
  tres = id('tres')
})

afterAll(limpiar)

describe('reemplazar_orden_desfile', () => {
  const replace = (conjuntos: number[], fuente = 'IM') =>
    admin().rpc('reemplazar_orden_desfile', {
      p_evento_id: eventoId,
      p_conjuntos: conjuntos,
      p_fuente: fuente,
      p_fuente_url: 'https://example.com/orden',
    })

  it('carga el orden en el orden de la lista, con su fuente', async () => {
    expect(ok(await replace([dos, uno, tres]))).toBe(3)
    expect(await order()).toEqual([
      [1, dos, 'IM'],
      [2, uno, 'IM'],
      [3, tres, 'IM'],
    ])
  })

  it('reemplaza el orden anterior entero, también si cambian las posiciones', async () => {
    ok(await replace([dos, uno, tres]))
    expect(ok(await replace([uno, dos], 'IM, corregido'))).toBe(2)
    expect(await order()).toEqual([
      [1, uno, 'IM, corregido'],
      [2, dos, 'IM, corregido'],
    ])
  })

  it('una lista vacía borra el orden', async () => {
    ok(await replace([uno, dos]))
    expect(ok(await replace([], ''))).toBe(0)
    expect(await order()).toEqual([])
  })

  it('es todo o nada: con un conjunto repetido o que no existe queda el orden anterior', async () => {
    ok(await replace([uno, dos]))
    const repeated = await replace([tres, tres])
    expect(repeated.error?.message).toMatch(/dos veces en el orden/)
    const missing = await replace([tres, 2_000_000_000])
    expect(missing.error?.code).toBe('23503')
    expect((await order()).map((row) => row[1])).toEqual([uno, dos])
  })

  it('pide la fuente y rechaza la de los datos de prueba', async () => {
    expect((await replace([uno], '  ')).error?.message).toMatch(/Falta la fuente/)
    expect((await replace([uno], 'orden-ficticio')).error?.message).toMatch(/reservada/)
    expect(await order()).toEqual([])
  })

  it.each(intrusos)('%s no puede cargarlo', async (_nombre, cliente) => {
    const res = await cliente().rpc('reemplazar_orden_desfile', {
      p_evento_id: eventoId,
      p_conjuntos: [uno],
      p_fuente: 'IM',
    })
    expect(res.error?.code).toBe('42501')
    expect(await order()).toEqual([])
  })
})

describe('reemplazar_recorrido', () => {
  const replace = (corners: unknown[], estado: 'estimado' | 'confirmado' = 'confirmado') =>
    admin().rpc('reemplazar_recorrido', {
      p_evento_id: eventoId,
      p_esquinas: corners as Json,
      p_estado: estado,
      p_fuente_url: ['https://example.com/recorrido'],
    })

  const event = async () =>
    ok(
      await serviceClient()
        .from('eventos')
        .select('recorrido_estado, recorrido_fuente_url')
        .eq('id', eventoId)
        .single(),
    )

  it('carga las esquinas en orden y marca el recorrido con su estado y su fuente', async () => {
    expect(ok(await replace(CORNERS))).toBe(3)
    expect(await route()).toEqual([
      [1, 'Isla de Flores', 'Zelmar Michelini'],
      [2, 'Isla de Flores', 'Ejido'],
      [3, 'Isla de Flores', 'Minas'],
    ])
    expect(await event()).toEqual({
      recorrido_estado: 'confirmado',
      recorrido_fuente_url: ['https://example.com/recorrido'],
    })
    const rows = ok(await anonClient().rpc('recorrido_del_desfile', { p_evento_id: eventoId }))
    expect(rows[0]!.lat).toBeCloseTo(-34.9101, 6)
    expect(rows[0]!.distancia_m).toBe(0)
    expect(rows[2]!.distancia_m).toBeGreaterThan(900)
  })

  it('reemplaza el recorrido anterior entero', async () => {
    ok(await replace(CORNERS))
    ok(await replace(CORNERS.slice(1), 'estimado'))
    expect(await route()).toEqual([
      [1, 'Isla de Flores', 'Ejido'],
      [2, 'Isla de Flores', 'Minas'],
    ])
    expect((await event()).recorrido_estado).toBe('estimado')
  })

  it('una lista vacía borra el recorrido y su estado', async () => {
    ok(await replace(CORNERS))
    expect(ok(await replace([]))).toBe(0)
    expect(await route()).toEqual([])
    expect(await event()).toEqual({ recorrido_estado: null, recorrido_fuente_url: [] })
  })

  it('es todo o nada: una esquina sin punto o sin nombre deja el recorrido anterior', async () => {
    ok(await replace(CORNERS))
    const noPoint = await replace([CORNERS[0], { calle: 'Isla de Flores', cruce: 'Ejido' }])
    expect(noPoint.error?.message).toMatch(/sin un punto válido/)
    const noName = await replace([CORNERS[0], { ...CORNERS[1], cruce: ' ' }])
    expect(noName.error?.code).toBe('23514')
    const single = await replace([CORNERS[0]])
    expect(single.error?.message).toMatch(/por lo menos dos esquinas/)
    expect(await route()).toHaveLength(3)
  })

  it.each(intrusos)('%s no puede cargarlo', async (_nombre, cliente) => {
    const res = await cliente().rpc('reemplazar_recorrido', {
      p_evento_id: eventoId,
      p_esquinas: CORNERS as unknown as Json,
      p_estado: 'confirmado',
    })
    expect(res.error?.code).toBe('42501')
    expect(await route()).toEqual([])
  })
})

describe('horario, atraso y cortes: por la API, con la RLS', () => {
  it('un admin corre el atraso del desfile', async () => {
    ok(
      await admin()
        .from('eventos')
        .update({ desfile_atraso_min: 40, desfile_inicio: '20:30' })
        .eq('id', eventoId)
        .select('id'),
    )
    const row = ok(
      await anonClient()
        .from('eventos')
        .select('desfile_atraso_min, desfile_inicio')
        .eq('id', eventoId)
        .single(),
    )
    expect(row).toEqual({ desfile_atraso_min: 40, desfile_inicio: '20:30:00' })
  })

  it.each(intrusos)('%s no puede tocar el atraso ni los cortes', async (_nombre, cliente) => {
    expectRechazo(
      await cliente()
        .from('eventos')
        .update({ desfile_atraso_min: 90 })
        .eq('id', eventoId)
        .select('id'),
    )
    const alta = await cliente()
      .from('cortes_calle')
      .insert({
        evento_id: eventoId,
        slug: 'zz-corte',
        tipo: 'corte',
        descripcion: 'Zz corte',
        estado: 'estimado',
      })
      .select('id')
    expect(alta.error?.code).toBe('42501')
  })

  it('un admin carga un corte con su tramo', async () => {
    ok(
      await admin()
        .from('cortes_calle')
        .insert({
          evento_id: eventoId,
          slug: 'zz-corte',
          tipo: 'corte',
          descripcion: 'Isla de Flores entre Ejido y Minas',
          tramo: 'SRID=4326;LINESTRING(-56.1872 -34.9104, -56.1795 -34.9111)',
          desde: '2027-02-05T18:00:00-03:00',
          hasta: '2027-02-06T02:00:00-03:00',
          estado: 'confirmado',
          fuente_url: ['https://example.com/cortes'],
        })
        .select('id'),
    )
    const [corte] = ok(await anonClient().rpc('cortes_del_desfile', { p_evento_id: eventoId }))
    expect(corte).toMatchObject({ slug: 'zz-corte', estado: 'confirmado' })
    expect(corte!.puntos).toEqual([
      [-56.1872, -34.9104],
      [-56.1795, -34.9111],
    ])
  })
})
