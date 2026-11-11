import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import type { RouteCorner, StreetClosure } from '../../lib/api'

// Igual que `/mapa`: MapLibre va en un archivo aparte, que se carga la primera vez que se
// abre un mapa. El archivo es de la app: no hace falta red para cargarlo.
const ParadeMap = lazy(() =>
  import('./ParadeMap').then((module) => ({ default: module.ParadeMap })),
)

/** El mapa del recorrido del desfile, con carga diferida. */
export function LazyParadeMap(props: { corners: RouteCorner[]; closures: StreetClosure[] }) {
  const { t } = useTranslation()
  return (
    <Suspense fallback={<p className="text-soft p-4">{t('map.loading')}</p>}>
      <ParadeMap {...props} />
    </Suspense>
  )
}
