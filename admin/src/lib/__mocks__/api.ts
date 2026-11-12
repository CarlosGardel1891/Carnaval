import { vi } from 'vitest'
import type { AdminSession } from '../api'

export class WrongCredentialsError extends Error {}

export const getSession = vi.fn<() => Promise<AdminSession | null>>()
export const onSessionChange = vi.fn<(listener: (s: AdminSession | null) => void) => () => void>()
export const signIn = vi.fn<(email: string, password: string) => Promise<AdminSession>>()
export const signOut = vi.fn<() => Promise<void>>()
