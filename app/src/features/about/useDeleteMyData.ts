import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteMyData } from '../../lib/api'
import { preferencesStorage } from '../../lib/preferencesStorage'
import { deletePushToken } from '../../lib/push'
import { CACHE_KEY } from '../../lib/queryCache'
import { ASKED_STORAGE_KEY } from '../push/usePush'

/**
 * Borrar mis datos (decisión 84). Primero la base: el usuario anónimo, con sus seguidos, su
 * dispositivo y sus avisos. Si eso falla no se toca nada más, para poder reintentar. Después,
 * lo del teléfono: el token de avisos, la marca de que ya se preguntó por los avisos y lo que
 * la app tenía guardado.
 */
export function useDeleteMyData() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await deleteMyData()
      // Sin token, este teléfono deja de recibir avisos aunque quedara algo por mandar.
      await deletePushToken().catch(() => undefined)
      await preferencesStorage.removeItem(ASKED_STORAGE_KEY)
      await preferencesStorage.removeItem(CACHE_KEY)
      queryClient.clear()
    },
  })
}
