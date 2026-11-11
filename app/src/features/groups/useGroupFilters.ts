import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Constants, type CategoriaConjunto } from '@cuerda/shared'

const ALL_CATEGORIES = Constants.public.Enums.categoria_conjunto

export interface GroupFilters {
  text: string
  categories: CategoriaConjunto[]
}

export function parseGroupFilters(params: URLSearchParams): GroupFilters {
  const requested = (params.get('cat') ?? '').split(',')
  return {
    text: params.get('q') ?? '',
    categories: ALL_CATEGORIES.filter((category) => requested.includes(category)),
  }
}

function write(params: URLSearchParams, filters: GroupFilters): URLSearchParams {
  const next = new URLSearchParams(params)
  if (filters.text !== '') next.set('q', filters.text)
  else next.delete('q')
  if (filters.categories.length > 0) next.set('cat', filters.categories.join(','))
  else next.delete('cat')
  return next
}

/**
 * La búsqueda y los filtros de la lista de conjuntos. Viven en la URL (`?q=…&cat=murga`),
 * así al volver de una ficha la lista queda como estaba; cambian con `replace`.
 */
export function useGroupFilters() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseGroupFilters(params), [params])

  const change = useCallback(
    (update: (current: GroupFilters) => GroupFilters) => {
      setParams((prev) => write(prev, update(parseGroupFilters(prev))), { replace: true })
    },
    [setParams],
  )

  const setText = useCallback(
    (text: string) => change((current) => ({ ...current, text })),
    [change],
  )
  const toggleCategory = useCallback(
    (category: CategoriaConjunto) =>
      change((current) => ({
        ...current,
        categories: current.categories.includes(category)
          ? current.categories.filter((c) => c !== category)
          : ALL_CATEGORIES.filter((c) => c === category || current.categories.includes(c)),
      })),
    [change],
  )
  const clear = useCallback(() => change(() => ({ text: '', categories: [] })), [change])

  return {
    filters,
    active: filters.text !== '' || filters.categories.length > 0,
    setText,
    toggleCategory,
    clear,
  }
}
