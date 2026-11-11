import { Navigate, type RouteObject } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { GroupsPage } from './features/groups/GroupsPage'
import { LazyMapPage } from './features/map/LazyMapPage'
import { StagePage } from './features/stages/StagePage'
import { TodayPage } from './features/today/TodayPage'

/**
 * Rutas de la app. `/` es el pizarrón «Hoy»; en la Fase 6, el layout raíz elige entre
 * Hoy y Llamadas según `modoLlamadasActivo`.
 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'mapa', element: <LazyMapPage /> },
      { path: 'escenarios/:slug', element: <StagePage /> },
      { path: 'conjuntos', element: <GroupsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
