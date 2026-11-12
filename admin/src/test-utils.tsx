import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import * as api from './lib/api'
import type { AdminSession } from './lib/api'
import { SessionProvider } from './lib/session'
import { routes } from './routes'

export const ADMIN: AdminSession = { email: 'ana@ejemplo.com', isAdmin: true }

/**
 * Monta el panel entero (rutas reales, caché nueva) en una ruta, con la sesión que se le
 * pase: por defecto, la de un admin. `lib/api` tiene que estar mockeado en el test.
 */
export function renderAdmin(initialPath = '/', session: AdminSession | null = ADMIN) {
  vi.mocked(api.getSession).mockResolvedValue(session)
  vi.mocked(api.onSessionChange).mockReturnValue(() => undefined)
  vi.mocked(api.signOut).mockResolvedValue(undefined)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryClientProvider>,
  )
  return { ...view, router, queryClient }
}
