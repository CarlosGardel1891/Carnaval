import { useTranslation } from 'react-i18next'
import { paradeRules } from '@cuerda/shared'
import type { ParadeEvent } from '../../lib/api'
import { formatTime } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'

/**
 * Una hora estimada. Nunca se muestra una hora sola (decisión 63): lleva «≈» adelante y,
 * para quien no ve la pantalla, dice «hora estimada».
 */
export function EstimatedTime({
  time,
  className = 'font-bold',
}: {
  time: Date
  className?: string
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const text = formatTime(time.toISOString(), locale)
  return (
    <time
      dateTime={time.toISOString()}
      aria-label={t('llamadas.estimatedAt', { time: text })}
      className={`tabular-nums ${className}`}
    >
      ≈ {text}
    </time>
  )
}

/** La explicación de dónde salen las horas, y el atraso si el desfile lo lleva. */
export function EstimateNote({ night }: { night: ParadeEvent }) {
  const { t } = useTranslation()
  const rules = paradeRules(night)
  return (
    <div className="text-soft space-y-1 px-1 pb-3 text-sm">
      <p>
        <span className="text-ink font-bold">{t('llamadas.estimated')}.</span>{' '}
        {t('llamadas.estimateNote', {
          start: rules.start.slice(0, 5),
          interval: rules.intervalMin,
          gap: rules.gapM,
        })}
      </p>
      {rules.delayMin > 0 && (
        <p className="bg-amber-soft text-amber rounded-2xl px-4 py-2.5 font-bold">
          {t('llamadas.delay', { count: rules.delayMin })}
        </p>
      )}
    </div>
  )
}
