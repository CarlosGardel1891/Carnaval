import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { cachePersistOptions, createAppQueryClient } from './lib/queryCache'
import { routes } from './routes'

const queryClient = createAppQueryClient()
const persistOptions = cachePersistOptions()

const router = createBrowserRouter(routes)

export function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <RouterProvider router={router} />
    </PersistQueryClientProvider>
  )
}
