import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient, type Query, type QueryKey } from '@tanstack/react-query'
import type {
  PersistedClient,
  Persister,
  PersistQueryClientOptions,
} from '@tanstack/react-query-persist-client'
import { preferencesStorage } from './preferencesStorage'

/** Cuánto vale lo guardado: pasado un día, la grilla vieja confunde más de lo que ayuda. */
export const CACHE_MAX_AGE_MS = 24 * 60 * 60_000

/**
 * Lo del modo Llamadas vale una semana (decisión 65): en el desfile la red se satura, y un
 * orden de hace tres días, con su «actualizado hace…», sirve más que una pantalla vacía.
 */
export const LONG_CACHE_MAX_AGE_MS = 7 * CACHE_MAX_AGE_MS

/** Las consultas que duran una semana: las que tienen esto primero en la clave. */
export const LONG_LIVED_KEY = 'llamadas'

/** Cuánto vale en el teléfono una consulta, según su clave. */
export function cacheMaxAge(queryKey: QueryKey): number {
  return queryKey[0] === LONG_LIVED_KEY ? LONG_CACHE_MAX_AGE_MS : CACHE_MAX_AGE_MS
}

/**
 * Versión de lo guardado. Subirla cuando cambie la forma de lo que devuelven las
 * consultas: al abrir, la app descarta lo que guardó una versión anterior.
 */
export const CACHE_VERSION = '3'

/** La clave bajo la que se guarda la caché en `@capacitor/preferences`. */
export const CACHE_KEY = 'cuerda-cache'

/**
 * Una consulta se guarda si tiene datos (aunque el último intento haya fallado: sin
 * red, lo último que cargó es justo lo que hay que conservar), si no pasó su plazo (un
 * día; una semana lo del modo Llamadas) y si no pidió quedar afuera con
 * `meta: { persist: false }`, como las que llevan la posición del usuario.
 */
export function shouldPersistQuery(query: Query, now = Date.now()): boolean {
  if (query.meta?.persist === false) return false
  if (query.state.data === undefined) return false
  return now - query.state.dataUpdatedAt < cacheMaxAge(query.queryKey)
}

/**
 * Al abrir, lo guardado vuelve consulta por consulta: cada una, sólo si no pasó su plazo.
 * (El `maxAge` del persistidor mira cuándo se guardó todo junto, y es el plazo largo.)
 */
function dropExpired(persister: Persister): Persister {
  return {
    ...persister,
    restoreClient: async () => {
      const saved: PersistedClient | undefined = await persister.restoreClient()
      if (!saved) return saved
      const now = Date.now()
      const queries = saved.clientState.queries.filter(
        (query) => now - query.state.dataUpdatedAt < cacheMaxAge(query.queryKey),
      )
      return { ...saved, clientState: { ...saved.clientState, queries } }
    },
  }
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
    storage: preferencesStorage,
  })
  return {
    persister: dropExpired(persister),
    maxAge: LONG_CACHE_MAX_AGE_MS,
    buster: CACHE_VERSION,
    dehydrateOptions: { shouldDehydrateQuery: (query) => shouldPersistQuery(query) },
  }
}
