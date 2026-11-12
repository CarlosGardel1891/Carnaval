import type { EstadoActuacion } from '@cuerda/shared'
import type { ActPatch, NightAct } from '../../lib/api'
import { nightInstant } from '../../lib/night'

/** Lo que el admin tiene escrito en el formulario de una actuación. */
export interface Draft {
  /** «HH:MM», de Montevideo. */
  hora: string
  escenarioId: number
  direccion: string
  estado: EstadoActuacion
}

/**
 * Lo que cambia al guardar. Si se movió la hora o el lugar de una actuación programada y el
 * admin no tocó el estado, pasa a «cambiada»: es lo que la app marca y lo que se avisa.
 */
export function toPatch(act: NightAct, draft: Draft, noche: string): ActPatch {
  const patch: ActPatch = {}
  const inicio = nightInstant(noche, draft.hora)
  if (new Date(inicio).getTime() !== new Date(act.inicio).getTime()) patch.inicio = inicio
  if (draft.escenarioId !== act.escenario.id) patch.escenario_id = draft.escenarioId
  const direccion = draft.direccion.trim() || null
  if (direccion !== act.direccion_texto) patch.direccion_texto = direccion
  if (draft.estado !== act.estado) patch.estado = draft.estado
  else if (act.estado === 'programada' && Object.keys(patch).length > 0) patch.estado = 'cambiada'
  return patch
}
