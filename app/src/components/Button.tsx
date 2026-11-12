import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

const variants = {
  primary: 'bg-brand text-white shadow-button',
  secondary: 'bg-surface text-brand border-line border',
}

/** Botón de acción: 48 px de alto como mínimo, para tocarlo en la calle. */
export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`pressable min-h-12 rounded-2xl px-5 font-bold disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
