import { norm } from '@cuerda/shared'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, serviceClient } from './clients'
import { admin, expectRechazo, intrusos, lectores, ok } from './helpers'

// Nombres inventados, con el prefijo «zz», para no chocar con los del seed.
const limpiar = async () => {
  const service = serviceClient()
  ok(await service.from('conjuntos').delete().like('slug', 'zz-%').select('id'))
  ok(await service.from('escenarios').delete().like('slug', 'zz-%').select('id'))
}

beforeAll(limpiar)
afterAll(limpiar)

const clavesDeConjunto = async (id: number) =>
  ok(await anonClient().from('conjunto_nombres').select('nombre_norm').eq('conjunto_id', id))
    .map((r) => r.nombre_norm)
    .sort()

const clavesDeEscenario = async (id: number) =>
  ok(await anonClient().from('escenario_nombres').select('nombre_norm').eq('escenario_id', id))
    .map((r) => r.nombre_norm)
    .sort()

describe('conjuntos: un admin, con su propio JWT, crea y edita un conjunto con alias', () => {
  let id: number

  it('lo crea, y la base calcula las columnas normalizadas y las claves', async () => {
    const fila = ok(
      await admin()
        .from('conjuntos')
        .insert({
          slug: 'zz-la-de-prueba',
          nombre: 'Zz La de Prueba',
          alias: ['ZZ LA DE PRUEBA', 'Zz  Pruebá', 'zz lá de prueba'],
          categoria: 'murga',
        })
        .select()
        .single(),
    )
    id = fila.id
    expect(fila.nombre_norm).toBe(norm('Zz La de Prueba'))
    expect(fila.alias_norm).toEqual(['zz la de prueba', 'zz prueba', 'zz la de prueba'])
    // Los alias que normalizan igual que el nombre no generan una clave aparte.
    expect(await clavesDeConjunto(id)).toEqual(['zz la de prueba', 'zz prueba'])
  })

  it('le cambia los alias: la clave que sale queda libre y la nueva queda tomada', async () => {
    const fila = ok(
      await admin()
        .from('conjuntos')
        .update({ alias: ['Zz Otra Forma'] })
        .eq('id', id)
        .select()
        .single(),
    )
    expect(fila.alias_norm).toEqual(['zz otra forma'])
    expect(await clavesDeConjunto(id)).toEqual(['zz la de prueba', 'zz otra forma'])
  })

  it('le cambia el nombre', async () => {
    ok(await admin().from('conjuntos').update({ nombre: 'Zz La Renombrada' }).eq('id', id).select())
    expect(await clavesDeConjunto(id)).toEqual(['zz la renombrada', 'zz otra forma'])
  })

  it('no puede crear otro conjunto cuyo nombre choque con un alias ajeno', async () => {
    const { error } = await admin()
      .from('conjuntos')
      .insert({ slug: 'zz-choque', nombre: 'ZZ OTRA  FORMA', categoria: 'comparsa' })
    expect(error?.code).toBe('23505')
    expect(error?.message).toContain('zz-la-de-prueba')
  })

  it('no puede sumarle a otro conjunto un alias que choque, y ese conjunto queda como estaba', async () => {
    const otro = ok(
      await admin()
        .from('conjuntos')
        .insert({
          slug: 'zz-otro',
          nombre: 'Zz Otro',
          alias: ['Zz El Otro'],
          categoria: 'comparsa',
        })
        .select()
        .single(),
    )
    const { error } = await admin()
      .from('conjuntos')
      .update({ alias: ['Zz El Otro', 'zz la RENOMBRADA'] })
      .eq('id', otro.id)
    expect(error?.code).toBe('23505')
    expect(await clavesDeConjunto(otro.id)).toEqual(['zz el otro', 'zz otro'])
    expect(await clavesDeConjunto(id)).toEqual(['zz la renombrada', 'zz otra forma'])
  })

  it('una clave liberada la puede tomar otro conjunto', async () => {
    const fila = ok(
      await admin()
        .from('conjuntos')
        .insert({ slug: 'zz-heredero', nombre: 'Zz Pruebá', categoria: 'murga' })
        .select()
        .single(),
    )
    expect(await clavesDeConjunto(fila.id)).toEqual(['zz prueba'])
  })

  it('rechaza slugs mal formados, nombres vacíos, alias vacíos y textos vacíos', async () => {
    const base = { slug: 'zz-invalido', nombre: 'Zz Inválido', categoria: 'otro' as const }
    const casos = [
      { ...base, slug: 'Zz Inválido' },
      { ...base, nombre: '   ' },
      { ...base, alias: ['Zz Alias', ' '] },
      { ...base, barrio: '' },
      { ...base, fuente_url: [''] },
    ]
    for (const fila of casos) {
      const { error } = await admin().from('conjuntos').insert(fila)
      expect(error?.code, JSON.stringify(fila)).toBe('23514')
    }
  })

  it('lo anota en una temporada, con en_concurso pendiente', async () => {
    const temporada = ok(
      await anonClient().from('temporadas').select('id').eq('anio', 2027).single(),
    )
    const fila = ok(
      await admin()
        .from('conjunto_temporada')
        .insert({ conjunto_id: id, temporada_id: temporada.id, en_llamadas: true })
        .select()
        .single(),
    )
    expect(fila.en_concurso).toBeNull()
    const repetida = await admin()
      .from('conjunto_temporada')
      .insert({ conjunto_id: id, temporada_id: temporada.id })
    expect(repetida.error?.code).toBe('23505')
  })

  it('lo borra, y con él se van sus claves y su participación', async () => {
    const borradas = ok(await admin().from('conjuntos').delete().eq('id', id).select('id'))
    expect(borradas).toHaveLength(1)
    expect(await clavesDeConjunto(id)).toEqual([])
    const participaciones = ok(
      await anonClient().from('conjunto_temporada').select('conjunto_id').eq('conjunto_id', id),
    )
    expect(participaciones).toEqual([])
  })
})

