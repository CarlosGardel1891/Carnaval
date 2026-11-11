import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import type { StreetClosure } from '../../lib/api'
import { formatDateTime, formatDistance } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { LazyParadeMap } from '../map/LazyParadeMap'
import { useLlamadasNight } from './llamadasContext'
import { paradeRouteQuery, streetClosuresQuery } from './useLlamadas'

const badge = 'rounded-md border px-2 py-0.5 text-sm font-semibold'

// Los mismos colores con los que el mapa dibuja cada cosa (`features/map/ParadeMap.tsx`).
const SWATCH = {
  recorrido: 'bg-[#fbbf24]',
  corte: 'bg-[#fca5a5]',
  estacionamiento: 'bg-[#cbd5e1]',
} as const

/** De dónde salió el dato: sólo se enlazan direcciones web, con el nombre del sitio. */
function sourceLinks(urls: string[]): { url: string; site: string }[] {
  return [...new Set(urls)].flatMap((url) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return []
      return [{ url, site: parsed.hostname.replace(/^www\./, '') }]
    } catch {
      return []
    }
  })
}

function Closure({ closure }: { closure: StreetClosure }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const when = [
    closure.desde && t('llamadas.route.from', { when: formatDateTime(closure.desde, locale) }),
    closure.hasta && t('llamadas.route.until', { when: formatDateTime(closure.hasta, locale) }),
  ].filter(Boolean)
  return (
    <li className="space-y-1 py-3">
      <p className="text-lg">{closure.descripcion}</p>
      {when.length > 0 && <p className="text-soft">{when.join(' · ')}</p>}
      {closure.estado === 'estimado' && (
        <p>
          <span className={`${badge} border-accent text-accent`}>
            {t('llamadas.route.estimated')}
          </span>
        </p>
      )}
    </li>
  )
}

/**
 * El recorrido de la noche: el mapa con la línea, las esquinas y los cortes, y debajo lo
 * mismo en una lista, para quien no ve el mapa. Todo sale de lo ya descargado.
 */
export function RouteView() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { night } = useLlamadasNight()
  const route = useQuery(paradeRouteQuery(night.id))
  const closuresQuery = useQuery(streetClosuresQuery(night.id))
  const corners = route.data ?? []
  const closures = closuresQuery.data ?? []

  if (route.isPending) return <p className="text-soft py-4">{t('llamadas.loading')}</p>
  if (route.isError && !route.data) {
    return (
      <div role="alert" className="space-y-3 py-4">
        <p className="text-lg">{t('llamadas.routeError')}</p>
        <Button onClick={() => void route.refetch()}>{t('today.retry')}</Button>
      </div>
    )
  }
  if (corners.length < 2) return <p className="py-4 text-lg">{t('llamadas.noRoute')}</p>

  const groups = (['corte', 'estacionamiento'] as const)
    .map((tipo) => ({ tipo, items: closures.filter((closure) => closure.tipo === tipo) }))
    .filter((group) => group.items.length > 0)
  const sources = sourceLinks([
    ...night.recorrido_fuente_url,
    ...closures.flatMap((closure) => closure.fuente_url),
  ])
  const lengthM = corners.at(-1)!.distancia_m

  return (
    <div className="space-y-4 pt-2">
      <section aria-labelledby="recorrido" className="space-y-2">
        <h2 id="recorrido" className="text-xl font-bold">
          {t('llamadas.route.title')}
        </h2>
        {night.recorrido_estado === 'estimado' && (
          <p className="text-soft">{t('llamadas.routeEstimated')}</p>
        )}
        <div className="border-line -mx-4 h-80 overflow-hidden border-y sm:mx-0 sm:rounded-2xl sm:border">
          <LazyParadeMap corners={corners} closures={closures} />
        </div>
        <ul aria-label={t('map.legend')} className="text-soft flex flex-wrap gap-x-4 gap-y-1">
          {(['recorrido', 'corte', 'estacionamiento'] as const).map((kind) => (
            <li key={kind} className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-1.5 w-6 rounded-full ${SWATCH[kind]}`} />
              {t(`llamadas.route.legend.${kind}`)}
            </li>
          ))}
        </ul>
        <p className="text-soft">
          {t('llamadas.route.length', {
            blocks: corners.length - 1,
            distance: formatDistance(lengthM, locale),
          })}
        </p>
        <ol className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
          {corners.map((corner, i) => (
            <li key={corner.orden} className="flex flex-wrap items-baseline gap-x-2 py-3">
              <span className="text-lg font-semibold">
                {t('llamadas.route.corner', { street: corner.calle, cross: corner.cruce })}
              </span>
              {(i === 0 || i === corners.length - 1) && (
                <span className={`${badge} bg-accent text-accent-ink border-accent`}>
                  {t(i === 0 ? 'llamadas.route.start' : 'llamadas.route.end')}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="cortes" className="space-y-2">
        <h2 id="cortes" className="text-xl font-bold">
          {t('llamadas.route.closures')}
        </h2>
        {closuresQuery.isPending ? (
          <p className="text-soft">{t('llamadas.loading')}</p>
        ) : groups.length === 0 ? (
          <p className="text-lg">{t('llamadas.route.noClosures')}</p>
        ) : (
          groups.map(({ tipo, items }) => (
            <div key={tipo}>
              <h3 className="text-soft text-lg font-semibold">
                {t(`llamadas.route.kind.${tipo}`)}
              </h3>
              <ul className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
                {items.map((closure) => (
                  <Closure key={closure.corte_id} closure={closure} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section aria-labelledby="fuente-recorrido" className="space-y-1">
        <h2 id="fuente-recorrido" className="text-xl font-bold">
          {t('event.source')}
        </h2>
        <ul className="flex flex-wrap gap-x-4">
          {sources.map(({ url, site }) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-accent inline-flex min-h-12 items-center underline"
              >
                {site}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-soft text-sm">{t('llamadas.route.osm')}</p>
      </section>
    </div>
  )
}
