import { EmptyStageArt } from '../../components/ui/illustrations'
import { EmptyState } from '../../components/ui/primitives'
import { useTranslation } from 'react-i18next'
import { formatIsoDate } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { SeasonCard } from '../season/SeasonCard'
import { useCurrentSeason } from '../season/useCurrentSeason'

/**
 * Una noche sin actuaciones. Antes de la temporada dice cuándo arranca; en temporada,
 * que todavía no hay nada cargado; si no, que esa noche no hay nada.
 */
export function EmptyNight({ noche }: { noche: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const season = useCurrentSeason(noche)

  if (season.isPending) return <p className="text-soft py-6 text-center">{t('today.loading')}</p>

  const current = season.data
  if (!current) return <EmptyState illustration={<EmptyStageArt />} title={t('today.offSeason')} />

  if (noche < current.fecha_inicio) {
    return (
      <div className="space-y-2">
        <EmptyState
          illustration={<EmptyStageArt />}
          title={t('today.beforeSeason', {
            year: current.anio,
            date: formatIsoDate(current.fecha_inicio, locale),
          })}
        />
        <SeasonCard season={current} />
      </div>
    )
  }

  return <EmptyState illustration={<EmptyStageArt />} title={t('today.emptyNight')} />
}
