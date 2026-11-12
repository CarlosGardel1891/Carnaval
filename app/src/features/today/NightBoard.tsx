import { useMemo } from 'react'
import { Card } from '../../components/ui/primitives'
import type { Act } from '../../lib/api'
import { ActRow } from './ActRow'
import { groupByStage, sortByDistance, sortByFirstStart } from './board'
import { StageCard } from './StageCard'
import type { BoardView } from './useBoardFilters'

interface NightBoardProps {
  acts: Act[]
  onStage: ReadonlySet<number>
  view?: BoardView
  /** Con «cerca mío»: los escenarios se ordenan por distancia. */
  byDistance?: boolean
}

/** El pizarrón de la noche: una tarjeta por escenario o, en una sola lista, por hora. */
export function NightBoard({ acts, onStage, view = 'stage', byDistance = false }: NightBoardProps) {
  const groups = useMemo(() => {
    const grouped = groupByStage(acts)
    return byDistance ? sortByDistance(grouped) : sortByFirstStart(grouped)
  }, [acts, byDistance])

  if (view === 'time') {
    return (
      <Card>
        <ul className="divide-line divide-y">
          {acts.map((act) => (
            <ActRow
              key={act.actuacion_id}
              act={act}
              onStage={onStage.has(act.actuacion_id)}
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
