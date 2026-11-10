import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusManager } from '@tanstack/react-query'
import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { fetchCurrentSeason, fetchNightActs } from '../../lib/api'
import { nightFixture } from '../../test-fixtures'
import { renderApp } from '../../test-utils'

vi.mock('../../lib/api')

const season = {
  id: 1,
  anio: 2027,
  fecha_inicio: '2027-01-21',
  fecha_fin: '2027-03-07',
  modo_llamadas_desde: '2027-02-05',
  modo_llamadas_hasta: '2027-02-06',
}

/** La fila (li) de un conjunto. */
function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest('li')
  if (!row) throw new Error(`No hay fila para ${name}`)
  return row
}

describe('pizarrón Hoy', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    // El teléfono en Tokio y son las 21:35 de la noche del 28/01 en Montevideo.
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-28T21:35:00-03:00'))
    vi.mocked(fetchNightActs).mockResolvedValue(nightFixture())
    vi.mocked(fetchCurrentSeason).mockResolvedValue(season)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    focusManager.setFocused(undefined)
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('muestra la noche por escenario, ordenada y con las horas de Montevideo', async () => {
    renderApp('/')
    const centro = await screen.findByRole('region', { name: 'Tablado Centro' })

    expect(fetchNightActs).toHaveBeenCalledWith({
      noche: '2027-01-28',
      onlyFree: false,
      origin: null,
    })
    expect(screen.getByText('jueves, 28 de enero')).toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Escenario Prado', 'Tablado Centro', 'Escenario Móvil', 'Club Unión'])
    expect(
      within(centro)
        .getAllByRole('listitem')
        .map((row) => row.querySelector('time')?.textContent),
    ).toEqual(['20:30', '23:45', '00:40'])
    expect(within(centro).getByText('Tablado privado · Centro · $ 300')).toBeInTheDocument()
    expect(screen.getByText('Escenario popular · Prado · Gratis')).toBeInTheDocument()
  })

  it('a las 02:00 pide y muestra la noche anterior', async () => {
    vi.setSystemTime(new Date('2027-01-29T02:00:00-03:00'))
    renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    expect(fetchNightActs).toHaveBeenCalledWith(expect.objectContaining({ noche: '2027-01-28' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
    expect(screen.getByText('jueves, 28 de enero')).toBeInTheDocument()
  })

  it('una actuación suspendida se ve tachada y rotulada, nunca «en escena»', async () => {
    renderApp('/')
    await screen.findByRole('region', { name: 'Escenario Prado' })
    const row = rowOf('La Nueva Milonga')
    expect(screen.getByText('La Nueva Milonga').tagName).toBe('S')
    expect(within(row).getByText('Suspendida')).toBeInTheDocument()
    expect(within(row).queryByText('Ahora en escena')).not.toBeInTheDocument()
  })

  it('una actuación cambiada lleva su rótulo', async () => {
    renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    expect(within(rowOf('Doña Bastarda')).getByText('Cambió')).toBeInTheDocument()
    expect(within(rowOf('Agarrate Catalina')).queryByText('Cambió')).not.toBeInTheDocument()
  })

  it('marca lo que está ahora en escena', async () => {
    renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    // 21:35: la suspendida de las 21:30 no corta a C 1080 (20:30, hasta las 21:45).
    for (const name of ['Agarrate Catalina', 'C 1080', 'Los Patos Cabreros', 'Zíngaros']) {
      expect(within(rowOf(name)).getByText('Ahora en escena')).toBeInTheDocument()
    }
    expect(screen.getAllByText('Ahora en escena')).toHaveLength(4)
  })

  it('la parada de un itinerante sale en cada actuación', async () => {
    renderApp('/')
    await screen.findByRole('region', { name: 'Escenario Móvil' })
    expect(within(rowOf('Los Patos Cabreros')).getByText(/Esquina ficticia 1/)).toBeInTheDocument()
    expect(within(rowOf('Queso Magro')).getByText(/Esquina ficticia 2/)).toBeInTheDocument()
  })

  it('con ?noche= muestra otra noche, sin «ahora en escena»', async () => {
    vi.setSystemTime(new Date('2027-02-10T21:35:00-03:00'))
    renderApp('/?noche=2027-01-28')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    expect(fetchNightActs).toHaveBeenCalledWith(expect.objectContaining({ noche: '2027-01-28' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Otra noche' })).toBeInTheDocument()
    expect(screen.queryByText('Ahora en escena')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a hoy' })).toBeInTheDocument()
  })

  it('dice cuándo se actualizó', async () => {
    renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    expect(screen.getByText('Actualizado recién')).toBeInTheDocument()
  })

  it('al volver la app al frente refresca la grilla y la hora', async () => {
    renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    expect(within(rowOf('Cayó la Cabra')).queryByText('Ahora en escena')).not.toBeInTheDocument()

    // Una hora en segundo plano: los timers no corrieron.
    act(() => focusManager.setFocused(false))
    vi.setSystemTime(new Date('2027-01-28T22:35:00-03:00'))
    act(() => focusManager.setFocused(true))

    expect(within(rowOf('Cayó la Cabra')).getByText('Ahora en escena')).toBeInTheDocument()
    await waitFor(() => expect(fetchNightActs).toHaveBeenCalledTimes(2))
  })

  it('antes de la temporada dice cuándo arranca y muestra la temporada', async () => {
    vi.setSystemTime(new Date('2026-11-10T20:00:00-03:00'))
    vi.mocked(fetchNightActs).mockResolvedValue([])
    renderApp('/')
    expect(await screen.findByText('El Carnaval 2027 arranca el 21 de enero.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Carnaval 2027' })).toBeInTheDocument()
    expect(fetchCurrentSeason).toHaveBeenCalledWith('2026-11-10')
  })

  it('en temporada, una noche sin actuaciones lo dice', async () => {
    vi.setSystemTime(new Date('2027-02-01T20:00:00-03:00'))
    vi.mocked(fetchNightActs).mockResolvedValue([])
    renderApp('/')
    expect(
      await screen.findByText('Todavía no hay actuaciones cargadas para esta noche.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Carnaval 2027' })).not.toBeInTheDocument()
  })

  it('sin temporada por delante, dice que esa noche no hay nada', async () => {
    vi.mocked(fetchNightActs).mockResolvedValue([])
    vi.mocked(fetchCurrentSeason).mockResolvedValue(null)
    renderApp('/')
    expect(await screen.findByText('Esta noche no hay actuaciones.')).toBeInTheDocument()
  })

  it('si hay actuaciones se muestran aunque sea fuera de temporada', async () => {
    vi.setSystemTime(new Date('2026-11-10T21:00:00-03:00'))
    renderApp('/')
    expect(await screen.findByRole('region', { name: 'Tablado Centro' })).toBeInTheDocument()
    expect(fetchCurrentSeason).not.toHaveBeenCalled()
  })

  it('si falla la carga lo dice y deja reintentar', async () => {
    vi.mocked(fetchNightActs).mockRejectedValueOnce(new Error('sin red'))
    renderApp('/')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la grilla.')

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('region', { name: 'Tablado Centro' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('en inglés traduce rótulos y formatea las horas', async () => {
    await i18n.changeLanguage('en')
    renderApp('/')
    const centro = await screen.findByRole('region', { name: 'Tablado Centro' })
    expect(within(rowOf('La Nueva Milonga')).getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getAllByText('On stage now')).toHaveLength(4)
    expect(within(centro).getAllByRole('listitem')[0]?.querySelector('time')?.textContent).toMatch(
      /^8:30\sPM$/,
    )
    expect(screen.getByText('Thursday, January 28')).toBeInTheDocument()
  })
})
