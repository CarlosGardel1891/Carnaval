import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

const variants = {
  primary: 'bg-accent text-accent-ink',
  secondary: 'bg-raised text-ink border-line border',
}

/** Botón de acción: 48 px de alto como mínimo, para tocarlo en la calle. */
export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`min-h-12 rounded-xl px-5 font-semibold ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
