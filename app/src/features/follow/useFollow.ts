import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { fetchFollowed, followGroup, onUserChange, unfollowGroup } from '../../lib/api'
import { isFollowedActsKey } from '../today/useNightActs'

const FOLLOWED_KEY = ['favoritos'] as const
const FOLLOW_MUTATION = ['seguir'] as const
const NOBODY: ReadonlySet<number> = new Set()

/** Vuelve a pedir los seguidos y lo que depende de ellos: el pizarrón con «mis conjuntos». */
function refreshFollowed(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: ({ queryKey }) => queryKey[0] === FOLLOWED_KEY[0] || isFollowedActsKey(queryKey),
  })
}

/**
 * Los conjuntos que sigue este teléfono. Sin sesión (nunca se siguió nada, o se perdió
 * al reinstalar) la lista viene vacía: no es un error. No se guarda en la caché del
 * teléfono: es del usuario de la sesión, y se vuelve a pedir al abrir.
 */
export function useFollowed() {
  const query = useQuery({
    queryKey: FOLLOWED_KEY,
    queryFn: fetchFollowed,
    staleTime: 5 * 60_000,
    meta: { persist: false },
  })
  const ids = useMemo(() => (query.data ? new Set(query.data) : NOBODY), [query.data])
  return { ids, isPending: query.isPending }
}

/**
 * Mantiene los seguidos al día con la sesión: si aparece, cambia o se pierde, se vuelven
 * a pedir. Se monta una sola vez, en el marco de la app.
 */
export function useSessionSync(): void {
  const queryClient = useQueryClient()
  useEffect(() => {
    let last: string | null | undefined
    return onUserChange((userId) => {
      const changed = last !== undefined && last !== userId
      last = userId
      // Mientras un «Seguir» está en curso (el que crea la sesión), lo que se ve es su
      // cambio optimista: al terminar, él mismo vuelve a pedir la lista.
      if (changed && queryClient.isMutating({ mutationKey: FOLLOW_MUTATION }) === 0) {
        void refreshFollowed(queryClient)
      }
    })
  }, [queryClient])
}

interface FollowChange {
  groupId: number
  follow: boolean
}

/**
 * Seguir o dejar de seguir. El cambio se ve en el momento y, si la base lo rechaza,
 * vuelve atrás. El primer «Seguir» crea la sesión anónima.
 */
export function useToggleFollow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: FOLLOW_MUTATION,
    // De a uno: dos toques seguidos no se pisan entre sí.
    scope: { id: 'seguir' },
    mutationFn: ({ groupId, follow }: FollowChange) =>
      follow ? followGroup(groupId) : unfollowGroup(groupId),
    onMutate: async ({ groupId, follow }) => {
      await queryClient.cancelQueries({ queryKey: FOLLOWED_KEY })
      const previous = queryClient.getQueryData<number[]>(FOLLOWED_KEY)
      const others = (previous ?? []).filter((id) => id !== groupId)
      queryClient.setQueryData<number[]>(FOLLOWED_KEY, follow ? [...others, groupId] : others)
      return { previous }
    },
    onError: (_error, _change, context) => {
      queryClient.setQueryData(FOLLOWED_KEY, context?.previous)
    },
    onSettled: () => refreshFollowed(queryClient),
  })
}
