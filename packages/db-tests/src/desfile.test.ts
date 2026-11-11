import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, serviceClient } from './clients'
import { admin, expectRechazo, intrusos, limpiar, ok } from './helpers'

// Los datos del Desfile de Llamadas (decisiones 63 y 64): el orden con su fuente, las
// esquinas del recorrido, los cortes de calle y el horario, todos por evento.

const service = () => serviceClient()
let evento: number
let otroEvento: number
const ids: Record<string, number> = {}

// Tres esquinas sobre un mismo paralelo, separadas por 0,001° de longitud (unos 91 m a esta
// latitud). No son esquinas reales.
const punto = (lng: number) => `SRID=4326;POINT(${lng} -34.911)`
const ESQUINAS = [
  { orden: 1, calle: 'Zz Calle del Desfile', cruce: 'Zz Primera', punto: punto(-56.19) },
  { orden: 2, calle: 'Zz Calle del Desfile', cruce: 'Zz Segunda', punto: punto(-56.189) },
  { orden: 3, calle: 'Zz Otra Calle', cruce: 'Zz Tercera', punto: punto(-56.188) },
]

beforeAll(async () => {
  await limpiar()
  const temporada = ok(await service().from('temporadas').select('id').eq('anio', 2027).single()).id
  const base = {
    temporada_id: temporada,
    tipo: 'llamadas' as const,
    estado: 'confirmado' as const,
    fecha_inicio: '2027-02-05',
    fecha_fin: '2027-02-05',
  }
  const eventos = ok(
    await service()
      .from('eventos')
      .insert([
        { ...base, slug: 'zz-desfile-uno', nombre: 'Zz Desfile, noche 1' },
        { ...base, slug: 'zz-desfile-dos', nombre: 'Zz Desfile, noche 2' },
      ])
      .select('id, slug'),
  )
  evento = eventos.find((e) => e.slug === 'zz-desfile-uno')!.id
  otroEvento = eventos.find((e) => e.slug === 'zz-desfile-dos')!.id
  for (const slug of ['zz-df-uno', 'zz-df-dos', 'zz-df-tres']) {
    ids[slug] = ok(
      await service()
        .from('conjuntos')
        .insert({ slug, nombre: `ZZ ${slug}`, categoria: 'comparsa', barrio: 'Zz Barrio' })
        .select('id')
        .single(),
    ).id
  }
})

afterAll(limpiar)

describe('orden_del_desfile', () => {
  it('sin orden cargado no devuelve nada: todavía no se publicó', async () => {
    expect(ok(await anonClient().rpc('orden_del_desfile', { p_evento_id: evento }))).toEqual([])
  })

  it('devuelve el orden por posición, con la comparsa y la fuente', async () => {
    ok(
      await admin()
        .from('orden_desfile')
        .insert([
          { evento_id: evento, conjunto_id: ids['zz-df-tres']!, posicion: 2, fuente: 'test' },
          { evento_id: evento, conjunto_id: ids['zz-df-uno']!, posicion: 1, fuente: 'test' },
          { evento_id: otroEvento, conjunto_id: ids['zz-df-dos']!, posicion: 1, fuente: 'test' },
        ])
        .select(),
    )
    expect(ok(await anonClient().rpc('orden_del_desfile', { p_evento_id: evento }))).toEqual([
      {
        posicion: 1,
        conjunto_id: ids['zz-df-uno'],
        conjunto_slug: 'zz-df-uno',
        conjunto_nombre: 'ZZ zz-df-uno',
        conjunto_barrio: 'Zz Barrio',
        fuente: 'test',
      },
      expect.objectContaining({ posicion: 2, conjunto_slug: 'zz-df-tres' }),
    ])
    // Cada noche tiene su orden.
    expect(
      ok(await anonClient().rpc('orden_del_desfile', { p_evento_id: otroEvento })).map(
        (o) => o.conjunto_slug,
      ),
    ).toEqual(['zz-df-dos'])
  })

  it('no se puede cargar un orden sin decir de dónde salió', async () => {
    const sinFuente = await service()
      .from('orden_desfile')
      // @ts-expect-error fuente es obligatoria: el tipo también lo exige.
      .insert({ evento_id: otroEvento, conjunto_id: ids['zz-df-uno']!, posicion: 2 })
    expect(sinFuente.error?.code).toBe('23502')
    const vacia = await service()
      .from('orden_desfile')
      .insert({ evento_id: otroEvento, conjunto_id: ids['zz-df-uno']!, posicion: 2, fuente: '' })
    expect(vacia.error?.code).toBe('23514')
  })
})

