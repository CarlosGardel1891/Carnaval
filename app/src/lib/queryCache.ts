import { Preferences } from '@capacitor/preferences'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient, type Query } from '@tanstack/react-query'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'

/** Cuánto vale lo guardado: pasado un día, la grilla vieja confunde más de lo que ayuda. */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60_000

/**
 * Versión de lo guardado. Subirla cuando cambie la forma de lo que devuelven las
 * consultas: al abrir, la app descarta lo que guardó una versión anterior.
 */
export const CACHE_VERSION = '1'

/** La clave bajo la que se guarda la caché en `@capacitor/preferences`. */
export const CACHE_KEY = 'cuerda-cache'

/**
 * Una consulta se guarda si tiene datos (aunque el último intento haya fallado: sin
 * red, lo último que cargó es justo lo que hay que conservar), si no tiene más de un
 * día y si no pidió quedar afuera con `meta: { persist: false }`, como las que llevan
 * la posición del usuario.
 */
export function shouldPersistQuery(query: Query, now = Date.now()): boolean {
  if (query.meta?.persist === false) return false
  if (query.state.data === undefined) return false
  return now - query.state.dataUpdatedAt < CACHE_MAX_AGE_MS
}

/**
 * La caché de consultas de la app.
 *
 * - `gcTime` de un día: para que lo restaurado no se descarte a los 5 minutos.
 * - `networkMode: 'always'`: sin red, la consulta falla (y se avisa) en vez de quedar
 *   en pausa; `navigator.onLine` no es confiable dentro de un WebView.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { gcTime: CACHE_MAX_AGE_MS, networkMode: 'always' } },
  })
}

/**
 * Guarda la caché en el teléfono (en el navegador, `localStorage`) para que la app
 * abra con lo último que cargó, también sin red.
 */
export function cachePersistOptions(
  throttleTime = 1000,
): Omit<PersistQueryClientOptions, 'queryClient'> {
  const persister = createAsyncStoragePersister({
    key: CACHE_KEY,
    throttleTime,
    storage: {
      getItem: async (key) => (await Preferences.get({ key })).value,
      setItem: (key, value) => Preferences.set({ key, value }),
      removeItem: (key) => Preferences.remove({ key }),
    },
  })
  return {
    persister,
    maxAge: CACHE_MAX_AGE_MS,
    buster: CACHE_VERSION,
    dehydrateOptions: { shouldDehydrateQuery: (query) => shouldPersistQuery(query) },
  }
}
