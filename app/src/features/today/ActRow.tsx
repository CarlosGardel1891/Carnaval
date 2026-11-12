import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { CategoryPill, LivePill, Pill } from '../../components/ui/primitives'
import { ChevronRightIcon } from '../../components/ui/icons'
import type { Act } from '../../lib/api'
import { formatTime } from '../../lib/format'
import { joinParts } from '../../lib/labels'
import { useLocale } from '../../lib/useLocale'
import { useDistanceLabel } from '../location/useDistanceLabel'
import { groupPath } from '../groups/groupPath'
import { useStagePath } from '../stages/stagePath'

interface ActRowProps {
  act: Act
  onStage: boolean
  /** En la lista por hora cada fila dice en qué escenario es. */
  showStage?: boolean
  /** En «cerca mío» por hora, cada fila lleva su distancia. */
  showDistance?: boolean
}

/**
 * Una actuación del pizarrón (decisión 92): la hora y el conjunto mandan; la categoría va
 * debajo, como píldora en su color. Toda la fila lleva a la ficha del conjunto.
 */
export function ActRow({ act, onStage, showStage = false, showDistance = false }: ActRowProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const distanceLabel = useDistanceLabel()
  const stagePath = useStagePath()
  const suspended = act.estado === 'suspendida'

  const details = joinParts([
    act.etapa_rueda && t(`round.${act.etapa_rueda}`),
    // La parada de un itinerante es de la actuación, no del escenario.
    act.itinerante === true && act.direccion,
    showDistance && act.distancia_m !== null && distanceLabel(act.distancia_m),
  ])

  return (
    <li
      className={`relative flex items-center gap-3 px-4 py-3.5 ${onStage ? 'bg-sun-soft/60' : ''}`}
    >
      <time
        dateTime={act.inicio}
        className={`w-[3.75rem] shrink-0 self-start pt-px text-[1.0625rem] font-extrabold tabular-nums ${
          suspended ? 'text-soft line-through' : onStage ? 'text-sun-ink' : 'text-ink'
        }`}
      >
        {formatTime(act.inicio, locale)}
      </time>
      <div className="min-w-0 flex-1">
        <p className="text-[1.0625rem] leading-snug font-bold">
          {/* El enlace cubre toda la fila: se toca en cualquier lado. */}
          <Link to={groupPath(act.conjunto_slug)} className="after:absolute after:inset-0">
            {suspended ? <s className="text-soft">{act.conjunto_nombre}</s> : act.conjunto_nombre}
          </Link>
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <CategoryPill category={act.conjunto_categoria}>
            {t(`category.${act.conjunto_categoria}`)}
          </CategoryPill>
          {onStage && <LivePill>{t('today.onStage')}</LivePill>}
          {suspended && <Pill tone="danger">{t('status.suspendida')}</Pill>}
          {act.estado === 'cambiada' && <Pill tone="amber">{t('status.cambiada')}</Pill>}
        </p>
        {details && <p className="text-soft mt-1 text-sm">{details}</p>}
        {showStage && (
          <p className="mt-0.5 text-sm">
            <Link
              to={stagePath(act.escenario_slug)}
              className="text-accent relative z-10 -my-2 inline-flex min-h-11 items-center font-bold"
            >
              {act.escenario_nombre}
            </Link>
          </p>
        )}
      </div>
      <ChevronRightIcon className="text-soft size-5 shrink-0 opacity-40" />
    </li>
  )
}
