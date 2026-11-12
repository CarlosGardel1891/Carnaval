import { describe, expect, it } from 'vitest'
import type { Group, StageEntry } from '../../lib/api'
import { searchAll } from './search'

const group = (id: number, nombre: string, claves: string[]): Group => ({
  id,
  slug: `c-${id}`,
  nombre,
  categoria: 'murga',
  barrio: null,
  foto_url: null,
  claves,
  temporadas: [],
})
const stage = (id: number, nombre: string, claves: string[]): StageEntry => ({
  id,
  slug: `e-${id}`,
  nombre,
  tipo: 'popular',
  barrio: null,
  claves,
})

const GROUPS = [
  group(1, 'Agarrate Catalina', ['agarrate catalina', 'la catalina']),
  group(2, 'Cayó la Cabra', ['cayo la cabra']),
  group(3, 'La Gran Muñeca', ['la gran muneca']),
]
const STAGES = [
  stage(1, 'Teatro de Verano', ['teatro de verano', 'ramon collazo']),
  stage(2, 'Velódromo', ['velodromo']),
  stage(3, 'Club Malvín', ['club malvin']),
]

const names = (items: { nombre: string }[]) => items.map((item) => item.nombre)

describe('searchAll', () => {
  it('sin texto no devuelve nada', () => {
    expect(searchAll('  ', GROUPS, STAGES)).toEqual({ groups: [], stages: [] })
  })

  it('encuentra por nombre, sin tildes ni mayúsculas', () => {
    expect(names(searchAll('CAYO', GROUPS, STAGES).groups)).toEqual(['Cayó la Cabra'])
    expect(names(searchAll('velódromo', GROUPS, STAGES).stages)).toEqual(['Velódromo'])
  })

  it('encuentra por alias, conjuntos y escenarios', () => {
    expect(names(searchAll('la catalina', GROUPS, STAGES).groups)).toEqual(['Agarrate Catalina'])
    expect(names(searchAll('collazo', GROUPS, STAGES).stages)).toEqual(['Teatro de Verano'])
  })

  it('un mismo texto puede dar conjuntos y escenarios', () => {
    const results = searchAll('mu', GROUPS, STAGES)
    expect(names(results.groups)).toEqual(['La Gran Muñeca'])
    expect(names(results.stages)).toEqual([])
    expect(names(searchAll('ve', GROUPS, STAGES).stages)).toEqual(['Velódromo', 'Teatro de Verano'])
  })

  it('primero los que empiezan con el texto', () => {
    expect(names(searchAll('la', GROUPS, STAGES).groups)).toEqual([
      'Agarrate Catalina',
      'La Gran Muñeca',
      'Cayó la Cabra',
    ])
  })
})