describe('escenarios: un admin crea y edita un escenario con alias y ubicación', () => {
  let id: number

  it('lo crea', async () => {
    const fila = ok(
      await admin()
        .from('escenarios')
        .insert({
          slug: 'zz-tablado-de-prueba',
          nombre: 'Zz Tablado de Prueba',
          alias: ['ZZ TABLADO'],
          tipo: 'popular',
          direccion: 'Calle Falsa 123',
          ubicacion: 'SRID=4326;POINT(-56.1645 -34.9011)',
          gratis: false,
          itinerante: false,
        })
        .select()
        .single(),
    )
    id = fila.id
    expect(fila.nombre_norm).toBe('zz tablado de prueba')
    expect(fila.activo).toBe(true)
    expect(await clavesDeEscenario(id)).toEqual(['zz tablado', 'zz tablado de prueba'])
  })

  it('un conjunto y un escenario pueden compartir nombre: las claves son por tabla', async () => {
    const fila = ok(
      await admin()
        .from('conjuntos')
        .insert({ slug: 'zz-tablado', nombre: 'Zz Tablado', categoria: 'otro' })
        .select()
        .single(),
    )
    expect(await clavesDeConjunto(fila.id)).toEqual(['zz tablado'])
  })

  it('no puede crear otro escenario con un nombre que choque', async () => {
    const { error } = await admin()
      .from('escenarios')
      .insert({ slug: 'zz-choque', nombre: 'zz  TABLADO' })
    expect(error?.code).toBe('23505')
    expect(error?.message).toContain('zz-tablado-de-prueba')
  })

  it('acepta tipo, gratis, itinerante y ubicación sin dato', async () => {
    const fila = ok(
      await admin()
        .from('escenarios')
        .insert({ slug: 'zz-sin-datos', nombre: 'Zz Sin Datos' })
        .select()
        .single(),
    )
    expect([fila.tipo, fila.gratis, fila.itinerante, fila.ubicacion]).toEqual([
      null,
      null,
      null,
      null,
    ])
  })

  it('lo edita y lo borra', async () => {
    ok(await admin().from('escenarios').update({ alias: [] }).eq('id', id).select())
    expect(await clavesDeEscenario(id)).toEqual(['zz tablado de prueba'])
    ok(await admin().from('escenarios').delete().eq('id', id).select())
    expect(await clavesDeEscenario(id)).toEqual([])
  })
})

