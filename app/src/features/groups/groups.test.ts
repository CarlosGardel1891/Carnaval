import { describe, expect, it } from 'vitest'
import type { Group } from '../../lib/api'
import { groupCategories, listGroups, seasonOf } from './groups'

const SEASON = 7

function group(overrides: Partial<Group> & Pick<Group, 'id' | 'nombre' | 'claves'>): Group {
  return {
    slug: `conjunto-${overrides.id}`,
    categoria: 'murga',
    barrio: null,
    foto_url: null,
    temporadas: [{ temporada_id: SEASON, en_concurso: true, en_llamadas: false }],
    ...overrides,
  }
}

const GROUPS: Group[] = [
  group({ id: 1, nombre: 'Doña Bastarda', claves: ['dona bastarda'] }),
  group({
    id: 2,
    nombre: 'Yambo Kenia',
    claves: ['yambo kenia', 'yambo'],
    categoria: 'comparsa',
    temporadas: [{ temporada_id: SEASON, en_concurso: null, en_llamadas: true }],
  }),
  // En el catálogo, pero sin participación en la temporada vigente.
  group({
    id: 3,
    nombre: 'Curtidores de Hongos',
    claves: ['curtidores de hongos'],
    temporadas: [{ temporada_id: 6, en_concurso: true, en_llamadas: false }],
  }),
  group({ id: 4, nombre: 'LOS BUBY´S', claves: ['los buby s'], categoria: 'parodistas' }),
]

const names = (groups: Group[]) => groups.map((g) => g.nombre)
const list = (
  text: string,
  categories: Group['categoria'][] = [],
  seasonId: number | null = SEASON,
) => names(listGroups(GROUPS, { text, categories, seasonId }))

describe('listGroups', () => {
  it('sin texto lista sólo los de la temporada vigente', () => {
    expect(list('')).toEqual(['Doña Bastarda', 'Yambo Kenia', 'LOS BUBY´S'])
  })

  it('sin temporada conocida lista todo el catálogo', () => {
    expect(list('', [], null)).toHaveLength(4)
  })

  it('encuentra el texto escrito dentro del nombre, sin tildes ni mayúsculas', () => {
    expect(list('BASTAR')).toEqual(['Doña Bastarda'])
    expect(list('doña')).toEqual(['Doña Bastarda'])
    expect(list('  dona   bas ')).toEqual(['Doña Bastarda'])
  })

  it('busca también en los alias', () => {
    expect(list('yambo')).toEqual(['Yambo Kenia'])
  })

  it('con texto busca en todo el catálogo, también fuera de la temporada', () => {
    expect(list('hongos')).toEqual(['Curtidores de Hongos'])
  })

  it('no tolera errores de tipeo', () => {
    expect(list('bastrada')).toEqual([])
    expect(list('yanbo')).toEqual([])
  })

  it('normaliza igual que la base («LOS BUBY´S» es «los buby s»)', () => {
    expect(list('buby´s')).toEqual(['LOS BUBY´S'])
  })

  it('un texto de sólo espacios cuenta como vacío', () => {
    expect(list('   ')).toEqual(list(''))
  })

  it('filtra por categoría, sola o junto con el texto', () => {
    expect(list('', ['comparsa'])).toEqual(['Yambo Kenia'])
    expect(list('', ['comparsa', 'parodistas'])).toEqual(['Yambo Kenia', 'LOS BUBY´S'])
    expect(list('yambo', ['murga'])).toEqual([])
  })
})

describe('seasonOf', () => {
  it('devuelve la participación en esa temporada, o null', () => {
    expect(seasonOf(GROUPS[1]!, SEASON)).toEqual({
      temporada_id: SEASON,
      en_concurso: null,
      en_llamadas: true,
    })
    expect(seasonOf(GROUPS[2]!, SEASON)).toBeNull()
    expect(seasonOf(GROUPS[0]!, null)).toBeNull()
  })
})

describe('groupCategories', () => {
  it('junta las categorías presentes', () => {
    expect([...groupCategories(GROUPS)].sort()).toEqual(['comparsa', 'murga', 'parodistas'])
  })
})
