import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient, withSql, type Db } from './clients'
import { limpiar, ok } from './helpers'

// Una noche lejos de cualquier temporada cargada, y coordenadas de prueba en el Centro.
const NOCHE = '2031-02-10'
const NOCHE_SIGUIENTE = '2031-02-11'
const ORIGEN = { lat: -34.9, lng: -56.165 }
const punto = (lat: number, lng: number) => `SRID=4326;POINT(${lng} ${lat})`

const ids: Record<string, number> = {}

const a = () => userClient(ctx().anonimoA)
const b = () => userClient(ctx().anonimoB)

/** Sólo las filas de prueba, por si la base local tiene otras actuaciones cargadas. */
const dePrueba = <T extends { escenario_slug: string }>(filas: T[]) =>
  filas.filter((f) => f.escenario_slug.startsWith('zz-'))

async function deLaNoche(
  db: Db,
  args: {
    p_solo_gratis?: boolean
    p_solo_favoritos?: boolean
  } = {},
  noche = NOCHE,
) {
  return dePrueba(ok(await db.rpc('actuaciones_de_la_noche', { p_noche: noche, ...args })))
}

async function cercanos(db: Db, radio: number, noche = NOCHE) {
  const filas = ok(
    await db.rpc('escenarios_cercanos', {
      p_lat: ORIGEN.lat,
      p_lng: ORIGEN.lng,
      p_radio_m: radio,
      p_noche: noche,
    }),
  )
  return filas.filter((f) => f.slug.startsWith('zz-'))
}

beforeAll(async () => {
  await limpiar()
  const service = serviceClient()
  const conjuntos = ok(
    await service
      .from('conjuntos')
      .insert([
        { slug: 'zz-uno', nombre: 'Zz Uno', categoria: 'murga' },
        { slug: 'zz-dos', nombre: 'Zz Dos', categoria: 'comparsa' },
        { slug: 'zz-tres', nombre: 'Zz Tres', categoria: 'parodistas' },
      ])
      .select('id, slug'),
  )
  const escenarios = ok(
    await service
      .from('escenarios')
      .insert(
        [
          {
            slug: 'zz-cerca',
            nombre: 'Zz Cerca',
            tipo: 'gratuito',
            direccion: 'Calle Cerca 1',
            barrio: 'Centro',
            ubicacion: punto(-34.9011, -56.1645),
            gratis: true,
            itinerante: false,
          },
          {
            slug: 'zz-lejos',
            nombre: 'Zz Lejos',
            tipo: 'privado',
            direccion: 'Calle Lejos 2',
            ubicacion: punto(-34.85, -56.05),
            precio_texto: '$ 300',
            gratis: false,
            itinerante: false,
          },
          { slug: 'zz-movil', nombre: 'Zz Móvil', tipo: 'movil', gratis: true, itinerante: true },
          { slug: 'zz-sin-punto', nombre: 'Zz Sin Punto', direccion: 'Calle Sin Punto 3' },
          {
            slug: 'zz-inactivo',
            nombre: 'Zz Inactivo',
            ubicacion: punto(-34.9005, -56.1648),
            activo: false,
          },
        ],
        // Las filas no traen las mismas columnas: las que faltan toman su valor por defecto.
        { defaultToNull: false },
      )
      .select('id, slug'),
  )
  for (const fila of [...conjuntos, ...escenarios]) ids[fila.slug] = fila.id

  const etapa = ok(
    await service
      .from('etapas_concurso')
      .insert({
        temporada_id: ok(await service.from('temporadas').select('id').eq('anio', 2027).single())
          .id,
        rueda: 'primera',
        numero: 95,
        fecha: NOCHE,
        fuente: 'test',
      })
      .select('id')
      .single(),
  )

  const actuacion = (escenario: string, conjunto: string, inicio: string, extra: object = {}) => ({
    escenario_id: ids[escenario]!,
    conjunto_id: ids[conjunto]!,
    inicio,
    fuente: 'test',
    ...extra,
  })
  ok(
    await service
      .from('actuaciones')
      .insert(
        [
          // La noche de prueba, cargada en desorden.
          actuacion('zz-sin-punto', 'zz-uno', '2031-02-11T00:40:00-03:00'),
          actuacion('zz-cerca', 'zz-uno', '2031-02-10T21:00:00-03:00', { etapa_id: etapa.id }),
          actuacion('zz-cerca', 'zz-dos', '2031-02-11T05:30:00-03:00', { estado: 'suspendida' }),
          actuacion('zz-movil', 'zz-tres', '2031-02-10T23:15:00-03:00', {
            direccion_texto: 'Plaza de Prueba',
            ubicacion: punto(-34.905, -56.17),
          }),
          actuacion('zz-lejos', 'zz-dos', '2031-02-10T22:30:00-03:00'),
          // La noche anterior (05:59) y la siguiente (06:00 en punto).
          actuacion('zz-cerca', 'zz-tres', '2031-02-10T05:59:00-03:00'),
          actuacion('zz-lejos', 'zz-uno', '2031-02-11T06:00:00-03:00'),
          // La noche siguiente el móvil está lejos, en dos lugares.
          actuacion('zz-movil', 'zz-uno', '2031-02-11T21:00:00-03:00', {
            direccion_texto: 'Plaza Lejana',
            ubicacion: punto(-34.8, -56.0),
          }),
          actuacion('zz-movil', 'zz-dos', '2031-02-11T22:00:00-03:00', {
            direccion_texto: 'Plaza Más Lejana',
            ubicacion: punto(-34.78, -55.98),
          }),
        ],
        { defaultToNull: false },
      )
      .select('id'),
  )

  ok(await a().from('favoritos').insert({ conjunto_id: ids['zz-tres']! }).select())
})

