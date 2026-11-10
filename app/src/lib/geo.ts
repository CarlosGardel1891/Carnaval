import { Capacitor } from '@capacitor/core'
import { Geolocation, type PermissionStatus } from '@capacitor/geolocation'
import type { Coords } from './api'

/**
 * La ubicación del teléfono, por @capacitor/geolocation (en la web, la del navegador).
 * Nada de esto se llama al abrir la app: sólo cuando el usuario activa «cerca mío».
 */

/** `denied`: no hay permiso. `unavailable`: hay permiso pero no hay posición (GPS apagado, sin señal, demora). */
export type LocationFailure = 'denied' | 'unavailable'

export class LocationError extends Error {
  readonly reason: LocationFailure

  constructor(reason: LocationFailure) {
    super(`location ${reason}`)
    this.name = 'LocationError'
    this.reason = reason
  }
}

// Con la ubicación aproximada alcanza: en Android 12+ el usuario puede dar sólo esa.
const isGranted = (status: PermissionStatus) =>
  status.location === 'granted' || status.coarseLocation === 'granted'

/** Códigos del plugin en Android e iOS: permiso negado y uso de la ubicación restringido. */
const NATIVE_DENIED = ['OS-PLUG-GLOC-0003', 'OS-PLUG-GLOC-0008']
/** `GeolocationPositionError.PERMISSION_DENIED`, en la web. */
const WEB_DENIED = 1

function toLocationError(error: unknown): LocationError {
  if (error instanceof LocationError) return error
  const code = (error as { code?: unknown } | null)?.code
  const denied = code === WEB_DENIED || NATIVE_DENIED.includes(String(code))
  return new LocationError(denied ? 'denied' : 'unavailable')
}

/** Si ya hay permiso, sin preguntarle nada al usuario. */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    return isGranted(await Geolocation.checkPermissions())
  } catch {
    // Sin API de permisos (navegador viejo) o con la ubicación del teléfono apagada.
    return false
  }
}

/**
 * La posición actual. Si hace falta, pide el permiso (en la web lo pide el navegador al
 * consultar la posición). Falla con `LocationError`.
 */
export async function currentPosition(): Promise<Coords> {
  try {
    if (Capacitor.isNativePlatform()) {
      let status = await Geolocation.checkPermissions()
      if (!isGranted(status)) status = await Geolocation.requestPermissions()
      if (!isGranted(status)) throw new LocationError('denied')
    }
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 60_000,
    })
    return { lat: position.coords.latitude, lng: position.coords.longitude }
  } catch (error) {
    throw toLocationError(error)
  }
}
