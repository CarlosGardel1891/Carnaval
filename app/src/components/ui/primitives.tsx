import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link, type To } from 'react-router'
import type { CategoriaConjunto } from '@cuerda/shared'
import { categoryAvatarStyle, categoryColor, categoryPillStyle, initials } from '../../lib/category'
import { ChevronRightIcon } from './icons'

/**
 * Las piezas del sistema de diseño (decisión 92). Sin lógica: reciben lo que muestran. La
 * pantalla de muestra (`/muestra`, sólo en desarrollo) las tiene todas juntas.
 */

// ------------------------------------------------------------------ tarjeta

interface CardProps {
  children: ReactNode
  className?: string
}

/** Una tarjeta blanca, redondeada, con sombra suave azulada. */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-surface shadow-card overflow-hidden rounded-[1.375rem] ${className}`}>
      {children}
    </div>
  )
}

// ------------------------------------------------------------------ encabezado de sección

interface SectionHeaderProps {
  title: string
  /** El id del título, para `aria-labelledby` de la sección. */
  id?: string
  /** «Ver todo»: un enlace a la derecha, o un botón si no cambia de pantalla. */
  action?: { label: string; to: To } | { label: string; onClick: () => void }
}

const sectionAction =
  'text-accent -my-2 inline-flex min-h-11 shrink-0 items-center text-[0.9375rem] font-bold'

export function SectionHeader({ title, id, action }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1 pt-1 pb-2.5">
      <h2 id={id} className="text-[1.1875rem] leading-tight font-extrabold tracking-tight">
        {title}
      </h2>
      {action &&
        ('to' in action ? (
          <Link to={action.to} className={sectionAction}>
            {action.label}
          </Link>
        ) : (
          <button type="button" onClick={action.onClick} className={sectionAction}>
            {action.label}
          </button>
        ))}
    </div>
  )
}

// ------------------------------------------------------------------ control segmentado

interface SegmentedProps<T extends string> {
  /** Qué eligen las opciones, para los lectores de pantalla. */
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  /** Sobre el degradé del encabezado: fondo translúcido en vez de gris. */
  onBrand?: boolean
}

/** Control segmentado estilo iOS: la opción elegida, en blanco con sombra. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  onBrand = false,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`grid auto-cols-fr grid-flow-col gap-1 rounded-2xl p-1 ${
        onBrand ? 'bg-white/20' : 'bg-[#e6eaf3]'
      }`}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-11 rounded-xl px-3 text-[0.9375rem] font-bold transition-[background-color,color,box-shadow] duration-150 ${
              selected
                ? 'text-brand bg-white shadow-[0_1px_3px_rgb(15_23_42/0.14)]'
                : onBrand
                  ? 'text-white'
                  : 'text-soft'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

// ------------------------------------------------------------------ chip de filtro

interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  pressed: boolean
  /** El punto de color de una categoría. */
  category?: CategoriaConjunto
  icon?: ReactNode
  children: ReactNode
}

/** Píldora con borde; la elegida, llena en azul con texto blanco. */
export function FilterChip({ pressed, category, icon, children, ...props }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`pressable inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[0.9375rem] font-bold whitespace-nowrap disabled:opacity-60 ${
        pressed
          ? 'bg-brand border-brand shadow-button text-white'
          : 'border-line bg-surface text-ink'
      }`}
      {...props}
    >
      {icon}
      {category && (
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full"
          style={{ backgroundColor: pressed ? '#ffffff' : categoryColor(category) }}
        />
      )}
      {children}
    </button>
  )
}

// ------------------------------------------------------------------ píldoras

/** La categoría de un conjunto: fondo suave y texto fuerte, en su color. */
export function CategoryPill({
  category,
  children,
}: {
  category: CategoriaConjunto
  children: ReactNode
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-bold"
      style={categoryPillStyle(category)}
    >
      {children}
    </span>
  )
}

type Tone = 'neutral' | 'brand' | 'ok' | 'amber' | 'danger' | 'sun'

const tones: Record<Tone, string> = {
  neutral: 'bg-raised text-soft',
  brand: 'bg-brand-soft text-brand',
  ok: 'bg-ok-soft text-ok',
  amber: 'bg-amber-soft text-amber',
  danger: 'bg-danger-soft text-danger',
  sun: 'bg-sun-soft text-sun-ink',
}

/** Una etiqueta chica: precio, «Gratis», «Cambió», «Suspendida»… */
export function Pill({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-bold whitespace-nowrap ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  )
}

/** «Ahora en escena»: amarillo sol, con un punto que late. */
export function LivePill({ children }: { children: ReactNode }) {
  return (
    <span className="bg-sun-soft text-sun-ink inline-flex items-center gap-2 rounded-full py-0.5 pr-2.5 pl-2 text-[0.75rem] font-extrabold tracking-wide whitespace-nowrap uppercase">
      <span className="live-dot" aria-hidden="true" />
      {children}
    </span>
  )
}

// ------------------------------------------------------------------ avatar

const avatarSizes = {
  sm: 'size-10 text-[0.8125rem]',
  md: 'size-12 text-[0.9375rem]',
  lg: 'size-[4.5rem] text-[1.5rem]',
}

interface AvatarProps {
  name: string
  category: CategoriaConjunto
  photoUrl?: string | null
  size?: keyof typeof avatarSizes
  /** Sobre el degradé de la ficha: círculo blanco. */
  onColor?: boolean
}

/** El avatar de un conjunto: su foto o, si no tiene, sus iniciales en el color de su categoría. */
export function Avatar({ name, category, photoUrl, size = 'md', onColor = false }: AvatarProps) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        className={`${avatarSizes[size]} shrink-0 rounded-full object-cover`}
        loading="lazy"
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={`${avatarSizes[size]} inline-flex shrink-0 items-center justify-center rounded-full font-extrabold tracking-tight`}
      style={
        onColor
          ? { backgroundColor: '#ffffff', color: categoryColor(category) }
          : categoryAvatarStyle(category)
      }
    >
      {initials(name)}
    </span>
  )
}

// ------------------------------------------------------------------ cuadradito de fecha

interface DateBadgeProps {
  /** Arriba, chico: «HOY», «VIE 13», «LUN 1». */
  top: string
  /** Abajo, grande: la hora o el mes. */
  bottom: string
  /** Hoy: lleno en azul. */
  today?: boolean
}

export function DateBadge({ top, bottom, today = false }: DateBadgeProps) {
  return (
    <span
      className={`inline-flex size-[3.75rem] shrink-0 flex-col items-center justify-center rounded-2xl leading-none ${
        today ? 'bg-brand text-white' : 'bg-brand-soft text-brand'
      }`}
    >
      <span className="text-[0.6875rem] font-extrabold tracking-wide uppercase">{top}</span>
      <span className="mt-1 text-[1.125rem] font-extrabold tabular-nums">{bottom}</span>
    </span>
  )
}

// ------------------------------------------------------------------ botones

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
}

/** El botón principal: lleno, azul, con texto blanco. */
export function PrimaryButton({ icon, children, className = '', ...props }: PrimaryButtonProps) {
  return (
    <button
      type="button"
      className={`pressable bg-brand shadow-button inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl px-6 text-[1.0625rem] font-bold text-white disabled:opacity-60 ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  )
}

