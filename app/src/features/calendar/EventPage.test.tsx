import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { fetchCurrentSeason, fetchEvent, fetchEvents, fetchNightActs } from '../../lib/api'
import { renderApp } from '../../test-utils'
import { calendarFixture, SEASON } from './calendar-fixtures'

vi.mock('../../lib/api')

describe('ficha de evento', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-30T19:00:00-03:00'))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchEvents).mockResolvedValue(calendarFixture())
    vi.mocked(fetchEvent).mockImplementation((slug) =>
      Promise.resolve(calendarFixture().find((event) => event.slug === slug) ?? null),
    )
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('muestra el tipo, la fecha, el lugar, el estado y la fuente', async () => {
    renderApp('/calendario/desfile-inaugural-2027')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Desfile Inaugural del Carnaval' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Desfile Inaugural')).toBeInTheDocument()

    const when = screen.getByRole('region', { name: 'Cuándo' })
    expect(within(when).getByText('jueves, 21 de enero')).toBeInTheDocument()
    expect(within(when).getByText('Fecha confirmada')).toBeInTheDocument()
    expect(within(when).queryByText(/aprox/)).not.toBeInTheDocument()

    expect(
      within(screen.getByRole('region', { name: 'Dónde' })).getByText('Av. 18 de Julio'),
    ).toBeInTheDocument()

    const source = screen.getByRole('region', { name: 'Fuente' })
    expect(
      within(source)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['montevideo.gub.uy', 'https://montevideo.gub.uy/carnaval'],
      ['elobservador.com.uy', 'https://www.elobservador.com.uy/nota'],
    ])
    // Dentro de la ficha, la pestaña Calendario sigue marcada.
    expect(screen.getByRole('link', { name: 'Calendario' })).toHaveAttribute('aria-current', 'page')
  })

  it('una fecha estimada se ve como estimada', async () => {
    renderApp('/calendario/llamadas-san-baltasar-2027')
    const when = await screen.findByRole('region', { name: 'Cuándo' })
    expect(within(when).getByText('aprox. miércoles, 6 de enero')).toBeInTheDocument()
    expect(within(when).getByText('Fecha estimada')).toBeInTheDocument()
    expect(within(when).queryByText('Fecha confirmada')).not.toBeInTheDocument()
    expect(within(when).getByText(/todavía no es oficial/)).toBeInTheDocument()
    expect(screen.getByText('Pretemporada')).toBeInTheDocument()
  })

  it('un evento de varios días muestra el rango, y si es estimado lo dice', async () => {
    renderApp('/calendario/concurso-prueba-admision-2027')
    expect(await screen.findByText('Del 10 de noviembre al 16 de noviembre')).toBeInTheDocument()

    cleanup()
    renderApp('/calendario/concurso-completo-2027')
    expect(await screen.findByText('Aprox. del 25 de enero al 3 de marzo')).toBeInTheDocument()
  })

  it('sin lugar ni fuente cargados lo dice, sin dejar huecos', async () => {
    renderApp('/calendario/llamadas-san-baltasar-2027')
    await screen.findByRole('region', { name: 'Cuándo' })
    expect(screen.getByText('Todavía no está cargado el lugar.')).toBeInTheDocument()
    expect(screen.getByText('No hay una fuente cargada para este evento.')).toBeInTheDocument()
  })

  it('«Ver esa noche» abre el pizarrón del día del evento', async () => {
    const { router } = renderApp('/calendario/llamadas-noche-1-2027')
    await userEvent.click(await screen.findByRole('link', { name: 'Ver el pizarrón de esa noche' }))
    expect(router.state.location.pathname).toBe('/')
    expect(router.state.location.search).toBe('?noche=2027-02-05')
    expect(fetchNightActs).toHaveBeenCalledWith(expect.objectContaining({ noche: '2027-02-05' }))
  })

  it('en un evento de varios días que está en curso, lleva a la noche de hoy', async () => {
    renderApp('/calendario/concurso-completo-2027')
    expect(
      await screen.findByRole('link', { name: 'Ver el pizarrón de esta noche' }),
    ).toHaveAttribute('href', '/?noche=2027-01-30')
  })

  it('desde el calendario, tocar un evento abre su ficha y «Volver» regresa', async () => {
    const { router } = renderApp('/calendario')
    await userEvent.click(await screen.findByText('Desfile Oficial de Llamadas - noche 2'))
    expect(router.state.location.pathname).toBe('/calendario/llamadas-noche-2-2027')
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Desfile Oficial de Llamadas - noche 2',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('sábado, 6 de febrero')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(router.state.location.pathname).toBe('/calendario')
  })

  it('un evento que no existe lo dice, y «Volver» lleva al calendario', async () => {
    const { router } = renderApp('/calendario/no-existe')
    expect(await screen.findByText('No encontramos ese evento.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(router.state.location.pathname).toBe('/calendario')
  })

  it('si falla la carga lo avisa y deja reintentar', async () => {
    vi.mocked(fetchEvent).mockRejectedValueOnce(new Error('sin red'))
    renderApp('/calendario/desfile-inaugural-2027')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el evento.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Desfile Inaugural del Carnaval' }),
    ).toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/calendario/concurso-completo-2027')
    const when = await screen.findByRole('region', { name: 'When' })
    expect(within(when).getByText('Around January 25 to March 3')).toBeInTheDocument()
    expect(within(when).getByText('Estimated date')).toBeInTheDocument()
    expect(screen.getByText('Official Contest')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Where' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Source' })).toBeInTheDocument()
  })
})
