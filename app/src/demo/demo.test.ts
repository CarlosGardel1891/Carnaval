import { nocheLogica } from '@cuerda/shared'
import { describe, expect, it } from 'vitest'
import type { Group } from '../lib/api'
import fixtureData from './data/fixture.json'
import nightData from './data/night.json'
import orderData from './data/order.json'
import {
  buildDemoFixture,
  buildDemoNight,
  buildDemoOrder,
  buildDemoUpcoming,
  DEMO_NIGHT,
  type DemoCatalog,
  type DemoStage,
} from './demo'

const group = (id: number, slug: string, nombre: string): Group => ({
  id,
  slug,
  nombre,
  categoria: 'murga',
  barrio: 'Barrio de prueba',
  foto_url: null,
  claves: [],
  temporadas: [],
})

const stage = (id: number, slug: string, extra: Partial<DemoStage> = {}): DemoStage => ({
  id,
  slug,
  nombre: `Escenario ${slug}`,
  tipo: 'popular',
  barrio: null,
  direccion: 'Dirección del catálogo',
  gratis: false,
  precio_texto: null,
  itinerante: false,
  ...extra,
})

/** Un catálogo con todos los conjuntos y escenarios que nombran los datos de ejemplo. */
function fullCatalog(): DemoCatalog {
  const groupSlugs = [
    ...new Set([
      ...nightData.map((row) => row.conjunto_slug),
      ...orderData.map((row) => row.conjunto_slug),
      ...fixtureData.map((row) => row.conjunto_slug),
    ]),
  ]
  const stageSlugs = [...new Set(nightData.map((row) => row.escenario_slug))]
  return {
    groups: groupSlugs.map((slug, index) => group(index + 1, slug, `Conjunto ${slug}`)),
    stages: stageSlugs.map((slug, index) =>
      stage(index + 1, slug, {
        itinerante: slug === 'barrio-a-barrio',
        gratis: slug === 'barrio-a-barrio',
      }),
    ),
    coords: new Map(stageSlugs.map((_, index) => [index + 1, { lat: -34.9, lng: -56.17 }])),
  }
}

const NOBODY = new Set<number>()

