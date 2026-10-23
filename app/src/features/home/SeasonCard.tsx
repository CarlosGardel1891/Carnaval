import { useTranslation } from 'react-i18next'
import type { Temporada } from '@cuerda/shared'
import { formatIsoDate } from '../../lib/formatDate'

interface SeasonCardProps {
  season: Temporada
}

export function SeasonCard({ season }: SeasonCardProps) {
  const { t, i18n } = useTranslation()
  const fmt = (d: string) => formatIsoDate(d, i18n.language)

  return (
    <section className="rounded-2xl bg-white p-4 shadow">
      <h2 className="text-xl font-semibold">{t('season.title', { year: season.anio })}</h2>
      <p className="text-slate-700">
        {t('season.dates', { start: fmt(season.fecha_inicio), end: fmt(season.fecha_fin) })}
      </p>
      {season.modo_llamadas_desde && season.modo_llamadas_hasta && (
        <p className="text-slate-700">
          {t('season.llamadas', {
            start: fmt(season.modo_llamadas_desde),
            end: fmt(season.modo_llamadas_hasta),
          })}
        </p>
      )}
    </section>
  )
}
