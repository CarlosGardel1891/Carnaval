import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

function TodayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
    </svg>
  )
}

function MapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  )
}

interface TabProps {
  to: string
  label: string
  icon: ReactNode
}

function Tab({ to, label, icon }: TabProps) {
  return (
    <li className="flex-1">
      <NavLink
        to={to}
        end
        // Las pestañas no apilan historial: «atrás» desde una pestaña no recorre las otras.
        replace
        className={({ isActive }) =>
          `flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm font-semibold ${
            isActive ? 'text-accent' : 'text-soft'
          }`
        }
      >
        <span aria-hidden="true">{icon}</span>
        {label}
      </NavLink>
    </li>
  )
}

/** Barra inferior. Hoy tiene dos pestañas; las fases 4 a 6 suman hasta cinco. */
export function TabBar() {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('nav.label')}
      className="border-line bg-surface border-t pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        <Tab to="/" label={t('nav.today')} icon={<TodayIcon />} />
        <Tab to="/mapa" label={t('nav.map')} icon={<MapIcon />} />
      </ul>
    </nav>
  )
}