describe('la noche de ejemplo', () => {
  it('trae la cartelera entera, sin ids de la base', () => {
    const acts = buildDemoNight('2026-12-01', fullCatalog(), NOBODY)
    expect(acts).toHaveLength(nightData.length)
    expect(acts.every((act) => act.actuacion_id < 0)).toBe(true)
    expect(new Set(acts.map((act) => act.actuacion_id)).size).toBe(acts.length)
  })

  it('en su propia fecha deja las horas como están', () => {
    const acts = buildDemoNight(DEMO_NIGHT, fullCatalog(), NOBODY)
    expect(acts.map((act) => Date.parse(act.inicio))).toEqual(
      nightData.map((row) => Date.parse(row.inicio)),
    )
  })

  it('corrida a otra noche, cada actuación queda a la misma hora y es de esa noche', () => {
    const noche = '2026-12-01'
    const acts = buildDemoNight(noche, fullCatalog(), NOBODY)
    acts.forEach((act, index) => {
      const original = new Date(nightData[index]!.inicio)
      const moved = new Date(act.inicio)
      expect([moved.getUTCHours(), moved.getUTCMinutes()]).toEqual([
        original.getUTCHours(),
        original.getUTCMinutes(),
      ])
      // También las de pasada la medianoche siguen siendo de esa noche lógica.
      expect(nocheLogica(moved)).toBe(noche)
    })
  })

  it('toma el conjunto y el escenario del catálogo real', () => {
    const catalog = fullCatalog()
    const [first] = buildDemoNight('2026-12-01', catalog, NOBODY)
    const row = nightData[0]!
    const expectedGroup = catalog.groups.find((g) => g.slug === row.conjunto_slug)!
    const expectedStage = catalog.stages.find((s) => s.slug === row.escenario_slug)!
    expect(first).toMatchObject({
      conjunto_id: expectedGroup.id,
      conjunto_nombre: expectedGroup.nombre,
      escenario_id: expectedStage.id,
      escenario_nombre: expectedStage.nombre,
      direccion: row.direccion,
      distancia_m: null,
    })
  })

  it('no muestra lo que no está en el catálogo', () => {
    const catalog = fullCatalog()
    const missingGroup = nightData[0]!.conjunto_slug
    const missingStage = nightData.find((row) => row.conjunto_slug !== missingGroup)!.escenario_slug
    const acts = buildDemoNight(
      '2026-12-01',
      {
        ...catalog,
        groups: catalog.groups.filter((g) => g.slug !== missingGroup),
        stages: catalog.stages.filter((s) => s.slug !== missingStage),
      },
      NOBODY,
    )
    expect(acts.length).toBeLessThan(nightData.length)
    expect(acts.some((act) => act.conjunto_slug === missingGroup)).toBe(false)
    expect(acts.some((act) => act.escenario_slug === missingStage)).toBe(false)
    expect(
      buildDemoNight('2026-12-01', { groups: [], stages: [], coords: new Map() }, NOBODY),
    ).toEqual([])
  })

  it('un escenario fijo lleva su punto y la parada de un itinerante no', () => {
    const acts = buildDemoNight('2026-12-01', fullCatalog(), NOBODY)
    const fixed = acts.find((act) => !act.itinerante)!
    const mobile = acts.find((act) => act.itinerante)!
    expect([fixed.lat, fixed.lng]).toEqual([-34.9, -56.17])
    expect([mobile.lat, mobile.lng]).toEqual([null, null])
  })

  it('sin punto cargado en el catálogo, queda sin ubicación', () => {
    const acts = buildDemoNight('2026-12-01', { ...fullCatalog(), coords: new Map() }, NOBODY)
    expect(acts.every((act) => act.lat === null && act.lng === null)).toBe(true)
  })

  it('marca los seguidos y filtra «mis conjuntos» y «gratis»', () => {
    const catalog = fullCatalog()
    const followedId = catalog.groups.find((g) => g.slug === nightData[0]!.conjunto_slug)!.id
    const followed = new Set([followedId])

    const all = buildDemoNight('2026-12-01', catalog, followed)
    expect(
      all.filter((act) => act.es_favorito).every((act) => act.conjunto_id === followedId),
    ).toBe(true)
    expect(all.some((act) => act.es_favorito)).toBe(true)

    const mine = buildDemoNight('2026-12-01', catalog, followed, { onlyFollowed: true })
    expect(mine.length).toBeGreaterThan(0)
    expect(mine.every((act) => act.conjunto_id === followedId)).toBe(true)
    expect(buildDemoNight('2026-12-01', catalog, NOBODY, { onlyFollowed: true })).toEqual([])

    const free = buildDemoNight('2026-12-01', catalog, NOBODY, { onlyFree: true })
    expect(free.length).toBeGreaterThan(0)
    expect(free.every((act) => act.gratis === true)).toBe(true)
  })

  it('lo que le queda a un conjunto sale de la misma noche', () => {
    const catalog = fullCatalog()
    const target = catalog.groups.find((g) => g.slug === nightData[0]!.conjunto_slug)!
    const upcoming = buildDemoUpcoming(target.id, '2026-12-01', catalog)
    expect(upcoming).toHaveLength(
      nightData.filter((row) => row.conjunto_slug === target.slug).length,
    )
    expect(upcoming.every((act) => act.noche === '2026-12-01')).toBe(true)
    expect(buildDemoUpcoming(-1, '2026-12-01', catalog)).toEqual([])
  })
})

describe('el orden de desfile de ejemplo', () => {
  it('trae cada noche por el slug de su evento, marcado como de prueba', () => {
    const { groups } = fullCatalog()
    const slugs = [...new Set(orderData.map((row) => row.evento_slug))]
    expect(slugs.length).toBe(2)
    for (const slug of slugs) {
      const order = buildDemoOrder(slug, groups)
      expect(order).toHaveLength(orderData.filter((row) => row.evento_slug === slug).length)
      expect(order.map((slot) => slot.posicion)).toEqual(order.map((_, index) => index + 1))
      expect(order.every((slot) => slot.fuente === 'orden-ficticio')).toBe(true)
    }
  })

  it('para otro evento no trae nada', () => {
    expect(buildDemoOrder('desfile-inaugural-2027', fullCatalog().groups)).toEqual([])
  })
})

describe('el fixture de ejemplo', () => {
  it('trae todas las filas, marcadas como de prueba y agrupadas por etapa', () => {
    const rows = buildDemoFixture(fullCatalog().groups)
    expect(rows).toHaveLength(fixtureData.length)
    expect(rows.every((row) => row.fuente === 'fixture-ficticio')).toBe(true)
    expect(rows.every((row) => row.etapa_id < 0)).toBe(true)
    const stages = new Set(fixtureData.map((row) => `${row.rueda}-${row.numero}`))
    expect(new Set(rows.map((row) => row.etapa_id)).size).toBe(stages.size)
  })

  it('no muestra los conjuntos que no están en el catálogo', () => {
    expect(buildDemoFixture([])).toEqual([])
  })
})
