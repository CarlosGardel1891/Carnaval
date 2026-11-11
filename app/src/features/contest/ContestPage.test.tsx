import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchContestFixture,
  fetchCurrentSeason,
  fetchEvents,
  fetchGroup,
  fetchNightActs,
} from '../../lib/api'
import { renderApp } from '../../test-utils'
import { calendarFixture, SEASON } from '../calendar/calendar-fixtures'
import { fixtureRows } from './contest-fixtures'

vi.mock('../../lib/api')

const nightOf = (name: string) => screen.getByRole('region', { name: new RegExp(`^${name}`) })

describe('Concurso Oficial', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    // El teléfono en Tokio; en Montevideo es la noche del 26/01, 19:00.
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-26T19:00:00-03:00'))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchEvents).mockResolvedValue(calendarFixture())
    vi.mocked(fetchContestFixture).mockResolvedValue(fixtureRows())
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('muestra las tres ruedas, cada una con sus noches', async () => {
    renderApp('/calendario/concurso')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Primera rueda' }),
    ).toBeInTheDocument()
    expect(fetchContestFixture).toHaveBeenCalledWith(2027)
    expect(screen.getByRole('heading', { level: 1, name: 'Concurso Oficial' })).toBeInTheDocument()
    expect(screen.getByText('Teatro de Verano · Carnaval 2027')).toBeInTheDocument()

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Primera rueda', 'Segunda rueda', 'Liguilla'])
    const primera = screen.getByRole('region', { name: 'Primera rueda' })
    expect(
      within(primera)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Etapa 1lunes, 25 de enero', 'Etapa 2martes, 26 de eneroHoy'])
    // Dentro del Concurso, la pestaña Calendario sigue marcada.
    expect(screen.getByRole('link', { name: 'Calendario' })).toHaveAttribute('aria-current', 'page')
  })

  it('cada noche lista sus conjuntos con la hora de Montevideo, también pasada la medianoche', async () => {
    renderApp('/calendario/concurso')
    await screen.findByRole('heading', { level: 2, name: 'Primera rueda' })
    const rows = within(nightOf('Etapa 1 · lunes, 25 de enero')).getAllByRole('listitem')
    expect(
      rows.map((row) => [
        row.querySelector('time')?.textContent,
        row.querySelector('a')?.textContent,
      ]),
    ).toEqual([
      ['20:30', 'Doña Bastarda'],
      ['21:45', 'Zíngaros'],
      ['00:15', 'La Gran Muñeca'],
    ])
    expect(within(rows[1]!).getByText('Parodistas')).toBeInTheDocument()
  })

  it('una actuación suspendida se ve marcada', async () => {
    renderApp('/calendario/concurso')
    await screen.findByRole('heading', { level: 2, name: 'Primera rueda' })
    const night = nightOf('Etapa 2 · martes, 26 de enero')
    expect(within(night).getByText('Suspendida')).toBeInTheDocument()
    expect(
      within(nightOf('Etapa 1 · lunes, 25 de enero')).queryByText('Suspendida'),
    ).not.toBeInTheDocument()
  })

  it('marca la noche de hoy y deja en segundo plano las que ya pasaron', async () => {
    renderApp('/calendario/concurso')
    await screen.findByRole('heading', { level: 2, name: 'Primera rueda' })
    // (La barra de pestañas también dice «Hoy»: se mira sólo la pantalla.)
    expect(within(screen.getByRole('main')).getAllByText('Hoy')).toHaveLength(1)
    expect(within(nightOf('Etapa 2 · martes, 26 de enero')).getByText('Hoy')).toBeInTheDocument()
    expect(nightOf('Etapa 1 · lunes, 25 de enero').className).toContain('opacity-60')
    expect(nightOf('Etapa 2 · martes, 26 de enero').className).not.toContain('opacity-60')
  })

  it('una noche que todavía no tiene conjuntos lo dice', async () => {
    renderApp('/calendario/concurso')
    await screen.findByRole('heading', { level: 2, name: 'Liguilla' })
    const liguilla = screen.getByRole('region', { name: 'Liguilla' })
    expect(
      within(liguilla).getByText('Todavía no están cargados los conjuntos de esta noche.'),
    ).toBeInTheDocument()
  })

  it('desde una noche se llega a la ficha del conjunto, y «Volver» regresa al Concurso', async () => {
    vi.mocked(fetchGroup).mockResolvedValue({
      id: 103,
      slug: 'zingaros',
      nombre: 'Zíngaros',
      categoria: 'parodistas',
      barrio: null,
      bio: null,
      instagram: null,
      facebook: null,
      foto_url: null,
      temporadas: [],
    })
    const { router } = renderApp('/calendario/concurso')
    await screen.findByRole('heading', { level: 2, name: 'Primera rueda' })
    const link = within(nightOf('Etapa 1 · lunes, 25 de enero')).getByRole('link', {
      name: 'Zíngaros',
    })
    expect(link).toHaveAttribute('href', '/conjuntos/zingaros')

    await userEvent.click(link)
    expect(router.state.location.pathname).toBe('/conjuntos/zingaros')
    expect(await screen.findByRole('heading', { level: 1, name: 'Zíngaros' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(router.state.location.pathname).toBe('/calendario/concurso')
  })

  it('tocar la fecha de una noche abre el pizarrón de esa noche', async () => {
    const { router } = renderApp('/calendario/concurso')
    await screen.findByRole('heading', { level: 2, name: 'Primera rueda' })
    await userEvent.click(
      screen.getByRole('link', { name: 'Ver la noche del lunes, 1 de febrero' }),
    )
    expect(router.state.location.pathname).toBe('/')
    expect(router.state.location.search).toBe('?noche=2027-02-01')
    expect(fetchNightActs).toHaveBeenCalledWith(expect.objectContaining({ noche: '2027-02-01' }))
  })

  it('sin fixture dice que todavía no se publicó, y cuándo empieza el Concurso', async () => {
    vi.mocked(fetchContestFixture).mockResolvedValue([])
    renderApp('/calendario/concurso')
    expect(
      await screen.findByText('El fixture del Concurso 2027 todavía no se publicó.'),
    ).toBeInTheDocument()
    expect(await screen.findByText('El Concurso empieza el 25 de enero.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
    expect(screen.queryByText(/Fixture de prueba/)).not.toBeInTheDocument()
  })

  it('sin fixture y con el inicio estimado, la fecha se da como estimada', async () => {
    vi.mocked(fetchContestFixture).mockResolvedValue([])
    vi.mocked(fetchEvents).mockResolvedValue(
      calendarFixture().filter((event) => event.slug !== 'concurso-inicio-2027'),
    )
    renderApp('/calendario/concurso')
    expect(
      await screen.findByText(/empezaría alrededor del 25 de enero: la fecha todavía es estimada/),
    ).toBeInTheDocument()
  })

  it('sin fixture y sin evento del Concurso, sólo dice que no se publicó', async () => {
    vi.mocked(fetchContestFixture).mockResolvedValue([])
    vi.mocked(fetchEvents).mockResolvedValue([])
    renderApp('/calendario/concurso')
    expect(
      await screen.findByText('El fixture del Concurso 2027 todavía no se publicó.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/empieza|empezaría/)).not.toBeInTheDocument()
  })

  it('con el fixture de prueba cargado avisa que es de prueba', async () => {
    vi.mocked(fetchContestFixture).mockResolvedValue(fixtureRows('fixture-ficticio'))
    renderApp('/calendario/concurso')
    expect(await screen.findByRole('note')).toHaveTextContent(
      'Fixture de prueba: las noches, el orden y las horas son inventados.',
    )
  })

  it('con el fixture publicado no hay aviso de prueba', async () => {
    renderApp('/calendario/concurso')
    await screen.findByRole('heading', { level: 2, name: 'Primera rueda' })
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('desde el calendario se llega al Concurso, y «Volver» regresa', async () => {
    const { router } = renderApp('/calendario')
    await userEvent.click(await screen.findByRole('link', { name: /^Concurso Oficial/ }))
    expect(router.state.location.pathname).toBe('/calendario/concurso')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Primera rueda' }),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(router.state.location.pathname).toBe('/calendario')
  })

  it('si falla la carga lo avisa y deja reintentar', async () => {
    vi.mocked(fetchContestFixture).mockRejectedValueOnce(new Error('sin red'))
    renderApp('/calendario/concurso')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar el fixture del Concurso.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Primera rueda' }),
    ).toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/calendario/concurso')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'First round' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Official Contest' })).toBeInTheDocument()
    const night = nightOf('Night 1 · Monday, January 25')
    expect(within(night).getByText('Monday, January 25')).toBeInTheDocument()
    expect(within(night).getAllByRole('listitem')[0]!.querySelector('time')?.textContent).toBe(
      '8:30 PM',
    )

    cleanup()
    vi.mocked(fetchContestFixture).mockResolvedValue([])
    renderApp('/calendario/concurso')
    expect(
      await screen.findByText("The 2027 Contest fixture hasn't been published yet."),
    ).toBeInTheDocument()
  })
})
