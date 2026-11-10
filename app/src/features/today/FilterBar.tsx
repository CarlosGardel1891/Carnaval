import { useTranslation } from 'react-i18next'
import type { CategoriaConjunto } from '@cuerda/shared'
import { Chip } from '../../components/Chip'
import type { BoardFilters, BoardView } from './useBoardFilters'

interface FilterBarProps {
  filters: BoardFilters
  /** Las categorías que se ofrecen: las que hay esa noche (y las ya elegidas). */
  categories: CategoriaConjunto[]
  /** Mientras se busca la posición, «cerca mío» no se puede tocar. */
  locating: boolean
  onToggleNearby: () => void
  onToggleFree: () => void
  onToggleCategory: (category: CategoriaConjunto) => void
  onView: (view: BoardView) => void
}

export function FilterBar({
  filters,
  categories,
  locating,
  onToggleNearby,
  onToggleFree,
  onToggleCategory,
  onView,
}: FilterBarProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2 pb-3">
      <div
        role="group"
        aria-label={t('filters.label')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1"
      >
        <Chip pressed={filters.nearby} disabled={locating} onClick={onToggleNearby}>
          {t('nearby.label')}
        </Chip>
        <Chip pressed={filters.onlyFree} onClick={onToggleFree}>
          {t('filters.free')}
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category}
            pressed={filters.categories.includes(category)}
            onClick={() => onToggleCategory(category)}
          >
            {t(`category.${category}`)}
          </Chip>
        ))}
      </div>
      <div role="group" aria-label={t('filters.view')} className="flex gap-2">
        <Chip pressed={filters.view === 'stage'} onClick={() => onView('stage')}>
          {t('filters.byStage')}
        </Chip>
        <Chip pressed={filters.view === 'time'} onClick={() => onView('time')}>
          {t('filters.byTime')}
        </Chip>
      </div>
    </div>
  )
}
