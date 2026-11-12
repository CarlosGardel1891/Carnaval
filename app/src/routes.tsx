import { Navigate, type RouteObject } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { RouteErrorScreen } from './components/ErrorScreen'
import { AboutPage } from './features/about/AboutPage'
import { CalendarPage } from './features/calendar/CalendarPage'
import { EventPage } from './features/calendar/EventPage'
import { ContestPage } from './features/contest/ContestPage'
import { GroupPage } from './features/groups/GroupPage'
import { GroupsPage } from './features/groups/GroupsPage'
import { BlockView } from './features/llamadas/BlockView'
import { GlossaryView } from './features/llamadas/GlossaryView'
import { LlamadasLayout } from './features/llamadas/LlamadasLayout'
import { OrderView } from './features/llamadas/OrderView'
import { RouteView } from './features/llamadas/RouteView'
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
    errorElement: <RouteErrorScreen />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'mapa', element: <LazyMapPage /> },
      { path: 'acerca', element: <AboutPage /> },
      { path: 'escenarios/:slug', element: <StagePage /> },
      { path: 'conjuntos', element: <GroupsPage /> },
      { path: 'conjuntos/:slug', element: <GroupPage /> },
      { path: 'calendario', element: <CalendarPage /> },
      // Antes que la ficha de evento: «concurso» no es el slug de ningún evento.
      { path: 'calendario/concurso', element: <ContestPage /> },
      { path: 'calendario/:slug', element: <EventPage /> },
      {
        path: 'llamadas',
        element: <LlamadasLayout />,
        children: [
          { index: true, element: <OrderView /> },
          { path: 'cuadra', element: <BlockView /> },
          { path: 'recorrido', element: <RouteView /> },
          { path: 'glosario', element: <GlossaryView /> },
        ],
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]
