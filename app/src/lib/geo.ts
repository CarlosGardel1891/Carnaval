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

/**
 * La posición del usuario. `approximate` dice que no alcanza para confiar en la distancia
 * exacta: el usuario dio sólo el permiso aproximado (Android 12+) o el teléfono informa la
 * posición con un margen grande (iOS con «ubicación exacta» apagada, un navegador sin GPS).
 */
export interface UserPosition {
  coords: Coords
  approximate: boolean
}

/**
 * Margen, en metros, desde el que una posición se trata como aproximada. La aproximada de
 * Android cae en una grilla de unos 3 km² y la de iOS tiene un margen de varios km; una
 * posición por GPS o wifi queda muy por debajo.
 */
export const APPROXIMATE_FROM_M = 1000

// Se piden las dos, la precisa y la aproximada, y el usuario elige (Android 12+). Con la
// aproximada «cerca mío» anda igual, pero las distancias se muestran redondeadas.
const isGranted = (status: PermissionStatus) =>
  status.location === 'granted' || status.coarseLocation === 'granted'
const isPrecise = (status: PermissionStatus) => status.location === 'granted'

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
 * consultar la posición): preciso y aproximado a la vez, para que el usuario elija. Falla
 * con `LocationError`.
 */
export async function currentPosition(): Promise<UserPosition> {
  try {
    let precise = true
    if (Capacitor.isNativePlatform()) {
      let status = await Geolocation.checkPermissions()
      if (!isGranted(status)) status = await Geolocation.requestPermissions()
      if (!isGranted(status)) throw new LocationError('denied')
      precise = isPrecise(status)
    }
    const position = await Geolocation.getCurrentPosition({
      // Con el permiso preciso se pide la mejor posición (GPS). Sin él no: en Android el
      // plugin volvería a mostrar el diálogo de permisos en cada consulta.
      enableHighAccuracy: precise,
      timeout: 10_000,
      maximumAge: 60_000,
    })
    const { latitude, longitude, accuracy } = position.coords
    return {
      coords: { lat: latitude, lng: longitude },
      approximate: !precise || accuracy > APPROXIMATE_FROM_M,
    }
  } catch (error) {
    throw toLocationError(error)
  }
}
