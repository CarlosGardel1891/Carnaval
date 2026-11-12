import type { ReactNode } from 'react'

interface ChipProps {
  pressed: boolean
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}

/** Botón de dos estados (prendido o apagado) para filtros y vistas. */
export function Chip({ pressed, onClick, children, disabled = false }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={`pressable min-h-11 shrink-0 rounded-full border px-4 text-[0.9375rem] font-bold whitespace-nowrap disabled:opacity-60 ${
        pressed ? 'bg-brand border-brand text-white' : 'bg-surface text-ink border-line'
      }`}
    >
      {children}
    </button>
  )
}
