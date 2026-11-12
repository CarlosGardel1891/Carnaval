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
