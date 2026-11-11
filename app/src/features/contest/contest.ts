import type { EstadoActuacion, Enums } from '@cuerda/shared'
import type { FixtureRow } from '../../lib/api'

/**
 * El fixture del Concurso Oficial, armado a partir de las filas de `fixture_del_concurso`
 * (una por conjunto y noche, ya ordenadas por rueda, etapa y hora): ruedas, y dentro de cada
 * una sus noches con los conjuntos que actúan.
 */

/** Así se marcan las etapas del fixture de prueba (`pnpm db:fixture`). */
export const SAMPLE_SOURCE = 'fixture-ficticio'

export const CONTEST_PATH = '/calendario/concurso'

export type Round = Enums<'rueda_concurso'>

export interface ContestAct {
  actuacion_id: number
  inicio: string
  estado: EstadoActuacion
  conjunto_id: number
  conjunto_slug: string
  conjunto_nombre: string
  conjunto_categoria: Enums<'categoria_conjunto'>
}

/** Una noche del Concurso: una etapa. */
export interface ContestNight {
  etapa_id: number
  rueda: Round
  numero: number
  /** Fecha pura: la noche lógica de la etapa. */
  fecha: string
  acts: ContestAct[]
}

export interface ContestRound {
  rueda: Round
  nights: ContestNight[]
}

/** Las noches del fixture, en el orden en que llegan. Una etapa sin conjuntos queda vacía. */
export function contestNights(rows: FixtureRow[]): ContestNight[] {
  const nights = new Map<number, ContestNight>()
  for (const row of rows) {
    let night = nights.get(row.etapa_id)
    if (!night) {
      night = {
        etapa_id: row.etapa_id,
        rueda: row.rueda,
        numero: row.numero,
        fecha: row.fecha,
        acts: [],
      }
      nights.set(row.etapa_id, night)
    }
    if (
      row.actuacion_id !== null &&
      row.inicio !== null &&
      row.estado !== null &&
      row.conjunto_id !== null &&
      row.conjunto_slug !== null &&
      row.conjunto_nombre !== null &&
      row.conjunto_categoria !== null
    ) {
      night.acts.push({
        actuacion_id: row.actuacion_id,
        inicio: row.inicio,
        estado: row.estado,
        conjunto_id: row.conjunto_id,
        conjunto_slug: row.conjunto_slug,
        conjunto_nombre: row.conjunto_nombre,
        conjunto_categoria: row.conjunto_categoria,
      })
    }
  }
  return [...nights.values()]
}

/** Las ruedas que tienen alguna noche, en el orden del Concurso. */
export function contestRounds(rows: FixtureRow[]): ContestRound[] {
  const rounds: ContestRound[] = []
  for (const night of contestNights(rows)) {
    const last = rounds[rounds.length - 1]
    if (last && last.rueda === night.rueda) last.nights.push(night)
    else rounds.push({ rueda: night.rueda, nights: [night] })
  }
  return rounds
}

/** Si lo cargado es el fixture de prueba y no el publicado. */
export function isSampleFixture(rows: FixtureRow[]): boolean {
  return rows.some((row) => row.fuente === SAMPLE_SOURCE)
}

/** Una noche del Concurso de un conjunto, para su ficha. */
export interface GroupContestNight {
  etapa_id: number
  rueda: Round
  numero: number
  fecha: string
  inicio: string
  estado: EstadoActuacion
}

/** Las noches del Concurso en las que actúa un conjunto, también las que ya pasaron. */
export function contestNightsOfGroup(rows: FixtureRow[], groupId: number): GroupContestNight[] {
  return contestNights(rows).flatMap((night) =>
    night.acts
      .filter((act) => act.conjunto_id === groupId)
      .map((act) => ({
        etapa_id: night.etapa_id,
        rueda: night.rueda,
        numero: night.numero,
        fecha: night.fecha,
        inicio: act.inicio,
        estado: act.estado,
      })),
  )
}
