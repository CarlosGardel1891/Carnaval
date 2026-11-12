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
import { BLANK_STYLE, streetsStyleUrl } from './mapStyle'
import { MARKER_STROKE, markerShape, type MapMarker } from './markers'

// MapLibre busca su worker al lado de su propio módulo, y en el bundle ya no está ahí:
// Vite lo publica como un archivo más y acá se le dice dónde quedó.
setWorkerUrl(workerUrl)

const INITIAL_ZOOM = 12
/** Lo que tapan el encabezado flotante y la barra de pestañas, para encuadrar los marcadores. */
const TOP_SPACE = 170
const BOTTOM_SPACE = 130
const SVG_NS = 'http://www.w3.org/2000/svg'

const mapStyle = (apiKey: string | undefined): StyleSpecification | string =>
  apiKey ? streetsStyleUrl(apiKey) : BLANK_STYLE

/**
 * El botón de un marcador (decisión 92): redondo, del color del tipo de escenario, con borde
 * blanco y la forma del tipo adentro, y un área de toque de 48 px. El elegido se agranda.
 */
function markerButton(marker: MapMarker, label: string, onOpen: () => void): HTMLButtonElement {
  const shape = markerShape(marker.tipo)
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('class', 'size-4')
  const path = document.createElementNS(SVG_NS, 'path')
  path.setAttribute('d', shape.path)
  path.setAttribute('fill', MARKER_STROKE)
  svg.append(path)

  const dot = document.createElement('span')
  dot.className =
    'flex size-9 items-center justify-center rounded-full border-[3px] border-white shadow-[0_3px_10px_rgb(15_23_42/0.35)] transition-transform duration-150 group-data-[selected=true]:scale-[1.3]'
  dot.style.backgroundColor = shape.color
  dot.append(svg)

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'group flex size-12 cursor-pointer items-center justify-center'
  button.setAttribute('aria-label', label)
  button.title = label
  button.append(dot)
  button.addEventListener('click', (event) => {
    // Que el toque no llegue al mapa: tocar el fondo cierra la tarjeta.
    event.stopPropagation()
    onOpen()
  })
  return button
}

function userDot(label: string): HTMLElement {
  const dot = document.createElement('div')
  dot.className =
    'bg-brand-mid size-5 rounded-full border-[3px] border-white shadow-[0_0_0_6px_rgb(47_128_237/0.25)]'
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
  /** El marcador elegido, que se ve más grande. */
  selectedKey?: string | null
  /** Se tocó el mapa fuera de un marcador. */
  onBackground?: () => void
}

export function MontevideoMap({
  markers,
  labelOf,
  onOpen,
  user,
  selectedKey = null,
  onBackground,
}: MontevideoMapProps) {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const fitted = useRef(false)
  const apiKey = import.meta.env.VITE_MAPTILER_KEY || undefined

  // Los últimos `labelOf` y `onOpen`, sin rearmar los marcadores cuando cambian.
  const handlers = useRef({ labelOf, onOpen, onBackground })
  useEffect(() => {
    handlers.current = { labelOf, onOpen, onBackground }
  })
  const buttons = useRef(new Map<string, HTMLButtonElement>())

  useEffect(() => {
    if (!container.current) return
    const instance = new MapLibreMap({
      container: container.current,
      style: mapStyle(apiKey),
      center: [MONTEVIDEO_CENTER.lng, MONTEVIDEO_CENTER.lat],
      zoom: INITIAL_ZOOM,
    })
    instance.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    instance.on('click', () => handlers.current.onBackground?.())
    setMap(instance)
    return () => {
      fitted.current = false
      setMap(null)
      instance.remove()
    }
  }, [apiKey])

  useEffect(() => {
    if (!map) return
    const registry = buttons.current
    const placed = markers.map((marker) => {
      const element = markerButton(marker, handlers.current.labelOf(marker), () =>
        handlers.current.onOpen(marker),
      )
      registry.set(marker.key, element)
      return new Marker({ element }).setLngLat([marker.lng, marker.lat]).addTo(map)
    })
    // La primera vez que hay marcadores, el mapa se acomoda para mostrarlos todos.
    if (!fitted.current && markers.length > 0) {
      fitted.current = true
      const bounds = new LngLatBounds()
      for (const marker of markers) bounds.extend([marker.lng, marker.lat])
      // El encabezado puede haber crecido en este mismo render: primero, el tamaño real.
      map.resize()
      map.fitBounds(bounds, {
        padding: { top: TOP_SPACE, right: 48, left: 48, bottom: BOTTOM_SPACE },
        maxZoom: 14,
        animate: false,
      })
    }
    return () => {
      placed.forEach((marker) => marker.remove())
      registry.clear()
    }
  }, [map, markers, apiKey])

  useEffect(() => {
    for (const [key, button] of buttons.current) {
      button.setAttribute('data-selected', String(key === selectedKey))
    }
    // El elegido se corre al medio de lo que queda a la vista, por encima de su tarjeta.
    const chosen = markers.find((marker) => marker.key === selectedKey)
    if (map && chosen) {
      map.easeTo({ center: [chosen.lng, chosen.lat], offset: [0, -40], duration: 300 })
    }
  }, [selectedKey, markers, map])

  useEffect(() => {
    if (!map || !user) return
    const dot = new Marker({ element: userDot(t('map.you')) })
      .setLngLat([user.lng, user.lat])
      .addTo(map)
    return () => {
      dot.remove()
    }
  }, [map, user, t])

  return <div ref={container} className="h-full w-full" role="region" aria-label={t('map.label')} />
}
