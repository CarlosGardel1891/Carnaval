import { useTranslation } from 'react-i18next'
import { Navigate, NavLink, Outlet } from 'react-router'
import { useSession } from '../lib/session'
import { sections } from '../nav'
import { Button } from './ui'

/** El marco de todas las pantallas. Sin sesión de admin manda al login. */
export function AppLayout() {
  const { t } = useTranslation()
  const { state, signOut } = useSession()

  if (state.status === 'loading') {
    return (
      <p role="status" className="p-6 text-sm text-slate-600">
        {t('app.loading')}
      </p>
    )
  }
  if (state.status === 'out') return <Navigate to="/login" replace />

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-bold">{t('app.name')}</span>
          <nav className="flex flex-1 flex-wrap gap-1">
            {sections.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm ${
                    isActive ? 'bg-slate-800 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`
                }
              >
                {t(`nav.${label}`)}
              </NavLink>
            ))}
          </nav>
          <span className="text-sm text-slate-600">
            {t('app.signedInAs', { email: state.email })}
          </span>
          <Button variant="secondary" onClick={() => void signOut()}>
            {t('app.signOut')}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
