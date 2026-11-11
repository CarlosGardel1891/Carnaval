import { describe, expect, it } from 'vitest'
import { contestNightsOfGroup, contestRounds, isSampleFixture } from './contest'
import { fixtureRows } from './contest-fixtures'

describe('contestRounds', () => {
  it('arma las ruedas en orden, cada una con sus noches', () => {
    const rounds = contestRounds(fixtureRows())
    expect(rounds.map((r) => [r.rueda, r.nights.map((n) => [n.numero, n.fecha])])).toEqual([
      [
        'primera',
        [
          [1, '2027-01-25'],
          [2, '2027-01-26'],
        ],
      ],
      ['segunda', [[1, '2027-02-01']]],
      ['liguilla', [[1, '2027-02-08']]],
    ])
  })

  it('cada noche tiene sus conjuntos en el orden en que actúan', () => {
    const [first] = contestRounds(fixtureRows())[0]!.nights
    expect(first!.acts.map((act) => act.conjunto_nombre)).toEqual([
      'Doña Bastarda',
      'Zíngaros',
      'La Gran Muñeca',
    ])
    expect(first!.acts[1]).toMatchObject({ conjunto_categoria: 'parodistas', estado: 'programada' })
  })

  it('una etapa sin conjuntos cargados queda como noche vacía', () => {
    const liguilla = contestRounds(fixtureRows()).at(-1)!
    expect(liguilla.nights).toHaveLength(1)
    expect(liguilla.nights[0]!.acts).toEqual([])
  })

  it('sin filas no hay ruedas: el fixture no está publicado', () => {
    expect(contestRounds([])).toEqual([])
  })
})

describe('isSampleFixture', () => {
  it('reconoce el fixture de prueba por su fuente', () => {
    expect(isSampleFixture(fixtureRows())).toBe(false)
    expect(isSampleFixture(fixtureRows('fixture-ficticio'))).toBe(true)
    expect(isSampleFixture([])).toBe(false)
  })
})

describe('contestNightsOfGroup', () => {
  it('devuelve las noches de un conjunto, con su hora y su estado', () => {
    expect(contestNightsOfGroup(fixtureRows(), 102)).toEqual([
      {
        etapa_id: 1,
        rueda: 'primera',
        numero: 1,
        fecha: '2027-01-25',
        inicio: '2027-01-26T00:15:00-03:00',
        estado: 'programada',
      },
      {
        etapa_id: 2,
        rueda: 'primera',
        numero: 2,
        fecha: '2027-01-26',
        inicio: '2027-01-26T20:30:00-03:00',
        estado: 'suspendida',
      },
    ])
    expect(contestNightsOfGroup(fixtureRows(), 101).map((n) => n.rueda)).toEqual([
      'primera',
      'segunda',
    ])
  })

  it('un conjunto que no está en el fixture no tiene noches', () => {
    expect(contestNightsOfGroup(fixtureRows(), 999)).toEqual([])
  })
})
