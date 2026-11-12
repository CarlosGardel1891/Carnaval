import {
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useRef, useState } from 'react'
import { MONTEVIDEO_CENTER, type Coords } from './geocode'

// MapLibre busca su worker al lado de su propio módulo, y en el bundle ya no está ahí.
setWorkerUrl(workerUrl)

/** Sin key: sólo un fondo. El punto se puede poner igual, pero sin calles no sirve de mucho. */
const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#e2e8f0' } }],
}

const streetsStyleUrl = (apiKey: string) =>
  `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`

interface Props {
  value: Coords | null
  onChange: (value: Coords) => void
  apiKey: string | undefined
  label: string
}

/** El mapa donde se elige un punto: un toque lo pone, y el marcador se puede arrastrar. */
export default function LocationMap({ value, onChange, apiKey, label }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const change = useRef(onChange)
  useEffect(() => {
    change.current = onChange
  })

  // El punto con el que se abrió: el mapa arranca centrado ahí.
  const initial = useRef(value)

  useEffect(() => {
    if (!container.current) return
    const start = initial.current
    const instance = new MapLibreMap({
      container: container.current,
      style: apiKey ? streetsStyleUrl(apiKey) : BLANK_STYLE,
      center: start ? [start.lng, start.lat] : [MONTEVIDEO_CENTER.lng, MONTEVIDEO_CENTER.lat],
      zoom: start ? 16 : 12,
    })
    instance.addControl(new NavigationControl({ showCompass: false }))
    instance.on('click', (event) =>
      change.current({ lat: event.lngLat.lat, lng: event.lngLat.lng }),
    )
    setMap(instance)
    return () => {
      setMap(null)
      instance.remove()
    }
  }, [apiKey])

  const lat = value?.lat
  const lng = value?.lng
  useEffect(() => {
    if (!map || lat === undefined || lng === undefined) return
    const marker = new Marker({ draggable: true, color: '#b91c1c' })
      .setLngLat([lng, lat])
      .addTo(map)
    marker.on('dragend', () => {
      const at = marker.getLngLat()
      change.current({ lat: at.lat, lng: at.lng })
    })
    // Si el punto quedó fuera de la vista (vino de una búsqueda), el mapa va hasta él.
    if (!map.getBounds().contains([lng, lat])) {
      map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16) })
    }
    return () => {
      marker.remove()
    }
  }, [map, lat, lng])

  return <div ref={container} role="region" aria-label={label} className="h-80 w-full rounded-lg" />
}
