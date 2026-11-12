import type { RouteObject } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { HomePage } from './features/home/HomePage'
import { LoginPage } from './features/login/LoginPage'

export const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [{ index: true, element: <HomePage /> }],
  },
]
