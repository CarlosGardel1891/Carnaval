import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient, withSql } from './clients'
import { admin, expectRechazo, limpiar, ok } from './helpers'

// El fixture del Concurso Oficial (decisión 57): etapas con su fuente y la consulta que lo arma.
// Usa una temporada propia, de 2031, para no depender de si hay un fixture cargado en 2027.

const ANIO = 2031
const service = () => serviceClient()
const ids: Record<string, number> = {}
let temporadaId: number

const fixture = async (anio = ANIO, db = anonClient()) =>
  ok(await db.rpc('fixture_del_concurso', { p_anio: anio }))

const borrarTemporada = () =>
  withSql(async (sql) => {
    await sql.query(
      `delete from public.actuaciones where etapa_id in (
         select e.id from public.etapas_concurso e
           join public.temporadas t on t.id = e.temporada_id where t.anio = $1)`,
      [ANIO],
    )
    await sql.query(
      `delete from public.etapas_concurso where temporada_id in (
         select id from public.temporadas where anio = $1)`,
      [ANIO],
    )
    await sql.query(`delete from public.temporadas where anio = $1`, [ANIO])
  })

beforeAll(async () => {
  await limpiar()
  await borrarTemporada()

  temporadaId = ok(
    await service()
      .from('temporadas')
      .insert({ anio: ANIO, fecha_inicio: '2031-01-23', fecha_fin: '2031-03-09' })
      .select('id')
      .single(),
  ).id
  for (const slug of ['zz-fx-uno', 'zz-fx-dos', 'zz-fx-tres']) {
    ids[slug] = ok(
      await service()
        .from('conjuntos')
        .insert({
          slug,
          nombre: `ZZ ${slug}`,
          categoria: slug === 'zz-fx-tres' ? 'parodistas' : 'murga',
        })
        .select('id')
        .single(),
    ).id
  }
  ids.teatro = ok(
    await service()
      .from('escenarios')
      .insert({ slug: 'zz-fx-teatro', nombre: 'ZZ Teatro de Prueba', tipo: 'teatro_verano' })
      .select('id')
      .single(),
  ).id

  const etapa = async (rueda: 'primera' | 'segunda' | 'liguilla', numero: number, fecha: string) =>
    ok(
      await service()
        .from('etapas_concurso')
        .insert({
          temporada_id: temporadaId,
          rueda,
          numero,
          fecha,
          fuente: 'test',
          fuente_url: 'https://example.org/fixture',
        })
        .select('id')
        .single(),
    ).id
  // Cargadas en desorden: la consulta las ordena por rueda y número.
  ids.liguilla1 = await etapa('liguilla', 1, '2031-03-01')
  ids.segunda1 = await etapa('segunda', 1, '2031-02-15')
  ids.primera2 = await etapa('primera', 2, '2031-01-28')
  ids.primera1 = await etapa('primera', 1, '2031-01-27')

  const actuacion = (etapa: string, conjunto: string, inicio: string, estado?: 'suspendida') => ({
    escenario_id: ids.teatro!,
    conjunto_id: ids[conjunto]!,
    etapa_id: ids[etapa]!,
    inicio,
    fuente: 'test',
    ...(estado ? { estado } : {}),
  })
  ok(
    await service()
      .from('actuaciones')
      .insert(
        [
          // Primera rueda, etapa 1: tres conjuntos; el último pasada la medianoche.
          actuacion('primera1', 'zz-fx-dos', '2031-01-27T22:15:00-03:00'),
          actuacion('primera1', 'zz-fx-tres', '2031-01-28T00:10:00-03:00'),
          actuacion('primera1', 'zz-fx-uno', '2031-01-27T21:00:00-03:00'),
          // Etapa 2: uno solo, suspendido.
          actuacion('primera2', 'zz-fx-uno', '2031-01-28T21:00:00-03:00', 'suspendida'),
          // Segunda rueda: dos. La liguilla queda sin conjuntos cargados.
          actuacion('segunda1', 'zz-fx-tres', '2031-02-15T21:00:00-03:00'),
          actuacion('segunda1', 'zz-fx-dos', '2031-02-15T22:15:00-03:00'),
        ],
        { defaultToNull: false },
      )
      .select('id'),
  )
})

afterAll(async () => {
  await borrarTemporada()
  await limpiar()
})

