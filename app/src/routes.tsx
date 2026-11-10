import { Navigate, type RouteObject } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { MapPage } from './features/map/MapPage'
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
      { path: 'mapa', element: <MapPage /> },
      { path: 'escenarios/:slug', element: <StagePage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