interface RoundButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

/** Botón redondo blanco, para volver y compartir. */
export function RoundButton({ label, children, className = '', ...props }: RoundButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`pressable bg-surface shadow-card text-ink inline-flex size-11 shrink-0 items-center justify-center rounded-full ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ------------------------------------------------------------------ fila

interface RowLinkProps {
  to: To
  children: ReactNode
  /** Sin flecha: cuando la fila ya dice a dónde va. */
  chevron?: boolean
  className?: string
}

/** Una fila entera que se toca, con una flecha suave a la derecha. */
export function RowLink({ to, children, chevron = true, className = '' }: RowLinkProps) {
  return (
    <Link to={to} className={`flex min-h-14 items-center gap-3 px-4 py-3 ${className}`}>
      <span className="min-w-0 flex-1">{children}</span>
      {chevron && <ChevronRightIcon className="text-soft size-5 shrink-0 opacity-50" />}
    </Link>
  )
}

// ------------------------------------------------------------------ estado vacío

interface EmptyStateProps {
  illustration?: ReactNode
  title?: string
  children?: ReactNode
  action?: ReactNode
}

/** Un estado vacío: una ilustración simple, un texto amable y, si sirve, un botón. */
export function EmptyState({ illustration, title, children, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      {illustration}
      {title && <p className="mt-4 text-[1.1875rem] font-extrabold tracking-tight">{title}</p>}
      {children && <div className="text-soft mt-1.5 max-w-xs text-[0.9375rem]">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
