import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, serviceClient } from './clients'
import { admin, expectRechazo, intrusos, lectores, limpiar, ok } from './helpers'
import { repoPath } from './research'

let temporadaId: number
let uno: number
let dos: number
let tres: number
let noche1: number
let noche2: number

const ordenDe = async (eventoId: number) =>
  ok(
    await anonClient()
      .from('orden_desfile')
      .select('conjunto_id, posicion')
      .eq('evento_id', eventoId)
      .order('posicion'),
  ).map((f) => [f.posicion, f.conjunto_id])

beforeAll(async () => {
  await limpiar()
  const service = serviceClient()
  temporadaId = ok(await service.from('temporadas').select('id').eq('anio', 2027).single()).id
  const conjuntos = ok(
    await service
      .from('conjuntos')
      .insert([
        { slug: 'zz-comparsa-uno', nombre: 'Zz Comparsa Uno', categoria: 'comparsa' },
        { slug: 'zz-comparsa-dos', nombre: 'Zz Comparsa Dos', categoria: 'comparsa' },
        { slug: 'zz-comparsa-tres', nombre: 'Zz Comparsa Tres', categoria: 'comparsa' },
      ])
      .select('id, slug'),
  )
  uno = conjuntos.find((c) => c.slug === 'zz-comparsa-uno')!.id
  dos = conjuntos.find((c) => c.slug === 'zz-comparsa-dos')!.id
  tres = conjuntos.find((c) => c.slug === 'zz-comparsa-tres')!.id
})

afterAll(limpiar)

describe('eventos y orden de desfile: un admin, con su propio JWT', () => {
  it('carga las dos noches de las Llamadas como dos eventos, con recorrido', async () => {
    const base = {
      temporada_id: temporadaId,
      tipo: 'llamadas' as const,
      lugar: 'Calle de Prueba, de Una a Otra',
      estado: 'confirmado' as const,
      recorrido: 'SRID=4326;LINESTRING(-56.1823 -34.9105, -56.1776 -34.9113, -56.1722 -34.9122)',
      fuente_url: ['https://example.org/llamadas'],
    }
    const eventos = ok(
      await admin()
        .from('eventos')
        .insert([
          {
            ...base,
            slug: 'zz-llamadas-noche-1',
            nombre: 'Zz Llamadas, noche 1',
            fecha_inicio: '2027-02-05',
            fecha_fin: '2027-02-05',
          },
          {
            ...base,
            slug: 'zz-llamadas-noche-2',
            nombre: 'Zz Llamadas, noche 2',
            fecha_inicio: '2027-02-06',
            fecha_fin: '2027-02-06',
          },
        ])
        .select(),
    )
    noche1 = eventos.find((e) => e.slug === 'zz-llamadas-noche-1')!.id
    noche2 = eventos.find((e) => e.slug === 'zz-llamadas-noche-2')!.id
    expect(eventos.every((e) => e.recorrido !== null && e.info === null)).toBe(true)
  })

  it('carga un orden por noche; la misma posición vale en las dos', async () => {
    ok(
      await admin()
        .from('orden_desfile')
        .insert([
          { evento_id: noche1, conjunto_id: uno, posicion: 1 },
          { evento_id: noche1, conjunto_id: dos, posicion: 2 },
          { evento_id: noche2, conjunto_id: tres, posicion: 1 },
        ])
        .select(),
    )
    expect(await ordenDe(noche1)).toEqual([
      [1, uno],
      [2, dos],
    ])
    expect(await ordenDe(noche2)).toEqual([[1, tres]])
  })

  it('no admite dos conjuntos en la misma posición ni un conjunto dos veces la misma noche', async () => {
    const posicion = await admin()
      .from('orden_desfile')
      .insert({ evento_id: noche1, conjunto_id: tres, posicion: 2 })
    expect(posicion.error?.code).toBe('23505')
    const conjunto = await admin()
      .from('orden_desfile')
      .insert({ evento_id: noche1, conjunto_id: uno, posicion: 3 })
    expect(conjunto.error?.code).toBe('23505')
    const cero = await admin()
      .from('orden_desfile')
      .insert({ evento_id: noche1, conjunto_id: tres, posicion: 0 })
    expect(cero.error?.code).toBe('23514')
  })

  it('reordena una noche en una sola sentencia, intercambiando posiciones', async () => {
    ok(
      await admin()
        .from('orden_desfile')
        .upsert(
          [
            { evento_id: noche1, conjunto_id: uno, posicion: 2 },
            { evento_id: noche1, conjunto_id: dos, posicion: 1 },
          ],
          { onConflict: 'evento_id,conjunto_id' },
        )
        .select(),
    )
    expect(await ordenDe(noche1)).toEqual([
      [1, dos],
      [2, uno],
    ])
    expect(await ordenDe(noche2)).toEqual([[1, tres]])
  })

  it('posterga una sola noche: cambia su fecha y su estado, y la otra queda igual', async () => {
    ok(
      await admin()
        .from('eventos')
        .update({ fecha_inicio: '2027-02-12', fecha_fin: '2027-02-12', estado: 'estimado' })
        .eq('id', noche2)
        .select(),
    )
    const eventos = ok(
      await anonClient()
        .from('eventos')
        .select('slug, fecha_inicio, estado')
        .in('id', [noche1, noche2])
        .order('fecha_inicio'),
    )
    expect(eventos).toEqual([
      { slug: 'zz-llamadas-noche-1', fecha_inicio: '2027-02-05', estado: 'confirmado' },
      { slug: 'zz-llamadas-noche-2', fecha_inicio: '2027-02-12', estado: 'estimado' },
    ])
  })

  it('rechaza slugs repetidos o mal formados, fechas al revés y textos vacíos', async () => {
    const base = {
      temporada_id: temporadaId,
      slug: 'zz-invalido',
      tipo: 'otro' as const,
      nombre: 'Zz Inválido',
      fecha_inicio: '2027-02-01',
      fecha_fin: '2027-02-01',
      estado: 'estimado' as const,
    }
    const repetido = await admin()
      .from('eventos')
      .insert({ ...base, slug: 'zz-llamadas-noche-1' })
    expect(repetido.error?.code).toBe('23505')
    for (const fila of [
      { ...base, slug: 'Zz Inválido' },
      { ...base, nombre: '  ' },
      { ...base, fecha_fin: '2027-01-31' },
      { ...base, lugar: '' },
      { ...base, fuente_url: [''] },
    ]) {
      const { error } = await admin().from('eventos').insert(fila)
      expect(error?.code, JSON.stringify(fila)).toBe('23514')
    }
  })

  it('no deja borrar un conjunto que está en un orden de desfile', async () => {
    const { error } = await admin().from('conjuntos').delete().eq('id', uno)
    expect(error?.code).toBe('23503')
  })
})

