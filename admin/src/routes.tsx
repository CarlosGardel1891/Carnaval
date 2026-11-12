import type { RouteObject } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './features/home/HomePage'
import { ImportPage } from './features/import/ImportPage'
import { LoginPage } from './features/login/LoginPage'
import { NightPage } from './features/night/NightPage'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'grilla/importar', element: <ImportPage /> },
      { path: 'grilla', element: <NightPage /> },
    ],
  },
]
