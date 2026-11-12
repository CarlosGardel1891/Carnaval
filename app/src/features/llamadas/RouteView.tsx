import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { EmptyStageArt, OfflineArt } from '../../components/ui/illustrations'
import {
  Card,
  EmptyState,
  Pill,
  PrimaryButton,
  SectionHeader,
} from '../../components/ui/primitives'
import type { StreetClosure } from '../../lib/api'
import { formatDateTime, formatDistance } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { LazyParadeMap } from '../map/LazyParadeMap'
import { useLlamadasNight } from './llamadasContext'
import { paradeRouteQuery, streetClosuresQuery } from './useLlamadas'

// Los mismos colores con los que el mapa dibuja cada cosa (`features/map/ParadeMap.tsx`).
const SWATCH = {
  recorrido: 'bg-[#0448a7]',
  corte: 'bg-[#ef4444]/45',
  estacionamiento: 'bg-[#5b6b82]',
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
    <li className="space-y-1 px-4 py-3">
      <p className="font-bold">{closure.descripcion}</p>
      {when.length > 0 && <p className="text-soft text-sm">{when.join(' · ')}</p>}
      {closure.estado === 'estimado' && (
        <p className="pt-0.5">
          <Pill tone="amber">{t('llamadas.route.estimated')}</Pill>
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

  if (route.isPending) return <p className="text-soft py-6 text-center">{t('llamadas.loading')}</p>
  if (route.isError && !route.data) {
    return (
      <div role="alert">
        <EmptyState
          illustration={<OfflineArt />}
          title={t('llamadas.routeError')}
          action={
            <PrimaryButton onClick={() => void route.refetch()}>{t('today.retry')}</PrimaryButton>
          }
        />
      </div>
    )
  }
  if (corners.length < 2) {
    return <EmptyState illustration={<EmptyStageArt />}>{t('llamadas.noRoute')}</EmptyState>
  }

  const groups = (['corte', 'estacionamiento'] as const)
    .map((tipo) => ({ tipo, items: closures.filter((closure) => closure.tipo === tipo) }))
    .filter((group) => group.items.length > 0)
  const sources = sourceLinks([
    ...night.recorrido_fuente_url,
    ...closures.flatMap((closure) => closure.fuente_url),
  ])
  const lengthM = corners.at(-1)!.distancia_m

  return (
    <div className="space-y-5">
      <section aria-labelledby="recorrido" className="space-y-3">
        <div className="-mb-2">
          <SectionHeader id="recorrido" title={t('llamadas.route.title')} />
        </div>
        {night.recorrido_estado === 'estimado' && (
          <p className="text-soft px-1 text-sm">{t('llamadas.routeEstimated')}</p>
        )}
        <div className="shadow-card h-80 overflow-hidden rounded-[1.375rem]">
          <LazyParadeMap corners={corners} closures={closures} />
        </div>
        <ul
          aria-label={t('map.legend')}
          className="text-soft flex flex-wrap gap-x-4 gap-y-1 px-1 text-sm font-semibold"
        >
          {(['recorrido', 'corte', 'estacionamiento'] as const).map((kind) => (
            <li key={kind} className="flex items-center gap-2">
              <span aria-hidden="true" className={`h-1.5 w-6 rounded-full ${SWATCH[kind]}`} />
              {t(`llamadas.route.legend.${kind}`)}
            </li>
          ))}
        </ul>
        <p className="text-soft px-1 text-sm">
          {t('llamadas.route.length', {
            blocks: corners.length - 1,
            distance: formatDistance(lengthM, locale),
          })}
        </p>
        <Card>
          <ol className="divide-line divide-y">
            {corners.map((corner, i) => (
              <li
                key={corner.orden}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 py-3"
              >
                <span className="font-bold">
                  {t('llamadas.route.corner', { street: corner.calle, cross: corner.cruce })}
                </span>
                {(i === 0 || i === corners.length - 1) && (
                  <span className="bg-brand rounded-full px-2.5 py-0.5 text-[0.8125rem] font-bold text-white">
                    {t(i === 0 ? 'llamadas.route.start' : 'llamadas.route.end')}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <section aria-labelledby="cortes">
        <SectionHeader id="cortes" title={t('llamadas.route.closures')} />
        {closuresQuery.isPending ? (
          <p className="text-soft px-1">{t('llamadas.loading')}</p>
        ) : groups.length === 0 ? (
          <Card className="p-4">
            <p className="text-soft">{t('llamadas.route.noClosures')}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {groups.map(({ tipo, items }) => (
              <div key={tipo}>
                <h3 className="text-brand px-1 pb-2 text-[0.75rem] font-extrabold tracking-[0.08em] uppercase">
                  {t(`llamadas.route.kind.${tipo}`)}
                </h3>
                <Card>
                  <ul className="divide-line divide-y">
                    {items.map((closure) => (
                      <Closure key={closure.corte_id} closure={closure} />
                    ))}
                  </ul>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="fuente-recorrido">
        <SectionHeader id="fuente-recorrido" title={t('event.source')} />
        <ul className="flex flex-wrap gap-x-4 px-1">
          {sources.map(({ url, site }) => (
            <li key={url}>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-accent inline-flex min-h-11 items-center font-bold"
              >
                {site}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-soft px-1 text-sm">{t('llamadas.route.osm')}</p>
      </section>
    </div>
  )
}
