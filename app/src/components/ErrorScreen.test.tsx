import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import i18n from '../i18n'
import { fetchCurrentSeason, fetchNightActs } from '../lib/api'
import { setErrorReporter } from '../lib/errors'
import { renderApp } from '../test-utils'
import { ErrorBoundary } from './ErrorScreen'

vi.mock('../lib/api')

function Bomb(): never {
  throw new Error('pantalla rota')
}

describe('cuando una pantalla se rompe', () => {
  const reported: unknown[] = []

  beforeEach(async () => {
    await i18n.changeLanguage('es')
    reported.length = 0
    setErrorReporter((error) => reported.push(error))
    // React avisa por consola de cada error que atrapa un límite: acá es lo esperado.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    setErrorReporter(null)
    vi.restoreAllMocks()
  })

  it('fuera de las rutas, muestra la pantalla de error y lo reporta', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Algo salió mal')
    expect(screen.getByRole('button', { name: 'Volver al inicio' })).toBeVisible()
    expect(reported).toHaveLength(1)
    expect((reported[0] as Error).message).toBe('pantalla rota')
  })

  it('sin errores, no se nota', () => {
    render(
      <ErrorBoundary>
        <p>todo bien</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('todo bien')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(reported).toEqual([])
  })

  it('dentro de una ruta, también, y en el idioma de la app', async () => {
    await i18n.changeLanguage('en')
    vi.mocked(fetchCurrentSeason).mockResolvedValue(null)
    // Una fila imposible hace que el pizarrón falle al dibujarse.
    vi.mocked(fetchNightActs).mockResolvedValue([null] as never)
    renderApp('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
    expect(reported.length).toBeGreaterThan(0)
  })
})
