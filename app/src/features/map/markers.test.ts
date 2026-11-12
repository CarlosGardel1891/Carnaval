import { describe, expect, it } from 'vitest'
import { Constants } from '@cuerda/shared'
import type { LocatedStage } from '../../lib/api'
import { at, makeAct, nightFixture } from '../../test-fixtures'
import { mapMarkers, markerShape } from './markers'

function stage(overrides: Partial<LocatedStage> = {}): LocatedStage {
  return {
    escenario_id: 1,
    slug: 'ficticio-centro',
    nombre: 'Tablado Centro',
    tipo: 'privado',
    barrio: 'Centro',
    direccion: 'Av. 18 de Julio 1234',
    gratis: false,
    precio_texto: '$ 300',
    itinerante: false,
    lat: -34.9058,
    lng: -56.1913,
    distancia_m: 0,
    ...overrides,
  }
}

const movil = stage({
  escenario_id: 3,
  slug: 'ficticio-movil',
  nombre: 'Escenario Móvil',
  tipo: 'movil',
  direccion: null,
  itinerante: true,
  lat: -34.89,
  lng: -56.17,
})

describe('mapMarkers', () => {
  it('pone un marcador por escenario fijo, actúe o no esa noche', () => {
    const markers = mapMarkers([stage(), stage({ escenario_id: 9, slug: 'ficticio-cerro' })], [])
    expect(markers.map((m) => m.key)).toEqual(['e1', 'e9'])
    expect(markers[0]).toMatchObject({
      slug: 'ficticio-centro',
      tipo: 'privado',
      lat: -34.9058,
      lng: -56.1913,
      direccion: 'Av. 18 de Julio 1234',
      inicio: null,
    })
  })

  it('ubica al itinerante en cada parada de la noche, no en la fila de la base', () => {
    const markers = mapMarkers([stage(), movil], nightFixture())
    const stops = markers.filter((m) => m.slug === 'ficticio-movil')
    expect(stops).toEqual([
      expect.objectContaining({
        lat: -34.89,
        lng: -56.17,
        direccion: 'Esquina ficticia 1',
        inicio: at('21:00'),
        tipo: 'movil',
      }),
      expect.objectContaining({
        lat: -34.89,
        lng: -56.16,
        direccion: 'Esquina ficticia 2',
        inicio: at('22:15'),
      }),
    ])
    // Los fijos salen de `escenarios_cercanos`: el Prado y el Club Unión no vinieron.
    expect(markers).toHaveLength(3)
  })

  it('junta las actuaciones de una misma parada y se queda con la primera hora', () => {
    const acts = [
      makeAct({ escenario_id: 3, itinerante: true, inicio: at('22:00'), lat: -34.89, lng: -56.17 }),
      makeAct({ escenario_id: 3, itinerante: true, inicio: at('21:00'), lat: -34.89, lng: -56.17 }),
    ]
    const markers = mapMarkers([], acts)
    expect(markers).toHaveLength(1)
    expect(markers[0]?.inicio).toBe(at('21:00'))
  })

  it('no marca paradas suspendidas ni sin ubicación', () => {
    const acts = [
      makeAct({
        escenario_id: 3,
        itinerante: true,
        estado: 'suspendida',
        lat: -34.89,
        lng: -56.17,
      }),
      makeAct({ escenario_id: 3, itinerante: true, lat: null, lng: null }),
    ]
    expect(mapMarkers([], acts)).toEqual([])
  })
})

describe('markerShape', () => {
  it('cada tipo de escenario tiene su propia forma y su propio color', () => {
    const shapes = Constants.public.Enums.tipo_escenario.map((tipo) => markerShape(tipo))
    expect(new Set(shapes.map((s) => s.path)).size).toBe(shapes.length)
    expect(new Set(shapes.map((s) => s.color)).size).toBe(shapes.length)
  })

  it('un escenario sin tipo usa un marcador neutro', () => {
    expect(markerShape(null).color).toBe('#5b6b82')
  })
})
