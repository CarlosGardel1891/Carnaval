import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchGroup,
  fetchUpcomingActs,
  type Group,
  type GroupDetail,
  type UpcomingAct,
} from '../../lib/api'
import { REFRESH_MS } from '../today/useNightActs'

/** Los datos de un conjunto. Cambian poco: 5 minutos de gracia. */
export function useGroup(slug: string) {
  return useQuery({
    queryKey: ['conjunto', slug],
    queryFn: () => fetchGroup(slug),
    staleTime: 5 * 60_000,
  })
}

/**
 * El conjunto tal como está en la lista ya cargada: alcanza para mostrar la ficha
 * mientras llega (o si falla) su consulta. Le faltan la bio y las redes.
 */
export function useGroupFromList(slug: string): GroupDetail | null {
  const listed = useQueryClient()
    .getQueryData<Group[]>(['conjuntos'])
    ?.find((group) => group.slug === slug)
  if (!listed) return null
  const { id, nombre, categoria, barrio, foto_url, temporadas } = listed
  return {
    id,
    slug,
    nombre,
    categoria,
    barrio,
    foto_url,
    temporadas,
    bio: null,
    instagram: null,
    facebook: null,
  }
}

/** Lo que le queda al conjunto desde esa noche. Se refresca como la grilla. */
export function useUpcomingActs(groupId: number | undefined, noche: string) {
  return useQuery({
    queryKey: ['proximas', groupId, noche],
    queryFn: () => fetchUpcomingActs(groupId as number, noche),
    enabled: groupId !== undefined,
    staleTime: 60_000,
    refetchInterval: REFRESH_MS,
    refetchIntervalInBackground: false,
  })
}

export interface UpcomingNight {
  noche: string
  acts: UpcomingAct[]
}

/** Las actuaciones agrupadas por noche lógica, en el orden en que llegan (por hora). */
export function byNight(acts: UpcomingAct[]): UpcomingNight[] {
  const nights: UpcomingNight[] = []
  for (const act of acts) {
    const last = nights[nights.length - 1]
    if (last && last.noche === act.noche) last.acts.push(act)
    else nights.push({ noche: act.noche, acts: [act] })
  }
  return nights
}
