import { useMemo } from 'react'
import { Card } from '../../components/ui/primitives'
import type { Act } from '../../lib/api'
import { ActRow } from './ActRow'
import { groupByStage, nowIndex, sortByDistance, sortByFirstStart } from './board'
import { StageCard } from './StageCard'
import type { BoardView } from './useBoardFilters'

interface NightBoardProps {
  acts: Act[]
  onStage: ReadonlySet<number>
  view?: BoardView
  /** Con «cerca mío»: los escenarios se ordenan por distancia. */
  byDistance?: boolean
  /** La hora actual, si es la noche en curso: marca la fila hasta la que baja «Ver todo». */
  now?: Date | null
}

/** El pizarrón de la noche: una tarjeta por escenario o, en una sola lista, por hora. */
export function NightBoard({
  acts,
  onStage,
  view = 'stage',
  byDistance = false,
  now = null,
}: NightBoardProps) {
  const groups = useMemo(() => {
    const grouped = groupByStage(acts)
    return byDistance ? sortByDistance(grouped) : sortByFirstStart(grouped)
  }, [acts, byDistance])

  if (view === 'time') {
    const current = now ? nowIndex(acts, onStage, now) : -1
    return (
      <Card>
        <ul className="divide-line divide-y">
          {acts.map((act, index) => (
            <ActRow
              key={act.actuacion_id}
              act={act}
              onStage={onStage.has(act.actuacion_id)}
              anchor={index === current}
              showStage
              showDistance={byDistance}
            />
          ))}
        </ul>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <StageCard key={group.escenario_id} group={group} onStage={onStage} />
      ))}
    </div>
  )
}
