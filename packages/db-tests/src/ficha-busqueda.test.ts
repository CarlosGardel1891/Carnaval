import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient } from './clients'
import { limpiar, ok } from './helpers'

const ids: Record<string, number> = {}

beforeAll(async () => {
  await limpiar()
  const service = serviceClient()
  const conjuntos = ok(
    await service
      .from('conjuntos')
      .insert([
        {
          slug: 'zz-ficha',
          nombre: 'Zz Los de la Ficha',
          alias: ['ZZ FICHA', 'Zz Fichá y Cía.'],
          categoria: 'murga',
        },
        { slug: 'zz-otra', nombre: 'Zz Otra', alias: [], categoria: 'comparsa' },
        { slug: 'zz-homonimo', nombre: 'Zz Homónimo', alias: [], categoria: 'otro' },
      ])
      .select('id, slug'),
  )
  const escenarios = ok(
    await service
      .from('escenarios')
      .insert(
        [
          {
            slug: 'zz-club',
            nombre: 'Zz Club de Prueba',
            alias: ['ZZ CLUB'],
            direccion: 'Calle del Club 10',
            ubicacion: 'SRID=4326;POINT(-56.16 -34.9)',
            gratis: false,
          },
          { slug: 'zz-rodante', nombre: 'Zz Rodante', itinerante: true },
          { slug: 'zz-homonimo', nombre: 'ZZ HOMONIMO' },
        ],
        { defaultToNull: false },
      )
      .select('id, slug'),
  )
  for (const c of conjuntos) ids[`c:${c.slug}`] = c.id
  for (const e of escenarios) ids[`e:${e.slug}`] = e.id

  const actuacion = (escenario: string, conjunto: string, inicio: string, extra: object = {}) => ({
    escenario_id: ids[`e:${escenario}`]!,
    conjunto_id: ids[`c:${conjunto}`]!,
    inicio,
    fuente: 'test',
    ...extra,
  })
  ok(
    await service
      .from('actuaciones')
      .insert(
        [
          actuacion('zz-club', 'zz-ficha', '2031-03-04T21:00:00-03:00'), // noche anterior
          actuacion('zz-rodante', 'zz-ficha', '2031-03-06T00:40:00-03:00', {
            direccion_texto: 'Esquina de Prueba',
            ubicacion: 'SRID=4326;POINT(-56.2 -34.88)',
          }), // noche del 5, pasada la medianoche
          actuacion('zz-club', 'zz-ficha', '2031-03-05T21:30:00-03:00'), // noche del 5
          actuacion('zz-club', 'zz-ficha', '2031-03-07T22:00:00-03:00', { estado: 'suspendida' }),
          actuacion('zz-club', 'zz-otra', '2031-03-05T20:00:00-03:00'), // de otro conjunto
        ],
        { defaultToNull: false },
      )
      .select('id'),
  )
})

afterAll(limpiar)

describe('proximas_de_conjunto', () => {
  const proximas = async (noche: string, conjunto = 'zz-ficha') =>
    ok(
      await anonClient().rpc('proximas_de_conjunto', {
        p_conjunto_id: ids[`c:${conjunto}`]!,
        p_noche: noche,
      }),
    )

  it('devuelve desde esa noche en adelante, por hora, sin las de otros conjuntos', async () => {
    const filas = await proximas('2031-03-05')
    expect(filas.map((f) => [f.noche, f.escenario_slug, f.estado])).toEqual([
      ['2031-03-05', 'zz-club', 'programada'],
      ['2031-03-05', 'zz-rodante', 'programada'],
      ['2031-03-07', 'zz-club', 'suspendida'],
    ])
  })

  it('trae la dirección y el punto de la actuación o, si no tiene, los del escenario', async () => {
    const [club, rodante] = await proximas('2031-03-05')
    expect(club).toMatchObject({
      escenario_id: ids['e:zz-club'],
      escenario_nombre: 'Zz Club de Prueba',
      direccion: 'Calle del Club 10',
      gratis: false,
    })
    expect(club!.lat).toBeCloseTo(-34.9, 6)
    expect(club!.lng).toBeCloseTo(-56.16, 6)
    expect(rodante).toMatchObject({ direccion: 'Esquina de Prueba', itinerante: true })
    expect(rodante!.lat).toBeCloseTo(-34.88, 6)
    expect(rodante!.lng).toBeCloseTo(-56.2, 6)
  })

  it('la noche pedida cuenta; las anteriores no', async () => {
    expect(await proximas('2031-03-04')).toHaveLength(4)
    expect(await proximas('2031-03-06')).toHaveLength(1)
    expect(await proximas('2031-03-08')).toEqual([])
  })

  it('devuelve vacío para un conjunto sin actuaciones o que no existe', async () => {
    expect(await proximas('2031-03-01', 'zz-homonimo')).toEqual([])
    const { data, error } = await anonClient().rpc('proximas_de_conjunto', {
      p_conjunto_id: -1,
      p_noche: '2031-03-01',
    })
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe('buscar_por_nombre', () => {
  const buscar = async (texto: string) =>
    ok(await anonClient().rpc('buscar_por_nombre', { p_texto: texto }))

  it('encuentra un conjunto por su nombre, sin importar mayúsculas, tildes ni espacios', async () => {
    const esperado = [
      { tipo: 'conjunto', id: ids['c:zz-ficha'], slug: 'zz-ficha', nombre: 'Zz Los de la Ficha' },
    ]
    expect(await buscar('Zz Los de la Ficha')).toEqual(esperado)
    expect(await buscar('  ZZ  LOS DE LA   FÍCHA ')).toEqual(esperado)
  })

  it('lo encuentra por cualquiera de sus alias', async () => {
    expect((await buscar('zz ficha')).map((f) => f.slug)).toEqual(['zz-ficha'])
    expect((await buscar('ZZ FICHA Y CIA.')).map((f) => f.slug)).toEqual(['zz-ficha'])
  })

  it('encuentra un escenario por nombre o alias', async () => {
    expect(await buscar('zz club')).toEqual([
      { tipo: 'escenario', id: ids['e:zz-club'], slug: 'zz-club', nombre: 'Zz Club de Prueba' },
    ])
  })

  it('si un conjunto y un escenario se llaman igual, devuelve los dos', async () => {
    const filas = await buscar('zz homonimo')
    expect(filas.map((f) => [f.tipo, f.id]).sort()).toEqual([
      ['conjunto', ids['c:zz-homonimo']],
      ['escenario', ids['e:zz-homonimo']],
    ])
  })

  it('es exacto: no busca por parte del nombre', async () => {
    expect(await buscar('zz los de la')).toEqual([])
    expect(await buscar('zz')).toEqual([])
  })

  it('devuelve vacío con texto vacío o sólo espacios', async () => {
    expect(await buscar('')).toEqual([])
    expect(await buscar('   ')).toEqual([])
  })

  it('da lo mismo con la sesión de un usuario anónimo', async () => {
    const { data, error } = await userClient(ctx().anonimoA).rpc('buscar_por_nombre', {
      p_texto: 'ZZ CLUB',
    })
    expect(error).toBeNull()
    expect(data?.map((f) => f.slug)).toEqual(['zz-club'])
  })
})