describe('eventos y orden de desfile: RLS', () => {
  it.each(lectores)('%s lee eventos y órdenes', async (_q, cliente) => {
    const db = cliente()
    expect(ok(await db.from('eventos').select('slug').eq('id', noche1))).toHaveLength(1)
    expect(
      ok(await db.from('orden_desfile').select('posicion').eq('evento_id', noche1)),
    ).toHaveLength(2)
  })

  it.each(intrusos)('%s no puede escribir en ninguna', async (_q, cliente) => {
    const db = cliente()
    expectRechazo(
      await db
        .from('eventos')
        .insert({
          temporada_id: temporadaId,
          slug: 'zz-intruso',
          tipo: 'otro',
          nombre: 'Zz Intruso',
          fecha_inicio: '2027-02-01',
          fecha_fin: '2027-02-01',
          estado: 'estimado',
        })
        .select(),
    )
    expectRechazo(
      await db.from('eventos').update({ nombre: 'Zz Tomado' }).eq('id', noche1).select(),
    )
    expectRechazo(await db.from('eventos').delete().eq('id', noche1).select())
    expectRechazo(
      await db
        .from('orden_desfile')
        .insert({ evento_id: noche2, conjunto_id: uno, posicion: 9 })
        .select(),
    )
    expectRechazo(
      await db.from('orden_desfile').update({ posicion: 8 }).eq('evento_id', noche1).select(),
    )
    expectRechazo(await db.from('orden_desfile').delete().eq('evento_id', noche1).select())

    const service = serviceClient()
    expect(ok(await service.from('eventos').select('nombre').eq('id', noche1).single())).toEqual({
      nombre: 'Zz Llamadas, noche 1',
    })
    expect(ok(await service.from('eventos').select('id').eq('slug', 'zz-intruso'))).toEqual([])
    expect(await ordenDe(noche1)).toEqual([
      [1, dos],
      [2, uno],
    ])
    expect(await ordenDe(noche2)).toEqual([[1, tres]])
  })
})

describe('eventos: venta de entradas', () => {
  const entradas = async () =>
    ok(
      await anonClient()
        .from('eventos')
        .select('entradas_url, entradas_texto')
        .eq('id', noche2)
        .single(),
    )

  it('un evento nace sin venta cargada', async () => {
    expect(await entradas()).toEqual({ entradas_url: null, entradas_texto: null })
  })

  it('un admin la carga cuando se anuncia, y la lee cualquiera', async () => {
    ok(
      await admin()
        .from('eventos')
        .update({
          entradas_url: 'https://example.org/entradas',
          entradas_texto: 'En la boletería, desde tres días antes.',
        })
        .eq('id', noche2)
        .select('id'),
    )
    expect(await entradas()).toEqual({
      entradas_url: 'https://example.org/entradas',
      entradas_texto: 'En la boletería, desde tres días antes.',
    })
  })

  it.each(intrusos)('%s no puede cambiarla', async (_quien, cliente) => {
    expectRechazo(
      await cliente()
        .from('eventos')
        .update({ entradas_url: 'https://example.org/trucha' })
        .eq('id', noche2)
        .select(),
    )
    expect((await entradas()).entradas_url).toBe('https://example.org/entradas')
  })

  it('la dirección tiene que ser una dirección web, y el texto no puede quedar vacío', async () => {
    for (const cambio of [
      { entradas_url: 'abitab' },
      { entradas_url: 'javascript:alert(1)' },
      { entradas_url: '' },
      { entradas_texto: '' },
    ]) {
      const { error } = await admin().from('eventos').update(cambio).eq('id', noche2)
      expect(error?.code).toBe('23514')
    }
  })

  it('el seed no trae venta de entradas: no pisa la que se cargue después', () => {
    const seed = readFileSync(repoPath('supabase', 'seeds', '02_research.sql'), 'utf8')
    expect(seed).not.toMatch(/entradas_/)
  })
})

describe('eventos: baja', () => {
  it('al borrar un evento se va su orden, y el de la otra noche queda', async () => {
    expect(ok(await admin().from('eventos').delete().eq('id', noche1).select())).toHaveLength(1)
    expect(await ordenDe(noche1)).toEqual([])
    expect(await ordenDe(noche2)).toEqual([[1, tres]])
  })
})