describe('conjuntos y escenarios: RLS', () => {
  let conjuntoId: number
  let escenarioId: number
  let temporadaId: number

  beforeAll(async () => {
    const service = serviceClient()
    conjuntoId = ok(
      await service
        .from('conjuntos')
        .insert({ slug: 'zz-rls', nombre: 'Zz Rls', alias: ['Zz Erre'], categoria: 'murga' })
        .select()
        .single(),
    ).id
    escenarioId = ok(
      await service
        .from('escenarios')
        .insert({ slug: 'zz-rls', nombre: 'Zz Rls' })
        .select()
        .single(),
    ).id
    temporadaId = ok(await service.from('temporadas').select('id').eq('anio', 2027).single()).id
    ok(
      await service
        .from('conjunto_temporada')
        .insert({ conjunto_id: conjuntoId, temporada_id: temporadaId })
        .select(),
    )
  })

  it.each(lectores)(
    '%s lee conjuntos, escenarios, participaciones y claves',
    async (_q, cliente) => {
      const db = cliente()
      expect(ok(await db.from('conjuntos').select('slug').eq('id', conjuntoId))).toHaveLength(1)
      expect(ok(await db.from('escenarios').select('slug').eq('id', escenarioId))).toHaveLength(1)
      expect(
        ok(await db.from('conjunto_temporada').select('en_concurso').eq('conjunto_id', conjuntoId)),
      ).toHaveLength(1)
      expect(
        ok(await db.from('conjunto_nombres').select('nombre_norm').eq('conjunto_id', conjuntoId)),
      ).toHaveLength(2)
      expect(
        ok(
          await db.from('escenario_nombres').select('nombre_norm').eq('escenario_id', escenarioId),
        ),
      ).toHaveLength(1)
    },
  )

  it.each(intrusos)('%s no puede escribir en ninguna', async (_q, cliente) => {
    const db = cliente()
    expectRechazo(
      await db
        .from('conjuntos')
        .insert({ slug: 'zz-intruso', nombre: 'Zz Intruso', categoria: 'otro' })
        .select(),
    )
    expectRechazo(
      await db.from('conjuntos').update({ nombre: 'Zz Tomado' }).eq('id', conjuntoId).select(),
    )
    expectRechazo(await db.from('conjuntos').delete().eq('id', conjuntoId).select())

    expectRechazo(
      await db.from('escenarios').insert({ slug: 'zz-intruso', nombre: 'Zz Intruso' }).select(),
    )
    expectRechazo(
      await db.from('escenarios').update({ activo: false }).eq('id', escenarioId).select(),
    )
    expectRechazo(await db.from('escenarios').delete().eq('id', escenarioId).select())

    expectRechazo(
      await db
        .from('conjunto_temporada')
        .update({ en_concurso: true })
        .eq('conjunto_id', conjuntoId)
        .select(),
    )
    expectRechazo(
      await db.from('conjunto_temporada').delete().eq('conjunto_id', conjuntoId).select(),
    )

    const service = serviceClient()
    expect(
      ok(await service.from('conjuntos').select('nombre').eq('id', conjuntoId).single()),
    ).toEqual({ nombre: 'Zz Rls' })
    expect(ok(await service.from('conjuntos').select('id').eq('slug', 'zz-intruso'))).toEqual([])
    expect(
      ok(await service.from('escenarios').select('activo').eq('id', escenarioId).single()),
    ).toEqual({ activo: true })
    expect(ok(await service.from('escenarios').select('id').eq('slug', 'zz-intruso'))).toEqual([])
    expect(
      ok(
        await service
          .from('conjunto_temporada')
          .select('en_concurso')
          .eq('conjunto_id', conjuntoId)
          .single(),
      ),
    ).toEqual({ en_concurso: null })
  })

  it('las tablas de claves no las escribe nadie a mano, tampoco un admin', async () => {
    const db = admin()
    const alta = await db
      .from('conjunto_nombres')
      .insert({ nombre_norm: 'zz a mano', conjunto_id: conjuntoId })
    expect(alta.error?.code).toBe('42501')
    const cambio = await db
      .from('conjunto_nombres')
      .update({ nombre_norm: 'zz a mano' })
      .eq('conjunto_id', conjuntoId)
    expect(cambio.error?.code).toBe('42501')
    const baja = await db.from('escenario_nombres').delete().eq('escenario_id', escenarioId)
    expect(baja.error?.code).toBe('42501')
  })
})
