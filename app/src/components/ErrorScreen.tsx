import { Component, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { reportError } from '../lib/errors'
import { OfflineArt } from './ui/illustrations'
import { PrimaryButton } from './ui/primitives'

/** Lo que se ve cuando una pantalla se rompe: qué pasó, en criollo, y cómo seguir. */
function Broken() {
  const { t } = useTranslation()
  return (
    <main
      role="alert"
      className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-6 py-8 text-center"
    >
      <OfflineArt />
      <p className="text-brand mt-5 text-[0.8125rem] font-extrabold tracking-[0.08em] uppercase">
        {t('app.name')}
      </p>
      <h1 className="mt-1 text-[1.875rem] leading-tight font-extrabold tracking-tight">
        {t('error.title')}
      </h1>
      <p className="text-soft mt-3 max-w-sm text-[1.0625rem]">{t('error.body')}</p>
      <div className="mt-6">
        <PrimaryButton onClick={() => window.location.assign('/')}>
          {t('error.retry')}
        </PrimaryButton>
      </div>
    </main>
  )
}

/** Para `errorElement` de las rutas: avisa al reporte de errores y muestra la pantalla. */
export function RouteErrorScreen() {
  const error = useRouteError()
  useEffect(() => {
    reportError(error)
  }, [error])
  return <Broken />
}

interface BoundaryState {
  failed: boolean
}

/** Lo que falle fuera de las rutas (los proveedores, el arranque) también termina acá. */
export class ErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error): void {
    reportError(error)
  }

  render(): ReactNode {
    return this.state.failed ? <Broken /> : this.props.children
  }
}
