import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Constants, type CategoriaConjunto } from '@cuerda/shared'

export type BoardView = 'stage' | 'time'

/** Los filtros del pizarrón. Viven en la URL: `?gratis=1&cat=murga,comparsa&vista=hora`. */
export interface BoardFilters {
  onlyFree: boolean
  categories: CategoriaConjunto[]
  view: BoardView
}

const ALL_CATEGORIES = Constants.public.Enums.categoria_conjunto

export function parseFilters(params: URLSearchParams): BoardFilters {
  const requested = (params.get('cat') ?? '').split(',')
  return {
    onlyFree: params.get('gratis') === '1',
    // En el orden de la base y sin valores que no existan.
    categories: ALL_CATEGORIES.filter((category) => requested.includes(category)),
    view: params.get('vista') === 'hora' ? 'time' : 'stage',
  }
}

/** Escribe los filtros sobre los parámetros que ya hay (`noche` y demás no se tocan). */
export function writeFilters(params: URLSearchParams, filters: BoardFilters): URLSearchParams {
  const next = new URLSearchParams(params)
  if (filters.onlyFree) next.set('gratis', '1')
  else next.delete('gratis')
  if (filters.categories.length > 0) next.set('cat', filters.categories.join(','))
  else next.delete('cat')
  if (filters.view === 'time') next.set('vista', 'hora')
  else next.delete('vista')
  return next
}

export function useBoardFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])

  const update = useCallback(
    (change: Partial<BoardFilters>) => {
      // `replace`: cambiar un filtro no suma un paso al botón «atrás».
      setParams((prev) => writeFilters(prev, { ...parseFilters(prev), ...change }), {
        replace: true,
      })
    },
    [setParams],
  )

  const toggleCategory = useCallback(
    (category: CategoriaConjunto) => {
      setParams(
        (prev) => {
          const current = parseFilters(prev)
          const categories = current.categories.includes(category)
            ? current.categories.filter((c) => c !== category)
            : ALL_CATEGORIES.filter((c) => c === category || current.categories.includes(c))
          return writeFilters(prev, { ...current, categories })
        },
        { replace: true },
      )
    },
    [setParams],
  )

  /** Saca los filtros; la vista (por escenario o por hora) no es un filtro y queda. */
  const clear = useCallback(() => update({ onlyFree: false, categories: [] }), [update])

  return {
    filters,
    /** Si hay algún filtro que pueda estar dejando cosas afuera. */
    active: filters.onlyFree || filters.categories.length > 0,
    update,
    toggleCategory,
    clear,
  }
}
