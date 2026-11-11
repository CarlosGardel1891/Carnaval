import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from './routes'

/**
 * Monta la app entera (rutas reales, caché nueva) en una ruta dada. La base va mockeada aparte.
 * Se le puede pasar una caché ya cargada, por ejemplo la que se restauró del teléfono.
 */
export function renderApp(
  initialPath = '/',
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...view, router, queryClient }
}
