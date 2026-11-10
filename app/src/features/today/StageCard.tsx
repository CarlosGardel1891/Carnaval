import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { joinParts, priceLabel } from '../../lib/labels'
import { useDistanceLabel } from '../location/useDistanceLabel'
import { useStagePath } from '../stages/stagePath'
import { ActRow } from './ActRow'
import type { StageGroup } from './board'

interface StageCardProps {
  group: StageGroup
  onStage: ReadonlySet<number>
}

/** Un escenario del pizarrón: su encabezado (que lleva a la ficha) y lo que pasa esa noche. */
export function StageCard({ group, onStage }: StageCardProps) {
  const { t } = useTranslation()
  const distanceLabel = useDistanceLabel()
  const stagePath = useStagePath()
  const headingId = useId()

  const summary = joinParts([
    group.tipo && t(`stageType.${group.tipo}`),
    group.barrio,
    priceLabel(t, group.gratis, group.precio_texto),
  ])

  return (
    <section aria-labelledby={headingId} className="bg-surface border-line rounded-2xl border">
      <Link to={stagePath(group.slug)} className="flex min-h-12 items-center gap-3 px-4 pt-3 pb-2">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-xl font-bold">
            {group.nombre}
          </h2>
          {summary && <p className="text-soft">{summary}</p>}
          {group.distancia_m !== null && (
            <p className="text-accent font-semibold">{distanceLabel(group.distancia_m)}</p>
          )}
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="text-soft size-6 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
      <ul className="divide-line border-line divide-y border-t px-4">
        {group.acts.map((act) => (
          <ActRow
            key={act.actuacion_id}
            act={act}
            onStage={onStage.has(act.actuacion_id)}
            // Un itinerante tiene una parada por actuación: cada una con su distancia.
            showDistance={group.itinerante}
          />
        ))}
      </ul>
    </section>
  )
}
