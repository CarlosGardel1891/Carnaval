import { useTranslation } from 'react-i18next'
import type { Temporada } from '@cuerda/shared'
import { formatIsoDate } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'

interface SeasonCardProps {
  season: Temporada
}

export function SeasonCard({ season }: SeasonCardProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const fmt = (d: string) => formatIsoDate(d, locale)

  return (
    <section className="bg-surface border-line rounded-2xl border p-4">
      <h2 className="text-xl font-semibold">{t('season.title', { year: season.anio })}</h2>
      <p className="text-soft">
        {t('season.dates', { start: fmt(season.fecha_inicio), end: fmt(season.fecha_fin) })}
      </p>
      {season.modo_llamadas_desde && season.modo_llamadas_hasta && (
        <p className="text-soft">
          {t('season.llamadas', {
            start: fmt(season.modo_llamadas_desde),
            end: fmt(season.modo_llamadas_hasta),
          })}
        </p>
      )}
    </section>
  )
}
