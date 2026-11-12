import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

// MapLibre pesa más que todo el resto de la app junto: el mapa va en un archivo aparte,
// que se carga la primera vez que se abre `/mapa`. «Hoy» arranca sin él.
const MapPage = lazy(() => import('./MapPage').then((module) => ({ default: module.MapPage })))

function MapPageFallback() {
  const { t } = useTranslation()
  return (
    <main className="px-3 pt-3">
      <div className="bg-surface shadow-card rounded-[1.375rem] px-4 py-3">
        <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight">
          {t('map.title')}
        </h1>
        <p className="text-soft mt-1 text-sm">{t('map.loading')}</p>
      </div>
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
