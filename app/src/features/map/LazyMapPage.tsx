import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

// MapLibre pesa más que todo el resto de la app junto: el mapa va en un archivo aparte,
// que se carga la primera vez que se abre `/mapa`. «Hoy» arranca sin él.
const MapPage = lazy(() => import('./MapPage').then((module) => ({ default: module.MapPage })))

function MapPageFallback() {
  const { t } = useTranslation()
  return (
    <main className="space-y-1 px-4 pt-4">
      <h1 className="text-2xl font-bold">{t('map.title')}</h1>
      <p className="text-soft">{t('map.loading')}</p>
    </main>
  )
}

/** La pantalla del mapa, con carga diferida. */
export function LazyMapPage() {
  return (
    <Suspense fallback={<MapPageFallback />}>
      <MapPage />
    </Suspense>
  )
}
