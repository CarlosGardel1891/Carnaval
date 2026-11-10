import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../i18n'
import { fetchCurrentSeason, fetchLocatedStages, fetchNightActs } from '../lib/api'
import { renderApp } from '../test-utils'

vi.mock('../lib/api')
vi.mock('../features/map/MontevideoMap', () => ({ MontevideoMap: () => null }))

describe('navegación', () => {
  beforeEach(async () => {
    vi.mocked(fetchCurrentSeason).mockResolvedValue(null)
    vi.mocked(fetchNightActs).mockResolvedValue([])
    vi.mocked(fetchLocatedStages).mockResolvedValue([])
    await i18n.changeLanguage('es')
  })
  afterEach(cleanup)

  it('abre en Hoy y la barra inferior lleva al mapa', async () => {
    const { router } = renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Hoy' })).toHaveAttribute('aria-current', 'page')

    await userEvent.click(screen.getByRole('link', { name: 'Mapa' }))
    expect(router.state.location.pathname).toBe('/mapa')
    expect(screen.getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Hoy' })).not.toHaveAttribute('aria-current')
  })

  it('una ruta que no existe vuelve a Hoy', async () => {
    const { router } = renderApp('/no-existe')
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('la barra inferior está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/')
    expect(await screen.findByRole('link', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Map' })).toBeInTheDocument()
  })
})
