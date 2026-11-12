import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './i18n'
import { SessionProvider } from './lib/session'
import { routes } from './routes'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

// Los datos del panel se editan: nada de mostrar una copia vieja sin volver a pedirla.
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, retry: 1, refetchOnWindowFocus: false } },
})

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RouterProvider router={createBrowserRouter(routes)} />
      </SessionProvider>
    </QueryClientProvider>
  </StrictMode>,
)
