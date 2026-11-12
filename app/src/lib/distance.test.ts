import { describe, expect, it } from 'vitest'
import { distanceMeters } from './distance'

describe('distanceMeters', () => {
  it('da cero para el mismo punto', () => {
    const here = { lat: -34.9058, lng: -56.1913 }
    expect(distanceMeters(here, here)).toBe(0)
  })

  it('mide lo mismo en los dos sentidos', () => {
    const a = { lat: -34.9058, lng: -56.1913 }
    const b = { lat: -34.86, lng: -56.2 }
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6)
  })

  it('un grado de latitud son unos 111,2 km', () => {
    expect(distanceMeters({ lat: -34, lng: -56 }, { lat: -35, lng: -56 })).toBeCloseTo(111_195, -2)
  })

  it('coincide con lo que medía la base entre dos puntos de Montevideo', () => {
    // Los mismos puntos que usa packages/db-tests/src/noche.test.ts: PostGIS da entre 100 y
    // 160 m al escenario cercano y entre 650 y 790 m a la parada del móvil.
    const origin = { lat: -34.9, lng: -56.165 }
    const stop = distanceMeters(origin, { lat: -34.905, lng: -56.17 })
    expect(stop).toBeGreaterThan(650)
    expect(stop).toBeLessThan(790)
  })

  it('del Teatro de Verano al Palacio Legislativo hay unos 3,8 km', () => {
    const teatro = { lat: -34.9209, lng: -56.1669 }
    const palacio = { lat: -34.8912, lng: -56.1872 }
    const d = distanceMeters(teatro, palacio)
    expect(d).toBeGreaterThan(3600)
    expect(d).toBeLessThan(4000)
  })
})
