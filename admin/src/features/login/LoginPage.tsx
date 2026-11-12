import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate } from 'react-router'
import { Button, Field, inputClass, Notice } from '../../components/ui'
import { WrongCredentialsError } from '../../lib/api'
import { useSession } from '../../lib/session'

export function LoginPage() {
  const { t } = useTranslation()
  const { state, signIn } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<'wrong' | 'failed' | null>(null)

  if (state.status === 'admin') return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (cause) {
      setError(cause instanceof WrongCredentialsError ? 'wrong' : 'failed')
    } finally {
      setBusy(false)
    }
  }

  const denied = state.status === 'out' && state.denied && !error

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 p-4">
      <form
        onSubmit={(event) => void onSubmit(event)}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow"
      >
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{t('login.title')}</h1>
          <p className="text-sm text-slate-600">{t('login.intro')}</p>
        </div>
        <Field label={t('login.email')}>
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t('login.password')}>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </Field>
        <Button type="submit" disabled={busy || state.status === 'loading'} className="w-full">
          {busy ? t('login.submitting') : t('login.submit')}
        </Button>
        {error && <Notice kind="error">{t(`login.${error}`)}</Notice>}
        {denied && <Notice kind="error">{t('login.denied')}</Notice>}
      </form>
    </main>
  )
}
