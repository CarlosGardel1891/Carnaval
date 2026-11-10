import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Preferences } from '@capacitor/preferences'
import type { QueryClient } from '@tanstack/react-query'
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from '@tanstack/react-query-persist-client'
import { nightActsQuery } from '../features/today/useNightActs'
import {
  CACHE_KEY,
  CACHE_MAX_AGE_MS,
  CACHE_VERSION,
  cachePersistOptions,
  createAppQueryClient,
} from './queryCache'

vi.mock('./api')

const NOCHE = '2027-01-28'
const ACTS = [{ actuacion_id: 1, conjunto_nombre: 'C 1080' }]
const START = new Date('2027-01-28T21:00:00-03:00')

// Sin espera entre guardados: cada `save` termina con lo guardado ya escrito.
const save = (queryClient: QueryClient) =>
  persistQueryClientSave({ queryClient, ...cachePersistOptions(0) })
async function restore(): Promise<QueryClient> {
  const queryClient = createAppQueryClient()
  await persistQueryClientRestore({ queryClient, ...cachePersistOptions(0) })
  return queryClient
}
const stored = async () => (await Preferences.get({ key: CACHE_KEY })).value
const keys = (queryClient: QueryClient) =>
  queryClient
    .getQueryCache()
    .getAll()
    .map((query) => query.queryKey)

/** Una caché con la grilla de la noche ya cargada. */
async function clientWithNight(): Promise<QueryClient> {
  const queryClient = createAppQueryClient()
  await queryClient.fetchQuery({
    ...nightActsQuery(NOCHE),
    queryFn: () => Promise.resolve(ACTS as never),
  })
  return queryClient
}

describe('caché guardada en el teléfono', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(START)
    await Preferences.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lo guardado vuelve en una caché nueva, con la hora en que se cargó', async () => {
    await save(await clientWithNight())

    const restored = await restore()
    const key = nightActsQuery(NOCHE).queryKey
    expect(restored.getQueryData(key)).toEqual(ACTS)
    expect(restored.getQueryState(key)?.dataUpdatedAt).toBe(START.getTime())
  })

  it('no guarda las consultas que llevan la posición del usuario', async () => {
    const queryClient = await clientWithNight()
    await queryClient.fetchQuery({
      ...nightActsQuery(NOCHE, { origin: { lat: -34.9058, lng: -56.1913 } }),
      queryFn: () => Promise.resolve(ACTS as never),
    })
    expect(keys(queryClient)).toHaveLength(2)
    await save(queryClient)

    expect(await stored()).not.toContain('-34.9058')
    expect(keys(await restore())).toEqual([nightActsQuery(NOCHE).queryKey])
  })

  it('guarda lo último que cargó aunque la actualización siguiente haya fallado', async () => {
    const queryClient = await clientWithNight()
    await queryClient
      .fetchQuery({
        ...nightActsQuery(NOCHE),
        queryFn: () => Promise.reject(new Error('sin red')),
        staleTime: 0,
        retry: false,
      })
      .catch(() => undefined)
    expect(queryClient.getQueryState(nightActsQuery(NOCHE).queryKey)?.status).toBe('error')
    await save(queryClient)

    expect((await restore()).getQueryData(nightActsQuery(NOCHE).queryKey)).toEqual(ACTS)
  })

  it('no guarda consultas sin datos', async () => {
    const queryClient = createAppQueryClient()
    await queryClient
      .fetchQuery({
        ...nightActsQuery(NOCHE),
        queryFn: () => Promise.reject(new Error('sin red')),
        retry: false,
      })
      .catch(() => undefined)
    await save(queryClient)

    expect(keys(await restore())).toEqual([])
  })

  it('una consulta de hace más de un día no se vuelve a guardar', async () => {
    const queryClient = await clientWithNight()
    vi.setSystemTime(START.getTime() + CACHE_MAX_AGE_MS + 60_000)
    await queryClient.fetchQuery({
      queryKey: ['temporada', 'actual'],
      queryFn: () => Promise.resolve({ anio: 2027 }),
    })
    await save(queryClient)

    expect(keys(await restore())).toEqual([['temporada', 'actual']])
  })

  it('pasado un día sin abrir la app, descarta lo guardado', async () => {
    await save(await clientWithNight())
    vi.setSystemTime(START.getTime() + CACHE_MAX_AGE_MS + 60_000)

    expect(keys(await restore())).toEqual([])
    expect(await stored()).toBeNull()
  })

  it('descarta lo que guardó otra versión de la caché', async () => {
    await save(await clientWithNight())
    const saved = JSON.parse((await stored()) ?? '{}') as { buster: string }
    expect(saved.buster).toBe(CACHE_VERSION)
    await Preferences.set({
      key: CACHE_KEY,
      value: JSON.stringify({ ...saved, buster: 'anterior' }),
    })

    expect(keys(await restore())).toEqual([])
    expect(await stored()).toBeNull()
  })

  it('si lo guardado está roto, lo borra', async () => {
    // La app sigue: `PersistQueryClientProvider` arranca con la caché vacía.
    const silence = [
      vi.spyOn(console, 'error').mockImplementation(() => undefined),
      vi.spyOn(console, 'warn').mockImplementation(() => undefined),
    ]
    await Preferences.set({ key: CACHE_KEY, value: '{no es json' })

    await expect(restore()).rejects.toThrow()
    expect(await stored()).toBeNull()
    silence.forEach((spy) => spy.mockRestore())
  })
})