describe('fixture_del_concurso', () => {
  it('devuelve las ruedas en orden, cada una con sus noches', async () => {
    const filas = await fixture()
    const noches = [...new Map(filas.map((f) => [f.etapa_id, f])).values()]
    expect(noches.map((f) => [f.rueda, f.numero, f.fecha])).toEqual([
      ['primera', 1, '2031-01-27'],
      ['primera', 2, '2031-01-28'],
      ['segunda', 1, '2031-02-15'],
      ['liguilla', 1, '2031-03-01'],
    ])
  })

  it('cada noche trae sus conjuntos por hora, también los de pasada la medianoche', async () => {
    const filas = await fixture()
    const deLaNoche = (etapa: number) =>
      filas
        .filter((f) => f.etapa_id === etapa)
        .map((f) => [f.conjunto_slug, new Date(f.inicio).toISOString()])
    expect(deLaNoche(ids.primera1!)).toEqual([
      ['zz-fx-uno', '2031-01-28T00:00:00.000Z'], // 21:00
      ['zz-fx-dos', '2031-01-28T01:15:00.000Z'], // 22:15
      ['zz-fx-tres', '2031-01-28T03:10:00.000Z'], // 00:10 del día siguiente
    ])
    expect(deLaNoche(ids.segunda1!)).toEqual([
      ['zz-fx-tres', '2031-02-16T00:00:00.000Z'],
      ['zz-fx-dos', '2031-02-16T01:15:00.000Z'],
    ])
  })

  it('cada fila lleva lo que la pantalla muestra del conjunto, y el estado', async () => {
    const filas = await fixture()
    expect(filas.find((f) => f.conjunto_slug === 'zz-fx-tres')).toMatchObject({
      rueda: 'primera',
      numero: 1,
      fuente: 'test',
      conjunto_id: ids['zz-fx-tres'],
      conjunto_nombre: 'ZZ zz-fx-tres',
      conjunto_categoria: 'parodistas',
      estado: 'programada',
    })
    expect(filas.find((f) => f.etapa_id === ids.primera2)).toMatchObject({
      conjunto_slug: 'zz-fx-uno',
      estado: 'suspendida',
    })
  })

  it('una etapa sin conjuntos cargados sale igual, con una sola fila sin actuación', async () => {
    const filas = (await fixture()).filter((f) => f.etapa_id === ids.liguilla1)
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({
      rueda: 'liguilla',
      fecha: '2031-03-01',
      actuacion_id: null,
      inicio: null,
      conjunto_slug: null,
    })
  })

  it('un año sin fixture no devuelve nada', async () => {
    expect(await fixture(2032)).toEqual([])
  })

  it('cada año tiene su fixture', async () => {
    const filas = await fixture()
    expect(new Set(filas.map((f) => f.fecha.slice(0, 4)))).toEqual(new Set(['2031']))
    const otro = await fixture(2027)
    expect(otro.some((f) => f.etapa_id === ids.primera1)).toBe(false)
  })

  it('lo lee cualquiera: sin sesión, un usuario anónimo y un admin ven lo mismo', async () => {
    const base = await fixture()
    for (const db of [userClient(ctx().anonimoA), admin()]) {
      expect(await fixture(ANIO, db)).toEqual(base)
    }
  })
})

describe('etapas_concurso: fuente', () => {
  it('no se puede cargar una etapa sin decir de dónde salió', async () => {
    const { error } = await service()
      .from('etapas_concurso')
      // @ts-expect-error fuente es obligatoria: el tipo también lo exige.
      .insert({ temporada_id: temporadaId, rueda: 'primera', numero: 95, fecha: '2031-02-01' })
    expect(error?.code).toBe('23502')
  })

  it('ni con una fuente vacía', async () => {
    const vacia = await service().from('etapas_concurso').insert({
      temporada_id: temporadaId,
      rueda: 'primera',
      numero: 95,
      fecha: '2031-02-01',
      fuente: '',
    })
    expect(vacia.error?.code).toBe('23514')
    const urlVacia = await service().from('etapas_concurso').insert({
      temporada_id: temporadaId,
      rueda: 'primera',
      numero: 95,
      fecha: '2031-02-01',
      fuente: 'test',
      fuente_url: '',
    })
    expect(urlVacia.error?.code).toBe('23514')
  })

  it('la fuente se lee sin sesión, y sólo un admin la cambia', async () => {
    const leida = ok(
      await anonClient()
        .from('etapas_concurso')
        .select('fuente, fuente_url')
        .eq('id', ids.primera1!)
        .single(),
    )
    expect(leida).toEqual({ fuente: 'test', fuente_url: 'https://example.org/fixture' })

    expectRechazo(
      await userClient(ctx().anonimoA)
        .from('etapas_concurso')
        .update({ fuente: 'cambiada' })
        .eq('id', ids.primera1!)
        .select(),
    )
    ok(
      await admin()
        .from('etapas_concurso')
        .update({ fuente: 'test-admin' })
        .eq('id', ids.primera1!)
        .select(),
    )
    expect((await fixture()).find((f) => f.etapa_id === ids.primera1)?.fuente).toBe('test-admin')
  })
})
