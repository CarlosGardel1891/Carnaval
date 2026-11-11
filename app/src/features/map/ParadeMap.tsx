import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { RouteCorner, StreetClosure } from '../../lib/api'
import { BLANK_STYLE, initialStyle, type BlankReason } from './mapStyle'

setWorkerUrl(workerUrl)

/** Los colores del recorrido y de los cortes: los mismos que la referencia de la pantalla. */
export const ROUTE_COLOR = '#fbbf24'
export const CLOSURE_COLOR = '#fca5a5'
export const NO_PARKING_COLOR = '#cbd5e1'

/** Si las calles no cargaron en este tiempo (red saturada), el mapa pasa al fondo liso. */
const STREETS_TIMEOUT_MS = 8000

/** Un tramo para dibujar (GeoJSON): el recorrido o un corte. */
interface Feature {
  type: 'Feature'
  properties: { kind: string }
  geometry: { type: 'LineString'; coordinates: [number, number][] }
}

function features(corners: RouteCorner[], closures: StreetClosure[]): Feature[] {
  const line = (coordinates: [number, number][], kind: string): Feature => ({
    type: 'Feature',
    properties: { kind },
    geometry: { type: 'LineString', coordinates },
  })
  return [
    // Primero los cortes, así el recorrido queda dibujado encima.
    ...closures
      .filter((closure) => closure.puntos && closure.puntos.length >= 2)
      .map((closure) => line(closure.puntos as [number, number][], closure.tipo)),
    ...(corners.length >= 2
      ? [
          line(
            corners.map((corner) => [corner.lng, corner.lat]),
            'recorrido',
          ),
        ]
      : []),
  ]
}

/** Las capas del desfile. Se vuelven a agregar cada vez que el mapa carga un estilo. */
function addParadeLayers(map: MapLibreMap, data: Feature[]): void {
  if (map.getSource('desfile')) return
  map.addSource('desfile', { type: 'geojson', data: { type: 'FeatureCollection', features: data } })
  const layer = (id: string, kind: string, paint: Record<string, unknown>) =>
    map.addLayer({
      id,
      type: 'line',
      source: 'desfile',
      filter: ['==', ['get', 'kind'], kind],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint,
    })
  layer('sin-estacionar', 'estacionamiento', {
    'line-color': NO_PARKING_COLOR,
    'line-width': 4,
    'line-dasharray': [0.5, 2],
  })
  layer('cortes', 'corte', { 'line-color': CLOSURE_COLOR, 'line-width': 9, 'line-opacity': 0.7 })
  layer('recorrido', 'recorrido', { 'line-color': ROUTE_COLOR, 'line-width': 5 })
}

function pill(text: string): HTMLElement {
  const el = document.createElement('div')
  el.className =
    'bg-accent text-accent-ink rounded-full px-3 py-1 text-sm font-bold shadow whitespace-nowrap'
  el.textContent = text
  return el
}

function dot(label: string): HTMLElement {
  const el = document.createElement('div')
  el.className = 'size-3 rounded-full border-2 border-white bg-slate-900'
  el.title = label
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', label)
  return el
}

interface ParadeMapProps {
  corners: RouteCorner[]
  closures: StreetClosure[]
}

/**
 * El recorrido del desfile en el mapa: la línea, las esquinas, la salida, la llegada y los
 * cortes. No depende de la red (decisión 65): sin key de MapTiler, sin señal o si las calles
 * no llegan a cargar, dibuja lo mismo sobre fondo liso y lo avisa.
 */
export function ParadeMap({ corners, closures }: ParadeMapProps) {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const apiKey = import.meta.env.VITE_MAPTILER_KEY || undefined
  const [blank, setBlank] = useState<BlankReason | null>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const data = useRef<Feature[]>([])

  useEffect(() => {
    if (!container.current) return
    const start = initialStyle(apiKey, navigator.onLine !== false)
    setBlank(start.blank)
    const instance = new MapLibreMap({
      container: container.current,
      style: start.style,
      center: [-56.1845, -34.911],
      zoom: 15,
    })
    instance.addControl(new NavigationControl({ showCompass: false }))

    let streetsLoaded = start.blank !== null
    const fallBack = () => {
      if (streetsLoaded) return
      streetsLoaded = true
      setBlank('no-network')
      instance.setStyle(BLANK_STYLE)
    }
    // Las calles no llegaron: por un error (sin red) o porque tardan demasiado.
    instance.on('error', fallBack)
    const timeout = window.setTimeout(fallBack, STREETS_TIMEOUT_MS)
    instance.on('style.load', () => {
      addParadeLayers(instance, data.current)
    })
    instance.once('load', () => {
      streetsLoaded = true
      window.clearTimeout(timeout)
    })
    setMap(instance)
    return () => {
      window.clearTimeout(timeout)
      setMap(null)
      instance.remove()
    }
  }, [apiKey])

  useEffect(() => {
    data.current = features(corners, closures)
    if (!map) return
    const source = map.getSource('desfile') as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: data.current })

    const placed = corners.map((corner, i) => {
      const first = i === 0
      const last = i === corners.length - 1
      const element =
        first || last
          ? pill(t(first ? 'llamadas.route.start' : 'llamadas.route.end'))
          : dot(corner.cruce)
      return new Marker({ element, anchor: first || last ? 'bottom' : 'center' })
        .setLngLat([corner.lng, corner.lat])
        .addTo(map)
    })
    if (corners.length >= 2) {
      const bounds = new LngLatBounds()
      for (const feature of data.current) {
        for (const point of feature.geometry.coordinates) bounds.extend(point as [number, number])
      }
      map.resize()
      map.fitBounds(bounds, { padding: 48, maxZoom: 16, animate: false })
    }
    return () => placed.forEach((marker) => marker.remove())
  }, [map, corners, closures, t])

  return (
    <div className="relative h-full w-full">
      <div
        ref={container}
        className="h-full w-full"
        role="region"
        aria-label={t('llamadas.route.mapLabel')}
      />
      {blank && (
        <p className="bg-surface/90 text-soft border-line absolute inset-x-3 bottom-3 rounded-xl border p-2 text-center text-sm">
          {t(blank === 'no-key' ? 'map.missingKey' : 'llamadas.route.noStreets')}
        </p>
      )}
    </div>
  )
}
