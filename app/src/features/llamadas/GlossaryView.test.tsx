import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { fetchCurrentSeason, fetchParadeEvents } from '../../lib/api'
import en from '../../locales/en.json'
import es from '../../locales/es.json'
import { renderApp } from '../../test-utils'
import { GLOSSARY_TERMS } from './glossary'
import { nights, SEASON } from './llamadas-fixtures'

vi.mock('../../lib/api')

const terms = () =>
  within(screen.getByRole('region', { name: /^(Glosario|Glossary)$/ }))
    .getAllByRole('term')
    .map((term) => term.textContent)

describe('Llamadas: glosario', () => {
  beforeEach(async () => {
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchParadeEvents).mockResolvedValue(nights())
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('tiene veinte términos, con su explicación, en los dos idiomas', () => {
    expect(GLOSSARY_TERMS).toHaveLength(20)
    expect(new Set(GLOSSARY_TERMS).size).toBe(20)
    for (const locale of [es, en]) {
      expect(Object.keys(locale.glossary.terms).sort()).toEqual([...GLOSSARY_TERMS].sort())
      for (const key of GLOSSARY_TERMS) {
        const { term, text } = locale.glossary.terms[key]
        expect(term.trim()).not.toBe('')
        expect(text.trim().length).toBeGreaterThan(8)
      }
    }
  })

  it('se llega desde las vistas y muestra los términos en orden', async () => {
    const { router } = renderApp('/llamadas')
    await userEvent.click(await screen.findByRole('link', { name: 'Glosario' }))
    expect(router.state.location.pathname).toBe('/llamadas/glosario')
    expect(terms()).toEqual([
      'Candombe',
      'Llamada',
      'Comparsa',
      'Cuerda',
      'Tamborilero',
      'Chico',
      'Repique',
      'Piano',
      'Lonja',
      'Templar',
      'Madera',
      'Toque',
      'Cuerpo de baile',
      'Mama vieja',
      'Gramillero',
      'Escobero',
      'Vedette',
      'Estandarte',
      'Banderas',
      'Medialuna y estrella',
    ])
    expect(screen.getByText('El conjunto de tambores de una comparsa.')).toBeInTheDocument()
    expect(screen.getAllByRole('definition')).toHaveLength(20)
  })

  it('está en inglés con el idioma en inglés: el término queda en español y se explica en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/llamadas/glosario')
    expect(await screen.findByRole('heading', { level: 2, name: 'Glossary' })).toBeInTheDocument()
    expect(terms()).toContain('Mama vieja')
    expect(screen.getByText("A comparsa's drum line.")).toBeInTheDocument()
    expect(
      screen.getByText('The smallest, highest-pitched drum. It keeps a steady pulse.'),
    ).toBeInTheDocument()
  })

  it('se ve aunque no carguen los datos del desfile: no necesita la red', async () => {
    vi.mocked(fetchCurrentSeason).mockRejectedValue(new Error('sin red'))
    vi.mocked(fetchParadeEvents).mockRejectedValue(new Error('sin red'))
    renderApp('/llamadas/glosario')
    expect(await screen.findByRole('heading', { level: 2, name: 'Glosario' })).toBeInTheDocument()
    expect(terms()).toHaveLength(20)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('y aunque todavía no estén cargadas las noches', async () => {
    vi.mocked(fetchParadeEvents).mockResolvedValue([])
    renderApp('/llamadas/glosario')
    expect(await screen.findByRole('heading', { level: 2, name: 'Glosario' })).toBeInTheDocument()
    expect(screen.queryByText(/Todavía no están cargadas las noches/)).not.toBeInTheDocument()
  })
})
