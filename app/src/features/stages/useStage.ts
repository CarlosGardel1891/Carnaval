import { useQuery } from '@tanstack/react-query'
import { fetchStage, type Act, type Stage } from '../../lib/api'

/** Los datos de un escenario. Cambian poco: 5 minutos de gracia. */
export function useStage(slug: string) {
  return useQuery({
    queryKey: ['escenario', slug],
    queryFn: () => fetchStage(slug),
    staleTime: 5 * 60_000,
  })
}

/**
 * El escenario tal como viene en sus actuaciones de la noche: alcanza para mostrar la
 * ficha mientras llega (o si falla) la consulta del escenario.
 */
export function stageFromActs(acts: Act[]): Stage | null {
  const act = acts[0]
  if (!act) return null
  const itinerante = act.itinerante === true
  return {
    id: act.escenario_id,
    slug: act.escenario_slug,
    nombre: act.escenario_nombre,
    tipo: act.escenario_tipo,
    barrio: act.escenario_barrio,
    // La dirección de la actuación de un itinerante es la de esa parada, no la del escenario.
    direccion: itinerante ? null : act.direccion,
    gratis: act.gratis,
    precio_texto: act.precio_texto,
    itinerante,
  }
}