afterAll(limpiar)

describe('actuaciones_de_la_noche', () => {
  it('devuelve la noche ordenada por hora, incluso pasada la medianoche, sin sesión', async () => {
    const filas = await deLaNoche(anonClient())
    expect(
      filas.map((f) => [f.conjunto_slug, f.escenario_slug, new Date(f.inicio).toISOString()]),
    ).toEqual([
      ['zz-uno', 'zz-cerca', '2031-02-11T00:00:00.000Z'], // 21:00
      ['zz-dos', 'zz-lejos', '2031-02-11T01:30:00.000Z'], // 22:30
      ['zz-tres', 'zz-movil', '2031-02-11T02:15:00.000Z'], // 23:15
      ['zz-uno', 'zz-sin-punto', '2031-02-11T03:40:00.000Z'], // 00:40
      ['zz-dos', 'zz-cerca', '2031-02-11T08:30:00.000Z'], // 05:30
    ])
    expect(filas.map((f) => f.estado)).toEqual([
      'programada',
      'programada',
      'programada',
      'programada',
      'suspendida',
    ])
    expect(filas.every((f) => f.es_favorito === false)).toBe(true)
  })

  it('trae los datos del conjunto, del escenario y de la etapa', async () => {
    const [primera] = await deLaNoche(anonClient())
    expect(primera).toMatchObject({
      conjunto_id: ids['zz-uno'],
      conjunto_nombre: 'Zz Uno',
      conjunto_categoria: 'murga',
      escenario_id: ids['zz-cerca'],
      escenario_nombre: 'Zz Cerca',
      escenario_tipo: 'gratuito',
      escenario_barrio: 'Centro',
      direccion: 'Calle Cerca 1',
      gratis: true,
      itinerante: false,
      etapa_rueda: 'primera',
      etapa_numero: 95,
    })
    expect(primera!.lat).toBeCloseTo(-34.9011, 6)
    expect(primera!.lng).toBeCloseTo(-56.1645, 6)
  })

  it('las 05:59 son de la noche anterior y las 06:00 de la siguiente', async () => {
    const anterior = await deLaNoche(anonClient(), {}, '2031-02-09')
    expect(anterior.map((f) => [f.conjunto_slug, f.escenario_slug])).toEqual([
      ['zz-tres', 'zz-cerca'],
    ])
    const siguiente = await deLaNoche(anonClient(), {}, NOCHE_SIGUIENTE)
    expect(siguiente.map((f) => [f.conjunto_slug, f.escenario_slug])).toEqual([
      ['zz-uno', 'zz-lejos'],
      ['zz-uno', 'zz-movil'],
      ['zz-dos', 'zz-movil'],
    ])
  })

  it('devuelve el punto de cada actuación; el itinerante usa el de la actuación', async () => {
    const filas = await deLaNoche(anonClient())
    const de = (escenario: string, conjunto: string) =>
      filas.find((f) => f.escenario_slug === escenario && f.conjunto_slug === conjunto)!
    expect(de('zz-cerca', 'zz-uno').lat).not.toBeNull()
    expect(de('zz-lejos', 'zz-dos').lng).not.toBeNull()
    const movil = de('zz-movil', 'zz-tres')
    expect(movil.direccion).toBe('Plaza de Prueba')
    expect(movil.lat).toBeCloseTo(-34.905, 6)
    expect(movil.lng).toBeCloseTo(-56.17, 6)
    const sinPunto = de('zz-sin-punto', 'zz-uno')
    expect([sinPunto.lat, sinPunto.lng]).toEqual([null, null])
    expect(sinPunto.direccion).toBe('Calle Sin Punto 3')
  })

  it('no recibe la posición del usuario ni devuelve distancias (decisión 90)', async () => {
    const conPosicion = await anonClient().rpc('actuaciones_de_la_noche', {
      p_noche: NOCHE,
      p_lat: ORIGEN.lat,
      p_lng: ORIGEN.lng,
    } as never)
    expect(conPosicion.error).not.toBeNull()

    const filas = await deLaNoche(anonClient())
    expect(filas.length).toBeGreaterThan(0)
    expect(filas.every((f) => !('distancia_m' in f))).toBe(true)
  })

  it('solo_gratis deja sólo los escenarios que se sabe que son gratis', async () => {
    const filas = await deLaNoche(anonClient(), { p_solo_gratis: true })
    expect(filas.map((f) => f.escenario_slug)).toEqual(['zz-cerca', 'zz-movil', 'zz-cerca'])
  })

  it('es_favorito y solo_favoritos salen de la sesión de quien llama', async () => {
    const deA = await deLaNoche(a())
    expect(deA).toHaveLength(5)
    expect(deA.filter((f) => f.es_favorito).map((f) => f.conjunto_slug)).toEqual(['zz-tres'])
    const soloDeA = await deLaNoche(a(), { p_solo_favoritos: true })
    expect(soloDeA.map((f) => [f.conjunto_slug, f.es_favorito])).toEqual([['zz-tres', true]])

    expect((await deLaNoche(b())).some((f) => f.es_favorito)).toBe(false)
    expect(await deLaNoche(b(), { p_solo_favoritos: true })).toEqual([])
    expect(await deLaNoche(anonClient(), { p_solo_favoritos: true })).toEqual([])
  })

  it('los dos filtros se combinan', async () => {
    ok(await b().from('favoritos').insert({ conjunto_id: ids['zz-dos']! }).select())
    const filas = await deLaNoche(b(), { p_solo_gratis: true, p_solo_favoritos: true })
    expect(filas.map((f) => [f.conjunto_slug, f.escenario_slug, f.estado])).toEqual([
      ['zz-dos', 'zz-cerca', 'suspendida'],
    ])
  })

  it('una noche sin actuaciones devuelve vacío', async () => {
    expect(await deLaNoche(anonClient(), {}, '2031-06-01')).toEqual([])
  })
})

