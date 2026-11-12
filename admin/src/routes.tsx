import type { RouteObject } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './features/home/HomePage'
import { ImportPage } from './features/import/ImportPage'
import { LoginPage } from './features/login/LoginPage'
import { NightPage } from './features/night/NightPage'
import { GroupsPage } from './features/groups/GroupsPage'
import { StagesPage } from './features/stages/StagesPage'
import { EventsPage } from './features/events/EventsPage'
import { ContestPage } from './features/contest/ContestPage'
import { ParadePage } from './features/parade/ParadePage'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'grilla/importar', element: <ImportPage /> },
      { path: 'grilla', element: <NightPage /> },
      { path: 'conjuntos', element: <GroupsPage /> },
      { path: 'escenarios', element: <StagesPage /> },
      { path: 'eventos', element: <EventsPage /> },
      { path: 'concurso', element: <ContestPage /> },
      { path: 'llamadas', element: <ParadePage /> },
    ],
  },
]
