import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
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

const badge = 'rounded-md px-2 py-0.5 font-semibold'

export function ActRow({ act, onStage, showStage = false, showDistance = false }: ActRowProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const distanceLabel = useDistanceLabel()
  const stagePath = useStagePath()
  const suspended = act.estado === 'suspendida'

  const details = joinParts([
    t(`category.${act.conjunto_categoria}`),
    act.etapa_rueda && t(`round.${act.etapa_rueda}`),
    // La parada de un itinerante es de la actuación, no del escenario.
    act.itinerante === true && act.direccion,
    showDistance && act.distancia_m !== null && distanceLabel(act.distancia_m),
  ])

  return (
    <li className="flex gap-3 py-3">
      <time
        dateTime={act.inicio}
        className={`w-20 shrink-0 text-lg font-semibold tabular-nums ${suspended ? 'text-soft' : ''}`}
      >
        {formatTime(act.inicio, locale)}
      </time>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold">
          <Link
            to={groupPath(act.conjunto_slug)}
            className="decoration-soft underline underline-offset-4"
          >
            {suspended ? <s>{act.conjunto_nombre}</s> : act.conjunto_nombre}
          </Link>
        </p>
        <p className="text-soft">{details}</p>
        {showStage && (
          <p>
            <Link to={stagePath(act.escenario_slug)} className="text-accent underline">
              {act.escenario_nombre}
            </Link>
          </p>
        )}
        {(onStage || act.estado !== 'programada') && (
          <p className="mt-1 flex flex-wrap gap-2">
            {onStage && (
              <span className={`${badge} bg-accent text-accent-ink`}>{t('today.onStage')}</span>
            )}
            {suspended && (
              <span className={`${badge} border-danger text-danger border`}>
                {t('status.suspendida')}
              </span>
            )}
            {act.estado === 'cambiada' && (
              <span className={`${badge} border-accent text-accent border`}>
                {t('status.cambiada')}
              </span>
            )}
          </p>
        )}
      </div>
    </li>
  )
}
