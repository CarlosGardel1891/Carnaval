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
      className={`min-h-12 shrink-0 rounded-full border px-4 font-semibold whitespace-nowrap ${
        pressed ? 'bg-accent text-accent-ink border-accent' : 'bg-surface text-ink border-line'
      }`}
    >
      {children}
    </button>
  )
}
