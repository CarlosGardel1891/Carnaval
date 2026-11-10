import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const MONTEVIDEO_CENTER: [number, number] = [-56.1913, -34.9058]
const INITIAL_ZOOM = 12

export function MontevideoMap() {
  const { t } = useTranslation()
  const container = useRef<HTMLDivElement>(null)
  const apiKey = import.meta.env.VITE_MAPTILER_KEY

  useEffect(() => {
    if (!apiKey || !container.current) return
    const map = new MapLibreMap({
      container: container.current,
      style: `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`,
      center: MONTEVIDEO_CENTER,
      zoom: INITIAL_ZOOM,
    })
    map.addControl(new NavigationControl({ showCompass: false }))
    return () => map.remove()
  }, [apiKey])

  if (!apiKey) {
    return (
      <div className="flex h-full items-center justify-center bg-surface text-soft p-6 text-center">
        {t('map.missingKey')}
      </div>
    )
  }

  return <div ref={container} className="h-full w-full" role="region" aria-label={t('map.label')} />
}
