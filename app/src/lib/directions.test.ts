import { describe, expect, it } from 'vitest'
import { directionsUrl } from './directions'

const POINT = { lat: -34.9058, lng: -56.1913 }

describe('directionsUrl', () => {
  it('en Android usa geo:, con el nombre del lugar', () => {
    expect(directionsUrl(POINT, 'Tablado Centro', 'android')).toBe(
      'geo:-34.9058,-56.1913?q=-34.9058,-56.1913(Tablado%20Centro)',
    )
  })

  it('en Android saca los paréntesis del nombre, que romperían el enlace', () => {
    expect(directionsUrl(POINT, 'Club (sede)', 'android')).toBe(
      'geo:-34.9058,-56.1913?q=-34.9058,-56.1913(Club%20%20sede)',
    )
  })

  it('en iOS abre Apple Maps', () => {
    expect(directionsUrl(POINT, 'Tablado Centro', 'ios')).toBe(
      'https://maps.apple.com/?daddr=-34.9058,-56.1913',
    )
  })

  it('en el navegador abre Google Maps', () => {
    expect(directionsUrl(POINT, 'Tablado Centro', 'web')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-34.9058,-56.1913',
    )
    // Sin plataforma, la de Capacitor: en los tests, la web.
    expect(directionsUrl(POINT, 'Tablado Centro')).toContain('google.com/maps')
  })
})
