import { useSearchParams } from 'react-router'

/**
 * Ruta de la ficha de un escenario. Si se está viendo otra noche (`?noche=`), la ficha
 * abre en esa misma noche; los filtros del pizarrón no viajan.
 */
export function useStagePath(): (slug: string) => string {
  const [params] = useSearchParams()
  const noche = params.get('noche')
  return (slug) =>
    `/escenarios/${encodeURIComponent(slug)}${noche ? `?noche=${encodeURIComponent(noche)}` : ''}`
}
