import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Coords } from '../../lib/api'
import { currentPosition, hasLocationPermission, LocationError } from '../../lib/geo'
import { LocationContext, type LocationStatus, type UserLocation } from './locationContext'

interface State {
  coords: Coords | null
  status: LocationStatus
}

/** Guarda la posición del usuario para toda la app (pizarrón y mapa), sólo en memoria. */
export function LocationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ coords: null, status: 'idle' })
  // Una sola búsqueda a la vez: dos toques seguidos esperan la misma.
  const pending = useRef<Promise<boolean> | null>(null)

  const locate = useCallback((): Promise<boolean> => {
    pending.current ??= (async () => {
      setState((prev) => ({ ...prev, status: 'locating' }))
      try {
        const coords = await currentPosition()
        setState({ coords, status: 'ready' })
        return true
      } catch (error) {
        const reason = error instanceof LocationError ? error.reason : 'unavailable'
        setState({ coords: null, status: reason })
        return false
      } finally {
        pending.current = null
      }
    })()
    return pending.current
  }, [])

  const restore = useCallback(async (): Promise<boolean> => {
    if (!(await hasLocationPermission())) return false
    return locate()
  }, [locate])

  const dismiss = useCallback(() => {
    setState((prev) =>
      prev.status === 'denied' || prev.status === 'unavailable'
        ? { ...prev, status: prev.coords ? 'ready' : 'idle' }
        : prev,
    )
  }, [])

  const value = useMemo<UserLocation>(
    () => ({ ...state, request: locate, restore, dismiss }),
    [state, locate, restore, dismiss],
  )

  return <LocationContext value={value}>{children}</LocationContext>
}
