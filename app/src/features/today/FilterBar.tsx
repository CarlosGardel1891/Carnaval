import { useTranslation } from 'react-i18next'
import type { CategoriaConjunto } from '@cuerda/shared'
import { HeartIcon, NearIcon } from '../../components/ui/icons'
import { FilterChip, Segmented } from '../../components/ui/primitives'
import type { BoardFilters, BoardView } from './useBoardFilters'

interface FilterBarProps {
  filters: BoardFilters
  /** Las categorías que se ofrecen: las que hay esa noche (y las ya elegidas). */
  categories: CategoriaConjunto[]
  /** Mientras se busca la posición, «cerca mío» no se puede tocar. */
  locating: boolean
  onToggleNearby: () => void
  onToggleFree: () => void
  onToggleMine: () => void
  onToggleCategory: (category: CategoriaConjunto) => void
  onView: (view: BoardView) => void
}

/** Los filtros, en un carrusel de chips, y la vista, en un control segmentado. */
export function FilterBar({
  filters,
  categories,
  locating,
  onToggleNearby,
  onToggleFree,
  onToggleMine,
  onToggleCategory,
  onView,
}: FilterBarProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-3 pb-4">
      <div
        role="group"
        aria-label={t('filters.label')}
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1"
      >
        <FilterChip
          pressed={filters.nearby}
          disabled={locating}
          onClick={onToggleNearby}
          icon={<NearIcon className="size-4" />}
        >
          {t('nearby.label')}
        </FilterChip>
        <FilterChip pressed={filters.onlyFree} onClick={onToggleFree}>
          {t('filters.free')}
        </FilterChip>
        <FilterChip
          pressed={filters.mine}
          onClick={onToggleMine}
          icon={<HeartIcon className="size-4" filled={filters.mine} />}
        >
          {t('filters.mine')}
        </FilterChip>
        {categories.map((category) => (
          <FilterChip
            key={category}
            category={category}
            pressed={filters.categories.includes(category)}
            onClick={() => onToggleCategory(category)}
          >
            {t(`category.${category}`)}
          </FilterChip>
        ))}
      </div>
      <Segmented
        label={t('filters.view')}
        value={filters.view}
        onChange={onView}
        options={[
          { value: 'stage', label: t('filters.byStage') },
          { value: 'time', label: t('filters.byTime') },
        ]}
      />
    </div>
  )
}
