import { nocheLogica } from '@cuerda/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { serviceClient, withSql } from './clients'
import { admin, expectRechazo, intrusos, lectores, limpiar, ok } from './helpers'

// Bordes de la noche lógica: 05:59 y 06:00 de Montevideo (UTC-3), pasada la medianoche,
// cambio de mes, de año y 29 de febrero.
const instantes = [
  '2027-02-06T08:59:00Z',
  '2027-02-06T08:59:59.999Z',
  '2027-02-06T09:00:00Z',
  '2027-02-06T03:00:00Z',
  '2027-02-06T03:40:00Z',
  '2027-02-06T02:59:59Z',
  '2027-02-05T23:00:00Z',
  '2027-01-01T04:00:00Z',
  '2027-01-01T02:30:00Z',
  '2027-03-01T05:00:00Z',
  '2027-03-08T08:00:00Z',
  '2028-02-29T10:00:00Z',
  '2028-03-01T04:10:00Z',
  '2026-12-31T23:59:00-03:00',
  '2027-01-01T05:59:00-03:00',
  '2027-01-01T06:00:00-03:00',
]

let conjuntoId: number
let otroConjuntoId: number
let escenarioId: number
let temporadaId: number

beforeAll(async () => {
  await limpiar()
  const service = serviceClient()
  const conjuntos = ok(
    await service
      .from('conjuntos')
      .insert([
        { slug: 'zz-actua', nombre: 'Zz Actúa', categoria: 'murga' },
        { slug: 'zz-actua-dos', nombre: 'Zz Actúa Dos', categoria: 'comparsa' },
      ])
      .select('id, slug'),
  )
  conjuntoId = conjuntos.find((c) => c.slug === 'zz-actua')!.id
  otroConjuntoId = conjuntos.find((c) => c.slug === 'zz-actua-dos')!.id
  escenarioId = ok(
    await service
      .from('escenarios')
      .insert({ slug: 'zz-escenario', nombre: 'Zz Escenario' })
      .select('id')
      .single(),
  ).id
  temporadaId = ok(await service.from('temporadas').select('id').eq('anio', 2027).single()).id
})

afterAll(limpiar)

describe('actuaciones.noche es la noche lógica de Montevideo', () => {
  it('coincide con nocheLogica() en los bordes', async () => {
    const service = serviceClient()
    // Un escenario por instante, para que no choque la clave natural.
    const escenarios = ok(
      await service
        .from('escenarios')
        .insert(instantes.map((_, i) => ({ slug: `zz-noche-${i}`, nombre: `Zz Noche ${i}` })))
        .select('id, slug'),
    )
    const idDe = (i: number) => escenarios.find((e) => e.slug === `zz-noche-${i}`)!.id
    const filas = ok(
      await service
        .from('actuaciones')
        .insert(
          instantes.map((inicio, i) => ({
            escenario_id: idDe(i),
            conjunto_id: conjuntoId,
            inicio,
            fuente: 'test',
          })),
        )
        .select('escenario_id, noche'),
    )
    const obtenido = instantes.map((inicio, i) => ({
      inicio,
      noche: filas.find((f) => f.escenario_id === idDe(i))!.noche,
    }))
    const esperado = instantes.map((inicio) => ({ inicio, noche: nocheLogica(new Date(inicio)) }))
    expect(obtenido).toEqual(esperado)

    const noche = (inicio: string) => obtenido.find((o) => o.inicio === inicio)!.noche
    expect(noche('2027-02-06T08:59:00Z')).toBe('2027-02-05') // 05:59: todavía la noche anterior
    expect(noche('2027-02-06T09:00:00Z')).toBe('2027-02-06') // 06:00: ya es la noche nueva
    expect(noche('2027-02-06T03:40:00Z')).toBe('2027-02-05') // 00:40: pasada la medianoche
  })

  it('no depende del TimeZone de la sesión', async () => {
    const noches = await withSql(async (sql) => {
      const salida: string[] = []
      for (const zona of ['Asia/Tokyo', 'America/Los_Angeles', 'UTC']) {
        await sql.query('begin')
        await sql.query(`set local timezone = '${zona}'`)
        const { rows } = await sql.query<{ noche: string }>(
          `insert into public.actuaciones (escenario_id, conjunto_id, inicio, fuente)
           values ($1, $2, '2027-02-06T03:40:00Z', 'test')
           returning noche::text`,
          [escenarioId, otroConjuntoId],
        )
        await sql.query('rollback')
        salida.push(rows[0]!.noche)
      }
      return salida
    })
    expect(noches).toEqual(['2027-02-05', '2027-02-05', '2027-02-05'])
  })
})

