import type { FixtureRow } from '../../lib/api'

const mvd = (local: string) => `${local}:00-03:00`

function row(
  etapa: Pick<FixtureRow, 'etapa_id' | 'rueda' | 'numero' | 'fecha'>,
  act: Partial<FixtureRow> | null,
  fuente = 'daecpu',
): FixtureRow {
  return {
    ...etapa,
    fuente,
    actuacion_id: null,
    inicio: null,
    estado: null,
    conjunto_id: null,
    conjunto_slug: null,
    conjunto_nombre: null,
    conjunto_categoria: null,
    ...(act ? { estado: 'programada', conjunto_categoria: 'murga', ...act } : {}),
  }
}

const P1 = { etapa_id: 1, rueda: 'primera', numero: 1, fecha: '2027-01-25' } as const
const P2 = { etapa_id: 2, rueda: 'primera', numero: 2, fecha: '2027-01-26' } as const
const S1 = { etapa_id: 3, rueda: 'segunda', numero: 1, fecha: '2027-02-01' } as const
const L1 = { etapa_id: 4, rueda: 'liguilla', numero: 1, fecha: '2027-02-08' } as const

const bastarda = {
  conjunto_id: 101,
  conjunto_slug: 'dona-bastarda',
  conjunto_nombre: 'Doña Bastarda',
}
const muneca = {
  conjunto_id: 102,
  conjunto_slug: 'la-gran-muneca',
  conjunto_nombre: 'La Gran Muñeca',
}
const zingaros = {
  conjunto_id: 103,
  conjunto_slug: 'zingaros',
  conjunto_nombre: 'Zíngaros',
  conjunto_categoria: 'parodistas',
} as const

/**
 * Un fixture chico, como lo devuelve la base (por rueda, etapa y hora): dos noches de
 * primera rueda (una con un turno pasada la medianoche y otra con una suspendida), una de
 * segunda y una de liguilla que todavía no tiene conjuntos.
 */
export function fixtureRows(fuente = 'daecpu'): FixtureRow[] {
  return [
    row(P1, { ...bastarda, actuacion_id: 11, inicio: mvd('2027-01-25T20:30') }, fuente),
    row(P1, { ...zingaros, actuacion_id: 12, inicio: mvd('2027-01-25T21:45') }, fuente),
    row(P1, { ...muneca, actuacion_id: 13, inicio: mvd('2027-01-26T00:15') }, fuente),
    row(
      P2,
      { ...muneca, actuacion_id: 21, inicio: mvd('2027-01-26T20:30'), estado: 'suspendida' },
      fuente,
    ),
    row(S1, { ...zingaros, actuacion_id: 31, inicio: mvd('2027-02-01T20:30') }, fuente),
    row(S1, { ...bastarda, actuacion_id: 32, inicio: mvd('2027-02-01T21:45') }, fuente),
    row(L1, null, fuente),
  ]
}
