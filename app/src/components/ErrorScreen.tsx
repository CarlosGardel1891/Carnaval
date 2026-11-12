import { Component, useEffect, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router'
import { reportError } from '../lib/errors'
import { Button } from './Button'

/** Lo que se ve cuando una pantalla se rompe: qué pasó, en criollo, y cómo seguir. */
function Broken() {
  const { t } = useTranslation()
  return (
    <main
      role="alert"
      className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-8"
    >
      <p className="text-accent font-semibold tracking-wide uppercase">{t('app.name')}</p>
      <h1 className="mt-1 text-3xl font-bold">{t('error.title')}</h1>
      <p className="text-soft mt-3 text-lg">{t('error.body')}</p>
      <div className="mt-6">
        <Button onClick={() => window.location.assign('/')}>{t('error.retry')}</Button>
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