describe('actuaciones: clave natural (escenario, conjunto, noche)', () => {
  it('no admite dos actuaciones del mismo conjunto en el mismo escenario la misma noche', async () => {
    const service = serviceClient()
    const primera = ok(
      await service
        .from('actuaciones')
        .insert({
          escenario_id: escenarioId,
          conjunto_id: conjuntoId,
          inicio: '2027-02-10T21:00:00-03:00',
          fuente: 'test',
        })
        .select()
        .single(),
    )
    expect(primera.noche).toBe('2027-02-10')
    expect(primera.estado).toBe('programada')

    // 00:40 del día siguiente: misma noche.
    const repetida = await service.from('actuaciones').insert({
      escenario_id: escenarioId,
      conjunto_id: conjuntoId,
      inicio: '2027-02-11T00:40:00-03:00',
      fuente: 'test',
    })
    expect(repetida.error?.code).toBe('23505')

    // Otra noche, u otro conjunto la misma noche: sí.
    ok(
      await service
        .from('actuaciones')
        .insert([
          {
            escenario_id: escenarioId,
            conjunto_id: conjuntoId,
            inicio: '2027-02-11T21:00:00-03:00',
            fuente: 'test',
          },
          {
            escenario_id: escenarioId,
            conjunto_id: otroConjuntoId,
            inicio: '2027-02-10T22:00:00-03:00',
            fuente: 'test',
          },
        ])
        .select('id'),
    )
  })

  it('reimportar la misma noche actualiza la fila en vez de duplicarla', async () => {
    const service = serviceClient()
    const fila = ok(
      await service
        .from('actuaciones')
        .upsert(
          {
            escenario_id: escenarioId,
            conjunto_id: conjuntoId,
            inicio: '2027-02-11T00:15:00-03:00',
            estado: 'cambiada',
            fuente: 'test',
          },
          { onConflict: 'escenario_id,conjunto_id,noche' },
        )
        .select()
        .single(),
    )
    expect(fila.noche).toBe('2027-02-10')
    expect(fila.estado).toBe('cambiada')
    expect(new Date(fila.inicio).toISOString()).toBe('2027-02-11T03:15:00.000Z')
    expect(new Date(fila.actualizado_en).getTime()).toBeGreaterThan(
      new Date(fila.creado_en).getTime(),
    )
    const deEsaNoche = ok(
      await service
        .from('actuaciones')
        .select('id')
        .match({ escenario_id: escenarioId, conjunto_id: conjuntoId, noche: '2027-02-10' }),
    )
    expect(deEsaNoche).toHaveLength(1)
  })

  it('no deja borrar un conjunto ni un escenario que tienen actuaciones', async () => {
    const service = serviceClient()
    const conjunto = await service.from('conjuntos').delete().eq('id', conjuntoId)
    expect(conjunto.error?.code).toBe('23503')
    const escenario = await service.from('escenarios').delete().eq('id', escenarioId)
    expect(escenario.error?.code).toBe('23503')
  })

  it('rechaza textos vacíos', async () => {
    const base = {
      escenario_id: escenarioId,
      conjunto_id: otroConjuntoId,
      inicio: '2027-02-20T21:00:00-03:00',
      fuente: 'test',
    }
    for (const fila of [
      { ...base, fuente: '' },
      { ...base, direccion_texto: '' },
      { ...base, fuente_url: '' },
    ]) {
      const { error } = await serviceClient().from('actuaciones').insert(fila)
      expect(error?.code, JSON.stringify(fila)).toBe('23514')
    }
  })
})

describe('etapas del Concurso', () => {
  it('una etapa por (temporada, rueda, número); al borrarla, la actuación queda sin etapa', async () => {
    const service = serviceClient()
    const etapa = ok(
      await service
        .from('etapas_concurso')
        .insert({
          temporada_id: temporadaId,
          rueda: 'primera',
          numero: 90,
          fecha: '2027-02-12',
          fuente: 'test',
        })
        .select()
        .single(),
    )
    const repetida = await service.from('etapas_concurso').insert({
      temporada_id: temporadaId,
      rueda: 'primera',
      numero: 90,
      fecha: '2027-02-13',
      fuente: 'test',
    })
    expect(repetida.error?.code).toBe('23505')
    // Mismo número en otra rueda: sí.
    ok(
      await service
        .from('etapas_concurso')
        .insert({
          temporada_id: temporadaId,
          rueda: 'segunda',
          numero: 90,
          fecha: '2027-02-25',
          fuente: 'test',
        })
        .select(),
    )

    const actuacion = ok(
      await service
        .from('actuaciones')
        .insert({
          escenario_id: escenarioId,
          conjunto_id: conjuntoId,
          inicio: '2027-02-12T21:30:00-03:00',
          etapa_id: etapa.id,
          fuente: 'test',
        })
        .select()
        .single(),
    )
    expect(actuacion.etapa_id).toBe(etapa.id)
    ok(await service.from('etapas_concurso').delete().eq('id', etapa.id).select())
    const despues = ok(
      await service.from('actuaciones').select('etapa_id').eq('id', actuacion.id).single(),
    )
    expect(despues.etapa_id).toBeNull()
  })
})