describe('recorrido_del_desfile', () => {
  it('sin esquinas cargadas no devuelve nada', async () => {
    expect(ok(await anonClient().rpc('recorrido_del_desfile', { p_evento_id: evento }))).toEqual([])
  })

  it('devuelve las esquinas en orden, con su punto y los metros desde la salida', async () => {
    ok(
      await admin()
        .from('desfile_esquinas')
        // Cargadas en desorden.
        .insert(
          [ESQUINAS[2]!, ESQUINAS[0]!, ESQUINAS[1]!].map((e) => ({ ...e, evento_id: evento })),
        )
        .select('orden'),
    )
    const filas = ok(await anonClient().rpc('recorrido_del_desfile', { p_evento_id: evento }))
    expect(filas.map((f) => [f.orden, f.calle, f.cruce])).toEqual([
      [1, 'Zz Calle del Desfile', 'Zz Primera'],
      [2, 'Zz Calle del Desfile', 'Zz Segunda'],
      [3, 'Zz Otra Calle', 'Zz Tercera'],
    ])
    expect(filas[0]).toMatchObject({ lat: -34.911, lng: -56.19, distancia_m: 0 })
    // 0,001° de longitud a 34,9° S son unos 91 metros; la tercera esquina, el doble.
    expect(filas[1]!.distancia_m).toBeGreaterThan(90)
    expect(filas[1]!.distancia_m).toBeLessThan(93)
    expect(filas[2]!.distancia_m).toBeCloseTo(filas[1]!.distancia_m * 2, 0)
  })

  it('el recorrido es de cada evento', async () => {
    expect(
      ok(await anonClient().rpc('recorrido_del_desfile', { p_evento_id: otroEvento })),
    ).toEqual([])
  })

  it('una esquina no se repite en el mismo orden, y necesita sus dos calles', async () => {
    const repetida = await service()
      .from('desfile_esquinas')
      .insert({ ...ESQUINAS[0]!, evento_id: evento })
    expect(repetida.error?.code).toBe('23505')
    const sinCruce = await service()
      .from('desfile_esquinas')
      .insert({ ...ESQUINAS[0]!, orden: 9, cruce: ' ', evento_id: evento })
    expect(sinCruce.error?.code).toBe('23514')
  })
})

describe('cortes_del_desfile', () => {
  it('devuelve los cortes con su tramo como lista de puntos, y los que no tienen tramo', async () => {
    ok(
      await admin()
        .from('cortes_calle')
        .insert(
          [
            {
              evento_id: evento,
              slug: 'zz-corte-uno',
              tipo: 'corte',
              descripcion: 'Zz Calle cortada entre Primera y Tercera',
              tramo: 'SRID=4326;LINESTRING(-56.19 -34.911, -56.189 -34.911, -56.188 -34.911)',
              desde: '2027-02-05T18:00:00-03:00',
              hasta: '2027-02-06T02:00:00-03:00',
              estado: 'estimado',
              fuente_url: ['https://example.org/cortes'],
            },
            {
              evento_id: evento,
              slug: 'zz-sin-estacionar',
              tipo: 'estacionamiento',
              descripcion: 'Zz No estacionar en Segunda',
              estado: 'confirmado',
            },
          ],
          // Las dos filas no traen las mismas columnas: sin esto, las que faltan van en null.
          { defaultToNull: false },
        )
        .select('id'),
    )
    const cortes = ok(await anonClient().rpc('cortes_del_desfile', { p_evento_id: evento }))
    expect(cortes.map((c) => [c.slug, c.tipo, c.estado])).toEqual([
      ['zz-corte-uno', 'corte', 'estimado'],
      ['zz-sin-estacionar', 'estacionamiento', 'confirmado'],
    ])
    expect(cortes[0]).toMatchObject({
      descripcion: 'Zz Calle cortada entre Primera y Tercera',
      fuente_url: ['https://example.org/cortes'],
      puntos: [
        [-56.19, -34.911],
        [-56.189, -34.911],
        [-56.188, -34.911],
      ],
    })
    expect(new Date(cortes[0]!.desde).toISOString()).toBe('2027-02-05T21:00:00.000Z')
    expect(cortes[1]).toMatchObject({ puntos: null, desde: null, hasta: null })
  })

  it('un corte no puede terminar antes de empezar ni repetirse en el evento', async () => {
    const alReves = await service().from('cortes_calle').insert({
      evento_id: evento,
      slug: 'zz-al-reves',
      tipo: 'corte',
      descripcion: 'Zz',
      desde: '2027-02-06T02:00:00-03:00',
      hasta: '2027-02-05T18:00:00-03:00',
      estado: 'estimado',
    })
    expect(alReves.error?.code).toBe('23514')
    const repetido = await service().from('cortes_calle').insert({
      evento_id: evento,
      slug: 'zz-corte-uno',
      tipo: 'corte',
      descripcion: 'Zz otra vez',
      estado: 'estimado',
    })
    expect(repetido.error?.code).toBe('23505')
  })
})

