import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Avatar, Card, LivePill, SectionHeader } from '../../components/ui/primitives'
import type { Act } from '../../lib/api'
import { groupPath } from '../groups/groupPath'

interface SummaryProps {
  acts: number
  stages: number
  onStage: number
}

/**
 * El resumen de la noche, montado sobre el borde del encabezado: cuántas actuaciones, en
 * cuántos escenarios y cuántos conjuntos están en escena en este momento.
 */
export function NightSummary({ acts, stages, onStage }: SummaryProps) {
  const { t } = useTranslation()
  const items = [
    { value: acts, label: t('today.summary.acts', { count: acts }), live: false },
    { value: stages, label: t('today.summary.stages', { count: stages }), live: false },
    { value: onStage, label: t('today.summary.onStage', { count: onStage }), live: onStage > 0 },
  ]
  return (
    <Card>
      <dl className="divide-line grid grid-cols-3 divide-x py-4">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col-reverse items-center px-2 text-center">
            <dt className="text-soft text-[0.8125rem] leading-tight font-semibold">{item.label}</dt>
            <dd
              className={`flex items-center gap-1.5 text-[1.75rem] leading-none font-extrabold tabular-nums ${
                item.live ? 'text-sun-ink' : 'text-brand'
              }`}
            >
              {item.live && <span className="live-dot" aria-hidden="true" />}
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

/** El carrusel «Ahora en escena»: los conjuntos que están actuando en este momento. */
export function NowOnStage({ acts, onSeeAll }: { acts: Act[]; onSeeAll?: () => void }) {
  const { t } = useTranslation()
  const headingId = useId()
  if (acts.length === 0) return null
  return (
    <section aria-labelledby={headingId} className="pt-1">
      <SectionHeader
        id={headingId}
        title={t('today.onStage')}
        action={onSeeAll && { label: t('today.seeAll'), onClick: onSeeAll }}
      />
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
        {acts.map((act) => (
          <li key={act.actuacion_id} className="w-[11.5rem] shrink-0">
            <Link
              to={groupPath(act.conjunto_slug)}
              className="pressable bg-surface shadow-card block h-full rounded-[1.375rem] p-4"
            >
              <span className="flex items-start justify-between gap-2">
                <Avatar
                  name={act.conjunto_nombre}
                  category={act.conjunto_categoria}
                  photoUrl={act.conjunto_foto_url}
                />
                <LivePill>{t('today.now')}</LivePill>
              </span>
              <span className="mt-3 block text-[1.0625rem] leading-snug font-bold">
                {act.conjunto_nombre}
              </span>
              <span className="text-soft mt-0.5 block text-sm">{act.escenario_nombre}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
