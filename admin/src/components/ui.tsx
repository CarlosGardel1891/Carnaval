import type { ButtonHTMLAttributes, ReactNode } from 'react'

const buttonStyles = {
  primary: 'bg-slate-800 text-white hover:bg-slate-700',
  secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
  danger: 'bg-red-700 text-white hover:bg-red-600',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      type={type}
      className={`rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 ${buttonStyles[variant]} ${className}`}
      {...props}
    />
  )
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100'

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

const noticeStyles = {
  info: 'border-slate-200 bg-slate-50 text-slate-700',
  ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warn: 'border-amber-200 bg-amber-50 text-amber-900',
  error: 'border-red-200 bg-red-50 text-red-900',
}

/** Un aviso. Los errores van con `role="alert"`; el resto, con `role="status"`. */
export function Notice({
  kind = 'info',
  children,
}: {
  kind?: keyof typeof noticeStyles
  children: ReactNode
}) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-3 py-2 text-sm ${noticeStyles[kind]}`}
    >
      {children}
    </p>
  )
}

export function PageTitle({ title, intro }: { title: string; intro?: string }) {
  return (
    <header className="space-y-1">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {intro && <p className="text-sm text-slate-600">{intro}</p>}
    </header>
  )
}
