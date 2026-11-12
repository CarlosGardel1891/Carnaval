import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from './api'

export type SessionState =
  | { status: 'loading' }
  /** Sin sesión. `denied`: recién entró alguien que no es admin, y se le cerró la sesión. */
  | { status: 'out'; denied: boolean }
  | { status: 'admin'; email: string }

interface SessionContextValue {
  state: SessionState
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

/**
 * La sesión del panel. Sólo deja pasar a un admin: si entra otra cuenta, cierra esa sesión y
 * lo dice. Es una comodidad para quien se equivocó de cuenta; la barrera es la RLS, que
 * rechaza cualquier escritura de quien no tenga el claim (decisión 69).
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: 'loading' })

  const apply = useCallback((session: api.AdminSession | null) => {
    if (!session) {
      setState((prev) => (prev.status === 'out' ? prev : { status: 'out', denied: false }))
    } else if (session.isAdmin) {
      setState({ status: 'admin', email: session.email })
    } else {
      setState({ status: 'out', denied: true })
      void api.signOut().catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    let active = true
    api
      .getSession()
      .then((session) => active && apply(session))
      .catch(() => active && apply(null))
    const stop = api.onSessionChange((session) => active && apply(session))
    return () => {
      active = false
      stop()
    }
  }, [apply])

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      signIn: async (email, password) => apply(await api.signIn(email, password)),
      signOut: async () => {
        await api.signOut()
        setState({ status: 'out', denied: false })
      },
    }),
    [state, apply],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error('useSession va adentro de <SessionProvider>.')
  return value
}
