import { useOutletContext } from 'react-router'
import type { ParadeEvent } from '../../lib/api'

/** Lo que cada vista recibe del marco: la noche que se mira y la noche lógica de ahora. */
export interface LlamadasContext {
  night: ParadeEvent
  today: string
}

export function useLlamadasNight(): LlamadasContext {
  return useOutletContext<LlamadasContext>()
}
