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

  if (season.isPending) return <p className="text-soft">{t('today.loading')}</p>

  const current = season.data
  if (!current) return <p className="text-lg">{t('today.offSeason')}</p>

  if (noche < current.fecha_inicio) {
    return (
      <div className="space-y-4">
        <p className="text-lg">
          {t('today.beforeSeason', {
            year: current.anio,
            date: formatIsoDate(current.fecha_inicio, locale),
          })}
        </p>
        <SeasonCard season={current} />
      </div>
    )
  }

  return <p className="text-lg">{t('today.emptyNight')}</p>
}