describe('el desfile en el evento', () => {
  const desfile = async () =>
    ok(
      await anonClient()
        .from('eventos')
        .select(
          'desfile_inicio, desfile_intervalo_min, desfile_separacion_m, desfile_atraso_min, recorrido_estado, recorrido_fuente_url',
        )
        .eq('id', evento)
        .single(),
    )

  it('un evento nace sin horario propio, sin atraso y sin recorrido', async () => {
    expect(await desfile()).toEqual({
      desfile_inicio: null,
      desfile_intervalo_min: null,
      desfile_separacion_m: null,
      desfile_atraso_min: 0,
      recorrido_estado: null,
      recorrido_fuente_url: [],
    })
  })

  it('un admin carga el horario, el atraso y el estado del recorrido', async () => {
    ok(
      await admin()
        .from('eventos')
        .update({
          desfile_inicio: '20:30',
          desfile_intervalo_min: 8,
          desfile_separacion_m: 120,
          desfile_atraso_min: 25,
          recorrido_estado: 'estimado',
          recorrido_fuente_url: ['https://example.org/recorrido'],
        })
        .eq('id', evento)
        .select('id'),
    )
    expect(await desfile()).toEqual({
      desfile_inicio: '20:30:00',
      desfile_intervalo_min: 8,
      desfile_separacion_m: 120,
      desfile_atraso_min: 25,
      recorrido_estado: 'estimado',
      recorrido_fuente_url: ['https://example.org/recorrido'],
    })
  })

  it('el intervalo y la separación son positivos, y el atraso no es negativo', async () => {
    for (const cambio of [
      { desfile_intervalo_min: 0 },
      { desfile_separacion_m: -150 },
      { desfile_atraso_min: -5 },
    ]) {
      const { error } = await admin().from('eventos').update(cambio).eq('id', evento)
      expect(error?.code).toBe('23514')
    }
  })
})

describe('permisos de los datos del desfile', () => {
  it.each(intrusos)('%s los lee y no puede tocarlos', async (_quien, cliente) => {
    const db = cliente()
    expect(
      ok(await db.from('desfile_esquinas').select('orden').eq('evento_id', evento)),
    ).toHaveLength(3)
    expect(ok(await db.from('cortes_calle').select('slug').eq('evento_id', evento))).toHaveLength(2)

    expectRechazo(
      await db
        .from('desfile_esquinas')
        .insert({ ...ESQUINAS[0]!, orden: 8, evento_id: evento })
        .select(),
    )
    expectRechazo(
      await db
        .from('desfile_esquinas')
        .update({ cruce: 'Zz Trucha' })
        .eq('evento_id', evento)
        .select(),
    )
    expectRechazo(await db.from('desfile_esquinas').delete().eq('evento_id', evento).select())
    expectRechazo(
      await db
        .from('cortes_calle')
        .insert({
          evento_id: evento,
          slug: 'zz-intruso',
          tipo: 'corte',
          descripcion: 'Zz',
          estado: 'estimado',
        })
        .select(),
    )
    expectRechazo(
      await db
        .from('cortes_calle')
        .update({ descripcion: 'Zz Trucha' })
        .eq('evento_id', evento)
        .select(),
    )
    expectRechazo(await db.from('cortes_calle').delete().eq('evento_id', evento).select())
    expectRechazo(
      await db.from('eventos').update({ desfile_atraso_min: 90 }).eq('id', evento).select(),
    )
  })

  it('al borrar el evento se van sus esquinas, sus cortes y su orden', async () => {
    ok(await admin().from('eventos').delete().eq('id', evento).select())
    expect(
      ok(await service().from('desfile_esquinas').select('orden').eq('evento_id', evento)),
    ).toEqual([])
    expect(ok(await service().from('cortes_calle').select('id').eq('evento_id', evento))).toEqual(
      [],
    )
    expect(
      ok(await service().from('orden_desfile').select('posicion').eq('evento_id', evento)),
    ).toEqual([])
  })
})
