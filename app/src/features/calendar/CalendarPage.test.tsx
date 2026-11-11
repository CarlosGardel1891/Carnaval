import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { fetchCurrentSeason, fetchEvents, fetchNightActs } from '../../lib/api'
import { renderApp } from '../../test-utils'
import { calendarFixture, SEASON } from './calendar-fixtures'

vi.mock('../../lib/api')

/** La fila (li) del día que contiene ese evento. */
function dayOf(eventName: string): HTMLElement {
  const row = screen.getByText(eventName).closest('li')?.parentElement?.closest('li')
  if (!row) throw new Error(`No hay fila de día para ${eventName}`)
  return row
}

/** El renglón (li) de un evento. */
function eventRow(eventName: string): HTMLElement {
  const row = screen.getByText(eventName).closest('li')
  if (!row) throw new Error(`No hay renglón para ${eventName}`)
  return row
}

const monthNames = () =>
  screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

describe('calendario', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    // El teléfono en Tokio; en Montevideo son las 00:40 del 31/01: todavía la noche del 30.
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-31T00:40:00-03:00'))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchEvents).mockResolvedValue(calendarFixture())
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('muestra los eventos de la temporada por mes y por fecha, con la pestaña marcada', async () => {
    renderApp('/calendario')
    expect(await screen.findByText('Desfile Inaugural del Carnaval')).toBeInTheDocument()
    expect(fetchEvents).toHaveBeenCalledWith(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Calendario' })).toBeInTheDocument()
    expect(screen.getByText('Carnaval 2027')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Calendario' })).toHaveAttribute('aria-current', 'page')

    expect(monthNames()).toEqual(['noviembre de 2026', 'enero de 2027', 'febrero de 2027'])
    const january = screen.getByRole('region', { name: 'enero de 2027' })
    expect(
      within(january)
        .getAllByRole('link', { name: /^Ver la noche del/ })
        .map((link) => link.textContent),
    ).toEqual(['6mié', '21jue', '25lun', '30sáb'])
  })

  it('cada evento dice su tipo y su lugar', async () => {
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    expect(
      within(eventRow('Desfile Inaugural del Carnaval')).getByText(
        'Desfile Inaugural · Av. 18 de Julio',
      ),
    ).toBeInTheDocument()
    expect(
      within(eventRow('Desfile Oficial de Llamadas - noche 1')).getByText(
        'Llamadas · Carlos Gardel e Isla de Flores',
      ),
    ).toBeInTheDocument()
  })

  it('marca hoy con la noche lógica de Montevideo, no con la fecha del teléfono', async () => {
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    const today = screen.getByText('Hoy', { selector: 'p' }).closest('li') as HTMLElement
    expect(today).toHaveAttribute('aria-current', 'date')
    // En Tokio ya es 31 y en Montevideo es la madrugada del 31: la noche sigue siendo la del 30.
    expect(within(today).getByRole('link', { name: 'Ver la noche del sábado, 30 de enero' })).toBe(
      within(today).getAllByRole('link')[0],
    )
    expect(document.querySelectorAll('[aria-current="date"]')).toHaveLength(1)
  })

  it('en la fila de hoy repite lo que está en curso', async () => {
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    const today = screen.getByText('Hoy', { selector: 'p' }).closest('li') as HTMLElement
    expect(within(today).getByText('Concurso Oficial completo')).toBeInTheDocument()
    expect(within(today).getByText('En curso')).toBeInTheDocument()
    // Y sigue en su día de inicio, sin la marca.
    expect(screen.getAllByText('Concurso Oficial completo')).toHaveLength(2)
    expect(screen.getAllByText('En curso')).toHaveLength(1)
  })

  it('un día sin eventos, si es hoy, lo dice', async () => {
    vi.setSystemTime(new Date('2027-02-01T20:00:00-03:00'))
    vi.mocked(fetchEvents).mockResolvedValue(
      calendarFixture().filter((event) => event.slug !== 'concurso-completo-2027'),
    )
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    const today = screen.getByText('Hoy', { selector: 'p' }).closest('li') as HTMLElement
    expect(
      within(today).getByText('Hoy no empieza ningún evento del calendario.'),
    ).toBeInTheDocument()
  })

  it('lo que ya pasó queda en segundo plano; lo que viene y lo que sigue en curso, no', async () => {
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    const dimmed = (name: string) => eventRow(name).className.includes('opacity-60')
    expect(dimmed('Prueba de Admisión al Concurso Oficial 2027')).toBe(true)
    expect(dimmed('Desfile Inaugural del Carnaval')).toBe(true)
    expect(dimmed('Desfile Oficial de Llamadas - noche 1')).toBe(false)
    // Empezó el 25/01 pero termina en marzo: no pasó.
    expect(
      screen.getAllByText('Concurso Oficial completo').every((el) => {
        return !(el.closest('li') as HTMLElement).className.includes('opacity-60')
      }),
    ).toBe(true)
  })

  it('un evento de varios días dice hasta cuándo va', async () => {
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    expect(
      within(eventRow('Prueba de Admisión al Concurso Oficial 2027')).getByText(
        'Admisión · hasta el 16 de noviembre · Teatro de Verano Ramón Collazo',
      ),
    ).toBeInTheDocument()
    expect(dayOf('Prueba de Admisión al Concurso Oficial 2027').querySelector('a')).toHaveAttribute(
      'href',
      '/?noche=2026-11-10',
    )
  })

  it('las fechas estimadas se ven como estimadas, y las confirmadas no llevan marca', async () => {
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    expect(
      within(eventRow('Llamadas de San Baltasar')).getByText('Fecha estimada'),
    ).toBeInTheDocument()
    const contest = screen
      .getAllByText('Concurso Oficial completo')[0]!
      .closest('li') as HTMLElement
    expect(within(contest).getByText('Fecha estimada')).toBeInTheDocument()
    expect(within(contest).getByText(/aprox\. hasta el 3 de marzo/)).toBeInTheDocument()

    for (const name of ['Desfile Inaugural del Carnaval', 'Inicio del Concurso Oficial']) {
      expect(within(eventRow(name)).queryByText('Fecha estimada')).not.toBeInTheDocument()
      expect(within(eventRow(name)).queryByText('Fecha confirmada')).not.toBeInTheDocument()
    }
  })

  it('la pretemporada va rotulada', async () => {
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    for (const name of [
      'Prueba de Admisión al Concurso Oficial 2027',
      'Llamadas de San Baltasar',
    ]) {
      expect(within(eventRow(name)).getByText('Pretemporada')).toBeInTheDocument()
    }
    // El Inaugural es el primer día de la temporada: ya no es pretemporada.
    expect(
      within(eventRow('Desfile Inaugural del Carnaval')).queryByText('Pretemporada'),
    ).not.toBeInTheDocument()
  })

  it('las dos noches de Llamadas son dos días distintos', async () => {
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    expect(dayOf('Desfile Oficial de Llamadas - noche 1').querySelector('a')).toHaveAttribute(
      'href',
      '/?noche=2027-02-05',
    )
    expect(dayOf('Desfile Oficial de Llamadas - noche 2').querySelector('a')).toHaveAttribute(
      'href',
      '/?noche=2027-02-06',
    )
  })

  it('tocar un día abre el pizarrón de esa noche', async () => {
    const { router } = renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    await userEvent.click(
      screen.getByRole('link', { name: 'Ver la noche del viernes, 5 de febrero' }),
    )
    expect(router.state.location.pathname).toBe('/')
    expect(router.state.location.search).toBe('?noche=2027-02-05')
    expect(await screen.findByText('viernes, 5 de febrero')).toBeInTheDocument()
    expect(fetchNightActs).toHaveBeenCalledWith(expect.objectContaining({ noche: '2027-02-05' }))
  })

  it('sin eventos cargados lo dice', async () => {
    vi.mocked(fetchEvents).mockResolvedValue([])
    renderApp('/calendario')
    expect(
      await screen.findByText('Todavía no hay eventos cargados para esta temporada.'),
    ).toBeInTheDocument()
  })

  it('si falla la carga lo avisa y deja reintentar', async () => {
    vi.mocked(fetchEvents).mockRejectedValueOnce(new Error('sin red'))
    renderApp('/calendario')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el calendario.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Desfile Inaugural del Carnaval')).toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés, con las fechas en ese idioma', async () => {
    await i18n.changeLanguage('en')
    renderApp('/calendario')
    await screen.findByText('Desfile Inaugural del Carnaval')
    expect(screen.getByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument()
    expect(monthNames()).toEqual(['November 2026', 'January 2027', 'February 2027'])
    expect(
      within(eventRow('Prueba de Admisión al Concurso Oficial 2027')).getByText(
        'Admission · until November 16 · Teatro de Verano Ramón Collazo',
      ),
    ).toBeInTheDocument()
    expect(
      within(eventRow('Llamadas de San Baltasar')).getByText('Estimated date'),
    ).toBeInTheDocument()
    expect(within(eventRow('Llamadas de San Baltasar')).getByText('Pre-season')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'See the night of Saturday, January 30' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Today', { selector: 'p' })).toBeInTheDocument()
  })
})
