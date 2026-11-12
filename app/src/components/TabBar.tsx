import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { CalendarIcon, DrumIcon, HomeIcon, MapPinIcon, UsersIcon } from './ui/icons'

interface TabProps {
  to: string
  label: string
  icon: ReactNode
  /** Si la pestaña sigue marcada en las pantallas que cuelgan de ella (lista → ficha). */
  withChildren?: boolean
}

function Tab({ to, label, icon, withChildren = false }: TabProps) {
  return (
    <li className="min-w-0 flex-1">
      <NavLink
        to={to}
        end={!withChildren}
        // Las pestañas no apilan historial: «atrás» desde una pestaña no recorre las otras.
        replace
        className={({ isActive }) =>
          `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[0.6875rem] font-bold transition-colors duration-150 ${
            isActive ? 'bg-brand-soft text-brand' : 'text-soft'
          }`
        }
      >
        <span aria-hidden="true">{icon}</span>
        <span className="max-w-full truncate">{label}</span>
      </NavLink>
    </li>
  )
}

/**
 * La barra de pestañas (decisión 92): flota sobre el contenido, blanca translúcida con
 * desenfoque, redondeada y con sombra; la pestaña activa va en azul sobre un fondo suave.
 */
export function TabBar() {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('nav.label')}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(var(--safe-bottom)+0.625rem)]"
    >
      <ul className="shadow-float pointer-events-auto mx-auto flex max-w-md gap-0.5 rounded-[1.75rem] border border-white/70 bg-white/85 p-1.5 backdrop-blur-xl backdrop-saturate-150">
        <Tab to="/" label={t('nav.today')} icon={<HomeIcon />} />
        <Tab to="/llamadas" label={t('nav.llamadas')} icon={<DrumIcon />} withChildren />
        <Tab to="/mapa" label={t('nav.map')} icon={<MapPinIcon />} />
        <Tab to="/conjuntos" label={t('nav.groups')} icon={<UsersIcon />} withChildren />
        <Tab to="/calendario" label={t('nav.calendar')} icon={<CalendarIcon />} withChildren />
      </ul>
    </nav>
  )
}
