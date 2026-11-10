import { useMemo } from 'react'
import type { Act } from '../../lib/api'
import { ActRow } from './ActRow'
import { groupByStage, sortByDistance, sortByFirstStart } from './board'
import { StageCard } from './StageCard'

export type BoardView = 'stage' | 'time'

interface NightBoardProps {
  acts: Act[]
  onStage: ReadonlySet<number>
  view?: BoardView
  /** Con «cerca mío»: los escenarios se ordenan por distancia. */
  byDistance?: boolean
}

/** El pizarrón de la noche: por escenario o, en una sola lista, por hora. */
export function NightBoard({ acts, onStage, view = 'stage', byDistance = false }: NightBoardProps) {
  const groups = useMemo(() => {
    const grouped = groupByStage(acts)
    return byDistance ? sortByDistance(grouped) : sortByFirstStart(grouped)
  }, [acts, byDistance])

  if (view === 'time') {
    return (
      <ul className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
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
