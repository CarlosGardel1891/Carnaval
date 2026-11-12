import { vi } from 'vitest'
import type * as real from '../api'

type AdminSession = real.AdminSession

export class WrongCredentialsError extends Error {}

export const getSession = vi.fn<() => Promise<AdminSession | null>>()
export const onSessionChange = vi.fn<(listener: (s: AdminSession | null) => void) => () => void>()
export const signIn = vi.fn<(email: string, password: string) => Promise<AdminSession>>()
export const signOut = vi.fn<() => Promise<void>>()

export const fetchCatalog = vi.fn<typeof real.fetchCatalog>()
export const fetchSeasons = vi.fn<typeof real.fetchSeasons>()
export const previewGrid = vi.fn<typeof real.previewGrid>()
export const fetchLeftovers = vi.fn<typeof real.fetchLeftovers>()
export const publishGrid = vi.fn<typeof real.publishGrid>()
export const fetchNightActs = vi.fn<typeof real.fetchNightActs>()
export const updateAct = vi.fn<typeof real.updateAct>()
export const addAct = vi.fn<typeof real.addAct>()
export const deleteAct = vi.fn<typeof real.deleteAct>()
export const sendChangeNotices = vi.fn<typeof real.sendChangeNotices>()
export const fetchSuspensions = vi.fn<typeof real.fetchSuspensions>()
export const suspendNight = vi.fn<typeof real.suspendNight>()
export const undoSuspension = vi.fn<typeof real.undoSuspension>()
export const fetchGroups = vi.fn<typeof real.fetchGroups>()
export const saveGroup = vi.fn<typeof real.saveGroup>()
export const setParticipation = vi.fn<typeof real.setParticipation>()
export const fetchStages = vi.fn<typeof real.fetchStages>()
export const saveStage = vi.fn<typeof real.saveStage>()
export const fetchEvents = vi.fn<typeof real.fetchEvents>()
export const saveEvent = vi.fn<typeof real.saveEvent>()
export const fetchContest = vi.fn<typeof real.fetchContest>()
export const saveContestStage = vi.fn<typeof real.saveContestStage>()
export const deleteContestStage = vi.fn<typeof real.deleteContestStage>()
