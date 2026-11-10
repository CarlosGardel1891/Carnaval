import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { fetchCurrentSeason, fetchLocatedStages, fetchNightActs } from '../../lib/api'
import { renderApp } from '../../test-utils'

// Vitest arma el módulo mockeado recién cuando alguien lo importa: `loaded.map` dice si
// el mapa (y con él MapLibre) ya se cargó.
const loaded = vi.hoisted(() => ({ map: false }))

vi.mock('../../lib/api')
vi.mock('./MontevideoMap', () => {
  loaded.map = true
  return { MontevideoMap: () => <div data-testid="mapa" /> }
})

describe('carga diferida del mapa', () => {
  beforeEach(async () => {
    vi.mocked(fetchCurrentSeason).mockResolvedValue(null)
    vi.mocked(fetchNightActs).mockResolvedValue([])
    vi.mocked(fetchLocatedStages).mockResolvedValue([])
    await i18n.changeLanguage('es')
  })
  afterEach(cleanup)

  it('«Hoy» arranca sin el mapa, que se carga al abrir /mapa', async () => {
    renderApp('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
    expect(loaded.map).toBe(false)

    await userEvent.click(screen.getByRole('link', { name: 'Mapa' }))
    expect(await screen.findByTestId('mapa')).toBeInTheDocument()
    expect(loaded.map).toBe(true)
    expect(screen.getByRole('heading', { level: 1, name: 'Mapa' })).toBeInTheDocument()
  })
})
