import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

export function LoginPage() {
  const { t } = useTranslation()
  const [submitted, setSubmitted] = useState(false)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <h1 className="text-xl font-bold">{t('login.title')}</h1>
        <label className="block space-y-1">
          <span className="text-sm text-slate-700">{t('login.email')}</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <button type="submit" className="w-full rounded-lg bg-slate-800 px-3 py-2 text-white">
          {t('login.submit')}
        </button>
        {submitted && (
          <p role="status" className="text-sm text-slate-600">
            {t('login.placeholderNotice')}
          </p>
        )}
      </form>
    </main>
  )
}
