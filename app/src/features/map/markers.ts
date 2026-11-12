import type { TipoEscenario } from '@cuerda/shared'
import type { Act, LocatedStage } from '../../lib/api'

/** Un marcador del mapa: un escenario fijo o una parada de un itinerante esa noche. */
export interface MapMarker {
  key: string
  slug: string
  nombre: string
  tipo: TipoEscenario | null
  lat: number
  lng: number
  /** Dirección del escenario o de la parada. */
  direccion: string | null
  /** Sólo en las paradas de un itinerante: a qué hora empieza ahí. */
  inicio: string | null
}

/**
 * Los marcadores de una noche. Los escenarios fijos salen de `escenarios_cercanos`
 * (estén o no en la grilla de esa noche); los itinerantes, de las actuaciones: una
 * parada por cada lugar donde actúan, sin contar las suspendidas. Lo que no tiene
 * ubicación cargada no aparece.
 */
export function mapMarkers(stages: LocatedStage[], acts: Act[]): MapMarker[] {
  const fixed: MapMarker[] = stages
    .filter((stage) => !stage.itinerante)
    .map((stage) => ({
      key: `e${stage.escenario_id}`,
      slug: stage.slug,
      nombre: stage.nombre,
      tipo: stage.tipo,
      lat: stage.lat,
      lng: stage.lng,
      direccion: stage.direccion,
      inicio: null,
    }))

  const stops = new Map<string, MapMarker>()
  const byStart = [...acts].sort((a, b) => Date.parse(a.inicio) - Date.parse(b.inicio))
  for (const act of byStart) {
    if (act.itinerante !== true || act.estado === 'suspendida') continue
    if (act.lat === null || act.lng === null) continue
    const key = `p${act.escenario_id}:${act.lat},${act.lng}`
    // Si hay más de una actuación en la misma parada, vale la primera hora.
    if (stops.has(key)) continue
    stops.set(key, {
      key,
      slug: act.escenario_slug,
      nombre: act.escenario_nombre,
      tipo: act.escenario_tipo,
      lat: act.lat,
      lng: act.lng,
      direccion: act.direccion,
      inicio: act.inicio,
    })
  }

  return [...fixed, ...stops.values()]
}

export interface MarkerShape {
  /** Contorno en un viewBox de 24 × 24. */
  path: string
  color: string
}

const CIRCLE = 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18Z'

/**
 * Un marcador por tipo de escenario: redondo, del color del tipo, con una forma blanca adentro
 * (el color nunca va solo). Los colores tienen contraste de sobra con el blanco y con el mapa.
 */
const SHAPES: Record<TipoEscenario, MarkerShape> = {
  teatro_verano: {
    path: 'M12 2l2.9 6.6 7.1.7-5.4 4.8 1.6 7L12 17.4 5.8 21.1l1.6-7L2 9.3l7.1-.7Z',
    color: '#b45309',
  },
  privado: { path: 'M4.5 4.5h15v15h-15Z', color: '#7c3aed' },
  popular: { path: CIRCLE, color: '#0448a7' },
  movil: { path: 'M12 2 22 12 12 22 2 12Z', color: '#15803d' },
  gratuito: { path: 'M12 3 22 20H2Z', color: '#be185d' },
  barrio_a_barrio: { path: 'M12 2l8.7 5v10L12 22l-8.7-5V7Z', color: '#c2410c' },
}

const UNKNOWN: MarkerShape = { path: CIRCLE, color: '#5b6b82' }

export function markerShape(tipo: TipoEscenario | null): MarkerShape {
  return tipo ? SHAPES[tipo] : UNKNOWN
}

/** La forma de adentro y el borde de los marcadores: blancos. */
export const MARKER_STROKE = '#ffffff'
