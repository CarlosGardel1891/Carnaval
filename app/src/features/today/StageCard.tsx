import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Card, Pill } from '../../components/ui/primitives'
import { joinParts, priceLabel } from '../../lib/labels'
import { useDistanceLabel } from '../location/useDistanceLabel'
import { useStagePath } from '../stages/stagePath'
import { ActRow } from './ActRow'
import type { StageGroup } from './board'

interface StageCardProps {
  group: StageGroup
  onStage: ReadonlySet<number>
}

/**
 * Un escenario del pizarrón: su encabezado (que lleva a la ficha), con el tipo y el barrio
 * debajo y el precio o «Gratis» en una píldora, y lo que pasa esa noche.
 */
export function StageCard({ group, onStage }: StageCardProps) {
  const { t } = useTranslation()
  const distanceLabel = useDistanceLabel()
  const stagePath = useStagePath()
  const headingId = useId()

  const summary = joinParts([group.tipo && t(`stageType.${group.tipo}`), group.barrio])
  const price = priceLabel(t, group.gratis, group.precio_texto)

  return (
    <section aria-labelledby={headingId}>
      <Card>
        <Link
          to={stagePath(group.slug)}
          className="flex min-h-14 items-start gap-3 px-4 pt-4 pb-3.5"
        >
          <div className="min-w-0 flex-1">
            <h2
              id={headingId}
              className="text-[1.1875rem] leading-tight font-extrabold tracking-tight"
            >
              {group.nombre}
            </h2>
            {summary && <p className="text-soft mt-0.5 text-[0.9375rem]">{summary}</p>}
            {group.distancia_m !== null && (
              <p className="text-accent mt-0.5 text-[0.9375rem] font-bold">
                {distanceLabel(group.distancia_m)}
              </p>
            )}
          </div>
          {price && (
            <Pill tone={group.gratis === true ? 'ok' : 'neutral'} className="mt-0.5 max-w-[45%]">
              <span className="truncate">{price}</span>
            </Pill>
          )}
        </Link>
        <ul className="divide-line border-line divide-y border-t">
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
      </Card>
    </section>
  )
}
