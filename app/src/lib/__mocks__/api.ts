import { vi } from 'vitest'
import type * as Api from '../api'

/**
 * El doble de `lib/api` que usan los tests con `vi.mock('…/lib/api')`. Cada función
 * responde «no hay nada» hasta que un test le diga otra cosa (`vi.resetAllMocks()` la
 * vuelve a ese estado). Al agregar una función a `api.ts` hay que sumarla acá.
 */

export const MONTEVIDEO_CENTER: typeof Api.MONTEVIDEO_CENTER = { lat: -34.9058, lng: -56.1913 }

export const fetchCurrentSeason = vi.fn<typeof Api.fetchCurrentSeason>(() => Promise.resolve(null))
export const fetchNightActs = vi.fn<typeof Api.fetchNightActs>(() => Promise.resolve([]))
export const fetchLocatedStages = vi.fn<typeof Api.fetchLocatedStages>(() => Promise.resolve([]))
export const fetchStage = vi.fn<typeof Api.fetchStage>(() => Promise.resolve(null))
export const fetchGroups = vi.fn<typeof Api.fetchGroups>(() => Promise.resolve([]))
export const fetchGroup = vi.fn<typeof Api.fetchGroup>(() => Promise.resolve(null))
export const fetchEvents = vi.fn<typeof Api.fetchEvents>(() => Promise.resolve([]))
export const fetchUpcomingActs = vi.fn<typeof Api.fetchUpcomingActs>(() => Promise.resolve([]))

export const getUserId = vi.fn<typeof Api.getUserId>(() => Promise.resolve(null))
export const onUserChange = vi.fn<typeof Api.onUserChange>(() => () => undefined)
export const setAuthActive = vi.fn<typeof Api.setAuthActive>()
export const isRateLimited = vi.fn<typeof Api.isRateLimited>(() => false)
export const fetchFollowed = vi.fn<typeof Api.fetchFollowed>(() => Promise.resolve([]))
export const followGroup = vi.fn<typeof Api.followGroup>(() => Promise.resolve())
export const unfollowGroup = vi.fn<typeof Api.unfollowGroup>(() => Promise.resolve())
export const registerPushDevice = vi.fn<typeof Api.registerPushDevice>(() => Promise.resolve())