describe('mis_favoritos', () => {
  it('devuelve sólo los de quien llama, y nada sin sesión', async () => {
    // A sigue a zz-tres (beforeAll) y B a zz-dos (test anterior): ninguno ve el del otro.
    expect(ok(await a().rpc('mis_favoritos'))).toEqual([ids['zz-tres']])
    expect(ok(await b().rpc('mis_favoritos'))).toEqual([ids['zz-dos']])
    expect(ok(await anonClient().rpc('mis_favoritos'))).toEqual([])
  })

  it('no recibe parámetros: no hay forma de pedir los favoritos de otro usuario', async () => {
    const firmas = await withSql(async (sql) => {
      const { rows } = await sql.query<{ pronargs: number; def: string }>(
        `select p.pronargs, pg_get_functiondef(p.oid) as def
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'mis_favoritos'`,
      )
      return rows
    })
    expect(firmas).toHaveLength(1) // una sola firma, sin sobrecargas
    expect(firmas[0]!.pronargs).toBe(0)
    expect(firmas[0]!.def).toContain('usuario_id = (select auth.uid())')

    // Y por la API: pasarle el id de otro no devuelve nada, falla.
    const idDeA = ctx().anonimoA.id
    for (const args of [{ p_usuario_id: idDeA }, { usuario_id: idDeA }]) {
      const { data, error } = await b().rpc('mis_favoritos', args as never)
      expect(data).toBeNull()
      expect(error?.code).toBe('PGRST202') // PostgREST: no existe una función con esa firma
    }
  })
})

