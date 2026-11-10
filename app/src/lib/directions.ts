import { Capacitor } from '@capacitor/core'
import type { Coords } from './api'

/**
 * Enlace para abrir un punto en la app de mapas del teléfono: `geo:` en Android (lo
 * toma la app de mapas que tenga), Apple Maps en iOS y Google Maps en el navegador.
 */
export function directionsUrl(
  { lat, lng }: Coords,
  label: string,
  platform: string = Capacitor.getPlatform(),
): string {
  const point = `${lat},${lng}`
  if (platform === 'android') {
    // El nombre va entre paréntesis: si trae paréntesis propios, rompe el enlace.
    const name = encodeURIComponent(label.replace(/[()]/g, ' ').trim())
    return `geo:${point}?q=${point}(${name})`
  }
  if (platform === 'ios') return `https://maps.apple.com/?daddr=${point}`
  return `https://www.google.com/maps/dir/?api=1&destination=${point}`
}
