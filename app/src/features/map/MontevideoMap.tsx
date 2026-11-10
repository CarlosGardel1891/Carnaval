import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { MONTEVIDEO_CENTER, type Coords } from '../../lib/api'
import { MARKER_STROKE, markerShape, type MapMarker } from './markers'

// MapLibre busca su worker al lado de su propio módulo, y en el bundle ya no está ahí:
// Vite lo publica como un archivo más y acá se le dice dónde quedó.
setWorkerUrl(workerUrl)

const INITIAL_ZOOM = 12
/** Lugar para el aviso de que falta la key, que tapa la parte de abajo del mapa. */
const NOTICE_SPACE = 72
const SVG_NS = 'http://www.w3.org/2000/svg'

/** Sin key de MapTiler no hay calles: queda un fondo liso donde igual se ven los marcadores. */
const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#141b2d' } }],
}

const mapStyle = (apiKey: string | undefined): StyleSpecification | string =>
  apiKey ? `https://api.maptiler.com/maps/streets-v2-dark/style.json?key=${apiKey}` : BLANK_STYLE

/** El botón de un marcador: la forma del tipo de escenario, con un área de toque de 48 px. */
function markerButton(marker: MapMarker, label: string, onOpen: () => void): HTMLButtonElement {
  const shape = markerShape(marker.tipo)
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('class', 'size-8')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', shape.path)
  path.setAttribute('fill', shape.color)
  path.setAttribute('stroke', MARKER_STROKE)
  path.setAttribute('stroke-width', '1.5')
  path.setAttribute('stroke-linejoin', 'round')
  svg.append(path)

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'flex size-12 cursor-pointer items-center justify-center'
  button.setAttribute('aria-label', label)
  button.title = label
  button.append(svg)
  button.addEventListener('click', onOpen)
  return button
}

function userDot(label: string): HTMLElement {
  const dot = document.createElement('div')
  dot.className = 'size-5 rounded-full border-2 border-white bg-sky-500 shadow'
  dot.setAttribute('role', 'img')
  dot.setAttribute('aria-label', label)
  return dot
}

interface MontevideoMapProps {
  markers: MapMarker[]
  /** Cómo se lee cada marcador (nombre, tipo, parada). */
  labelOf: (marker: MapMarker) => string
  onOpen: (marker: MapMarker) => void
  /** La posición del usuario, si dio permiso. */
  user: Coords | null
}

export function MontevideoMap({ markers, labelOf, onOpen, user }: MontevideoMapProps) {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const fitted = useRef(false)
  const apiKey = import.meta.env.VITE_MAPTILER_KEY || undefined

  // Los últimos `labelOf` y `onOpen`, sin rearmar los marcadores cuando cambian.
  const handlers = useRef({ labelOf, onOpen })
  useEffect(() => {
    handlers.current = { labelOf, onOpen }
  })

  useEffect(() => {
    if (!container.current) return
    const instance = new MapLibreMap({
      container: container.current,
      style: mapStyle(apiKey),
      center: [MONTEVIDEO_CENTER.lng, MONTEVIDEO_CENTER.lat],
      zoom: INITIAL_ZOOM,
    })
    instance.addControl(new NavigationControl({ showCompass: false }))
    setMap(instance)
    return () => {
      fitted.current = false
      setMap(null)
      instance.remove()
    }
  }, [apiKey])

  useEffect(() => {
    if (!map) return
    const placed = markers.map((marker) =>
      new Marker({
        element: markerButton(marker, handlers.current.labelOf(marker), () =>
          handlers.current.onOpen(marker),
        ),
      })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map),
    )
    // La primera vez que hay marcadores, el mapa se acomoda para mostrarlos todos.
    if (!fitted.current && markers.length > 0) {
      fitted.current = true
      const bounds = new LngLatBounds()
      for (const marker of markers) bounds.extend([marker.lng, marker.lat])
      // El encabezado puede haber crecido en este mismo render: primero, el tamaño real.
      map.resize()
      map.fitBounds(bounds, {
        padding: { top: 64, right: 64, left: 64, bottom: 64 + (apiKey ? 0 : NOTICE_SPACE) },
        maxZoom: 14,
        animate: false,
      })
    }
    return () => placed.forEach((marker) => marker.remove())
  }, [map, markers, apiKey])

  useEffect(() => {
    if (!map || !user) return
    const dot = new Marker({ element: userDot(t('map.you')) })
      .setLngLat([user.lng, user.lat])
      .addTo(map)
    return () => {
      dot.remove()
    }
  }, [map, user, t])

  return (
    <div className="relative h-full w-full">
      <div ref={container} className="h-full w-full" role="region" aria-label={t('map.label')} />
      {!apiKey && (
        <p className="bg-surface/90 text-soft border-line absolute inset-x-3 bottom-3 rounded-xl border p-3 text-center">
          {t('map.missingKey')}
        </p>
      )}
    </div>
  )
}
