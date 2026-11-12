import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useSystemBars } from '../../lib/systemBars'
import { InfoIcon } from './icons'

/** Los papelitos y la serpentina del encabezado: muy sutiles, y nunca encima del texto. */
function Confetti() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 390 260"
      preserveAspectRatio="xMidYMin slice"
      className="pointer-events-none absolute inset-0 size-full"
    >
      <path
        d="M-10 96 C 60 60, 120 132, 196 92 S 300 20, 400 70"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.16"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M-10 214 C 70 250, 150 190, 230 222 S 340 250, 400 206"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.12"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="252"
        y="58"
        width="9"
        height="6"
        rx="3"
        fill="#ffc83d"
        opacity="0.85"
        transform="rotate(-28 256 61)"
      />
      <rect
        x="318"
        y="118"
        width="9"
        height="6"
        rx="3"
        fill="#f0a6ff"
        opacity="0.8"
        transform="rotate(34 322 121)"
      />
      <rect
        x="206"
        y="150"
        width="8"
        height="5"
        rx="2.5"
        fill="#7ef0c3"
        opacity="0.8"
        transform="rotate(-40 210 152)"
      />
      <rect
        x="356"
        y="186"
        width="9"
        height="6"
        rx="3"
        fill="#ffc83d"
        opacity="0.75"
        transform="rotate(18 360 189)"
      />
      <circle cx="170" cy="108" r="2.6" fill="#ffffff" opacity="0.55" />
      <circle cx="298" cy="34" r="2.4" fill="#ffffff" opacity="0.5" />
      <circle cx="372" cy="92" r="2.2" fill="#7ef0c3" opacity="0.7" />
    </svg>
  )
}

interface TabHeaderProps {
  title: string
  subtitle?: ReactNode
  /** El id del título, para enlazarlo con `aria-labelledby`. */
  titleId?: string
  /** Lo que va debajo del título, dentro del degradé: el buscador, un segmentado. */
  children?: ReactNode
  /** Un dibujo a la derecha del título (el tambor de Llamadas). */
  art?: ReactNode
  /** Cuánto se extiende el degradé por debajo del contenido, para montar una tarjeta encima. */
  overlap?: boolean
}

/**
 * El encabezado de una pestaña (decisión 92): el degradé de la marca con papelitos, la marca y
 * el botón de «Acerca de» arriba, el título grande en blanco y la fecha o el lugar debajo.
 */
export function TabHeader({
  title,
  subtitle,
  titleId,
  children,
  art,
  overlap = false,
}: TabHeaderProps) {
  const { t } = useTranslation()
  useSystemBars('onBrand')
  return (
    <header
      className={`brand-gradient relative -mt-[var(--safe-top)] overflow-hidden px-5 pt-[calc(var(--safe-top)+0.75rem)] text-white ${
        overlap ? 'pb-16' : 'pb-6'
      }`}
    >
      <Confetti />
      <div className="relative flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[0.9375rem] font-extrabold tracking-[0.08em] uppercase">
          <img src="/favicon.png" alt="" className="size-8 rounded-[0.625rem]" />
          {t('app.name')}
        </p>
        <Link
          to="/acerca"
          aria-label={t('about.open')}
          className="pressable -mr-1 flex size-11 items-center justify-center rounded-full bg-white/20"
        >
          <InfoIcon className="size-6" />
        </Link>
      </div>
      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1
            id={titleId}
            className="text-[2.5rem] leading-[1.05] font-extrabold tracking-tight text-balance"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-[1.0625rem] font-semibold text-white/90 first-letter:uppercase">
              {subtitle}
            </p>
          )}
        </div>
        {art}
      </div>
      {children && <div className="relative mt-5">{children}</div>}
    </header>
  )
}