describe('actuaciones y etapas: RLS', () => {
  let actuacionId: number
  let etapaId: number

  beforeAll(async () => {
    const service = serviceClient()
    actuacionId = ok(
      await service
        .from('actuaciones')
        .insert({
          escenario_id: escenarioId,
          conjunto_id: otroConjuntoId,
          inicio: '2027-02-15T21:00:00-03:00',
          fuente: 'test',
        })
        .select('id')
        .single(),
    ).id
    etapaId = ok(
      await service
        .from('etapas_concurso')
        .insert({
          temporada_id: temporadaId,
          rueda: 'liguilla',
          numero: 91,
          fecha: '2027-03-02',
          fuente: 'test',
        })
        .select('id')
        .single(),
    ).id
  })

  it.each(lectores)('%s lee actuaciones y etapas', async (_q, cliente) => {
    const db = cliente()
    expect(ok(await db.from('actuaciones').select('noche').eq('id', actuacionId))).toEqual([
      { noche: '2027-02-15' },
    ])
    expect(ok(await db.from('etapas_concurso').select('numero').eq('id', etapaId))).toEqual([
      { numero: 91 },
    ])
  })

  it.each(intrusos)('%s no puede escribir en ninguna', async (_q, cliente) => {
    const db = cliente()
    expectRechazo(
      await db
        .from('actuaciones')
        .insert({
          escenario_id: escenarioId,
          conjunto_id: otroConjuntoId,
          inicio: '2027-02-16T21:00:00-03:00',
          fuente: 'intruso',
        })
        .select(),
    )
    expectRechazo(
      await db.from('actuaciones').update({ estado: 'suspendida' }).eq('id', actuacionId).select(),
    )
    expectRechazo(await db.from('actuaciones').delete().eq('id', actuacionId).select())
    expectRechazo(
      await db
        .from('etapas_concurso')
        .insert({
          temporada_id: temporadaId,
          rueda: 'liguilla',
          numero: 92,
          fecha: '2027-03-03',
          fuente: 'test',
        })
        .select(),
    )
    expectRechazo(
      await db.from('etapas_concurso').update({ fecha: '2027-03-04' }).eq('id', etapaId).select(),
    )
    expectRechazo(await db.from('etapas_concurso').delete().eq('id', etapaId).select())

    const service = serviceClient()
    expect(
      ok(await service.from('actuaciones').select('estado').eq('id', actuacionId).single()),
    ).toEqual({ estado: 'programada' })
    expect(ok(await service.from('actuaciones').select('id').eq('fuente', 'intruso'))).toEqual([])
    expect(
      ok(await service.from('etapas_concurso').select('fecha').eq('id', etapaId).single()),
    ).toEqual({ fecha: '2027-03-02' })
    expect(ok(await service.from('etapas_concurso').select('id').eq('numero', 92))).toEqual([])
  })

  it('un admin, con su propio JWT, carga una etapa y una actuación, la suspende y la borra', async () => {
    const db = admin()
    const etapa = ok(
      await db
        .from('etapas_concurso')
        .insert({
          temporada_id: temporadaId,
          rueda: 'primera',
          numero: 93,
          fecha: '2027-02-17',
          fuente: 'test',
        })
        .select()
        .single(),
    )
    const actuacion = ok(
      await db
        .from('actuaciones')
        .insert({
          escenario_id: escenarioId,
          conjunto_id: otroConjuntoId,
          inicio: '2027-02-17T22:15:00-03:00',
          etapa_id: etapa.id,
          direccion_texto: 'Plaza de Prueba',
          ubicacion: 'SRID=4326;POINT(-56.19 -34.905)',
          fuente: 'test',
        })
        .select()
        .single(),
    )
    expect(actuacion.noche).toBe('2027-02-17')
    const suspendida = ok(
      await db
        .from('actuaciones')
        .update({ estado: 'suspendida' })
        .eq('id', actuacion.id)
        .select()
        .single(),
    )
    expect(suspendida.estado).toBe('suspendida')
    expect(ok(await db.from('actuaciones').delete().eq('id', actuacion.id).select())).toHaveLength(
      1,
    )
    expect(ok(await db.from('etapas_concurso').delete().eq('id', etapa.id).select())).toHaveLength(
      1,
    )
  })
})
