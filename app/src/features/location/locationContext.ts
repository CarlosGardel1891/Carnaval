import { createContext, useContext } from 'react'
import type { Coords } from '../../lib/api'

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable'

export interface UserLocation {
  /** La posición del usuario. Vive sólo en memoria: ni en la URL ni en disco. */
  coords: Coords | null
  status: LocationStatus
  /** Pide el permiso si hace falta y busca la posición. Devuelve si la consiguió. */
  request: () => Promise<boolean>
  /** Busca la posición sólo si ya había permiso; si no, no pregunta ni avisa nada. */
  restore: () => Promise<boolean>
  /** Olvida un aviso de error (permiso negado o posición no disponible). */
  dismiss: () => void
}

export const LocationContext = createContext<UserLocation | null>(null)

export function useUserLocation(): UserLocation {
  const location = useContext(LocationContext)
  if (!location) throw new Error('useUserLocation needs a LocationProvider')
  return location
}