describe('escenarios_cercanos', () => {
  it('devuelve los fijos y los itinerantes de esa noche, del más cercano al más lejano', async () => {
    const filas = await cercanos(anonClient(), 3000)
    expect(filas.map((f) => f.slug)).toEqual(['zz-cerca', 'zz-movil'])
    const [cerca, movil] = filas
    expect(cerca).toMatchObject({
      escenario_id: ids['zz-cerca'],
      nombre: 'Zz Cerca',
      tipo: 'gratuito',
      direccion: 'Calle Cerca 1',
      gratis: true,
      itinerante: false,
    })
    expect(cerca!.lat).toBeCloseTo(-34.9011, 6)
    expect(cerca!.lng).toBeCloseTo(-56.1645, 6)
    expect(cerca!.distancia_m).toBeGreaterThan(100)
    expect(cerca!.distancia_m).toBeLessThan(160)
    expect(movil).toMatchObject({ itinerante: true, direccion: 'Plaza de Prueba' })
    expect(movil!.lat).toBeCloseTo(-34.905, 6)
    expect(movil!.lng).toBeCloseTo(-56.17, 6)
    expect(movil!.distancia_m).toBeGreaterThan(650)
    expect(movil!.distancia_m).toBeLessThan(790)
  })

  it('respeta el radio', async () => {
    expect((await cercanos(anonClient(), 500)).map((f) => f.slug)).toEqual(['zz-cerca'])
    expect((await cercanos(anonClient(), 50)).map((f) => f.slug)).toEqual([])
    expect((await cercanos(anonClient(), 20_000)).map((f) => f.slug)).toEqual([
      'zz-cerca',
      'zz-movil',
      'zz-lejos',
    ])
  })

  it('el itinerante se ubica por la noche pedida: una fila, con su punto más cercano', async () => {
    expect((await cercanos(anonClient(), 3000, NOCHE_SIGUIENTE)).map((f) => f.slug)).toEqual([
      'zz-cerca',
    ])
    const lejos = await cercanos(anonClient(), 30_000, NOCHE_SIGUIENTE)
    expect(lejos.map((f) => f.slug)).toEqual(['zz-cerca', 'zz-lejos', 'zz-movil'])
    expect(lejos[2]).toMatchObject({ direccion: 'Plaza Lejana' })
    // Una noche sin actuaciones: el itinerante no aparece; los fijos sí.
    expect((await cercanos(anonClient(), 30_000, '2031-06-01')).map((f) => f.slug)).toEqual([
      'zz-cerca',
      'zz-lejos',
    ])
  })

  it('no incluye escenarios inactivos ni sin punto', async () => {
    const slugs = (await cercanos(anonClient(), 30_000)).map((f) => f.slug)
    expect(slugs).not.toContain('zz-inactivo')
    expect(slugs).not.toContain('zz-sin-punto')
  })

  it('da lo mismo con la sesión de un usuario anónimo', async () => {
    expect(await cercanos(a(), 3000)).toEqual(await cercanos(anonClient(), 3000))
  })
})
