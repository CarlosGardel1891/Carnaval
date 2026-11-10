import { describe, expect, it } from 'vitest'
import { at, makeAct, nightFixture } from '../../test-fixtures'
import {
  categoriesPresent,
  countStagesWithoutLocation,
  filterByCategories,
  groupByStage,
  onStageNow,
  sortByDistance,
  sortByFirstStart,
} from './board'

const names = (acts: { conjunto_nombre: string }[]) => acts.map((a) => a.conjunto_nombre)

describe('groupByStage', () => {
  it('arma un grupo por escenario, con sus actuaciones por hora', () => {
    const groups = groupByStage(nightFixture())
    expect(groups.map((g) => g.nombre)).toEqual([
      'Tablado Centro',
      'Escenario Prado',
      'Escenario Móvil',
      'Club Unión',
    ])
    const centro = groups[0]
    // 00:40 es de la misma noche y va al final, no al principio.
    expect(names(centro?.acts ?? [])).toEqual([
      'Agarrate Catalina',
      'Doña Bastarda',
      'Valores de Ansina',
    ])
  })

  it('las suspendidas y las cambiadas siguen en su grupo', () => {
    const prado = groupByStage(nightFixture()).find((g) => g.slug === 'ficticio-prado')
    expect(prado?.acts.map((a) => a.estado)).toEqual(['programada', 'suspendida', 'programada'])
  })

  it('un itinerante no tiene dirección de grupo: cada parada lleva la suya', () => {
    const movil = groupByStage(nightFixture()).find((g) => g.slug === 'ficticio-movil')
    expect(movil?.itinerante).toBe(true)
    expect(movil?.direccion).toBeNull()
    expect(movil?.acts.map((a) => a.direccion)).toEqual([
      'Esquina ficticia 1',
      'Esquina ficticia 2',
    ])
  })

  it('la distancia del grupo es la de su parada más cercana', () => {
    const groups = groupByStage([
      makeAct({ escenario_id: 3, itinerante: true, distancia_m: 900 }),
      makeAct({ escenario_id: 3, itinerante: true, distancia_m: 400 }),
    ])
    expect(groups[0]?.distancia_m).toBe(400)
  })
})

describe('orden de los escenarios', () => {
  it('por defecto: el que arranca antes y, a igual hora, por nombre', () => {
    const sorted = sortByFirstStart(groupByStage(nightFixture()))
    expect(sorted.map((g) => g.nombre)).toEqual([
      'Escenario Prado',
      'Tablado Centro',
      'Escenario Móvil',
      'Club Unión',
    ])
  })

  it('una suspendida no cuenta como primer horario', () => {
    const groups = groupByStage([
      makeAct({
        escenario_id: 1,
        escenario_nombre: 'A',
        inicio: at('20:00'),
        estado: 'suspendida',
      }),
      makeAct({ escenario_id: 1, escenario_nombre: 'A', inicio: at('22:00') }),
      makeAct({ escenario_id: 2, escenario_nombre: 'B', inicio: at('21:00') }),
    ])
    expect(sortByFirstStart(groups).map((g) => g.nombre)).toEqual(['B', 'A'])
  })

  it('por cercanía: el más cercano primero y sin distancia al final', () => {
    const groups = groupByStage([
      makeAct({ escenario_id: 1, escenario_nombre: 'Lejos', distancia_m: 5000 }),
      makeAct({ escenario_id: 2, escenario_nombre: 'Sin dato', distancia_m: null }),
      makeAct({ escenario_id: 3, escenario_nombre: 'Cerca', distancia_m: 300 }),
    ])
    expect(sortByDistance(groups).map((g) => g.nombre)).toEqual(['Cerca', 'Lejos', 'Sin dato'])
  })
})

describe('onStageNow', () => {
  const acts = nightFixture()
  const onStageAt = (time: string, nextDay = false) => [
    ...onStageNow(acts, new Date(at(time, nextDay))),
  ]

  it('antes de que empiece la noche no hay nadie', () => {
    expect(onStageAt('20:29')).toEqual([])
  })

  it('desde su hora de inicio, cada escenario tiene la suya', () => {
    expect(onStageAt('20:30').sort()).toEqual([1, 2])
  })

  it('dura como mucho 75 minutos si no hay otra que la corte', () => {
    // Centro: 20:30 y la siguiente recién a las 23:45.
    expect(onStageAt('21:44')).toContain(1)
    expect(onStageAt('21:45')).not.toContain(1)
  })

  it('la corta el inicio de la siguiente del mismo escenario', () => {
    // Móvil: 21:00 y 22:15 (justo 75 min); Unión no tiene otra.
    expect(onStageAt('22:14')).toContain(3)
    expect(onStageAt('22:15')).toContain(6)
    expect(onStageAt('22:15')).not.toContain(3)
    const short = [
      makeAct({ actuacion_id: 50, inicio: at('20:00') }),
      makeAct({ actuacion_id: 51, inicio: at('20:40') }),
    ]
    expect([...onStageNow(short, new Date(at('20:39')))]).toEqual([50])
    expect([...onStageNow(short, new Date(at('20:40')))]).toEqual([51])
  })

  it('una suspendida nunca está en escena ni corta a la anterior', () => {
    // Prado: 20:30, 21:30 suspendida, 22:30.
    expect(onStageAt('21:35')).not.toContain(5)
    expect(onStageAt('21:35')).toContain(2)
    expect(onStageAt('21:45')).not.toContain(2)
  })

  it('sigue después de la medianoche', () => {
    expect(onStageAt('00:45', true)).toEqual([9])
  })
})

describe('filtro por categoría', () => {
  const acts = nightFixture()

  it('lista sólo las categorías presentes, en el orden de la base', () => {
    expect(categoriesPresent(acts)).toEqual(['murga', 'parodistas', 'comparsa'])
  })

  it('sin categorías elegidas no filtra', () => {
    expect(filterByCategories(acts, [])).toHaveLength(acts.length)
  })

  it('con una o varias, deja sólo esas', () => {
    expect(names(filterByCategories(acts, ['comparsa']))).toEqual(['C 1080', 'Valores de Ansina'])
    expect(filterByCategories(acts, ['comparsa', 'parodistas'])).toHaveLength(3)
  })
})

describe('countStagesWithoutLocation', () => {
  it('cuenta escenarios, no actuaciones', () => {
    expect(countStagesWithoutLocation(nightFixture())).toBe(1)
    expect(
      countStagesWithoutLocation([
        makeAct({ escenario_id: 9, lat: null, lng: null }),
        makeAct({ escenario_id: 9, lat: null, lng: null }),
      ]),
    ).toBe(1)
  })
})
