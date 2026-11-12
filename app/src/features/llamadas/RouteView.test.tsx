import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchCurrentSeason,
  fetchParadeEvents,
  fetchParadeRoute,
  fetchStreetClosures,
} from '../../lib/api'
import { BLANK_STYLE, initialStyle } from '../map/mapStyle'
import { renderApp } from '../../test-utils'
import { closures, NIGHT_1, nights, route, SEASON } from './llamadas-fixtures'

vi.mock('../../lib/api')
// MapLibre no corre en jsdom: en su lugar va un doble que dice qué le pasaron a dibujar.
vi.mock('../map/ParadeMap', () => ({
  ParadeMap: ({ corners, closures: cuts }: { corners: unknown[]; closures: unknown[] }) => (
    <div data-testid="mapa">{`${corners.length} esquinas, ${cuts.length} cortes`}</div>
  ),
}))

describe('Llamadas: recorrido', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-02-05T19:00:00-03:00'))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchParadeEvents).mockResolvedValue(nights())
    vi.mocked(fetchParadeRoute).mockResolvedValue(route())
    vi.mocked(fetchStreetClosures).mockResolvedValue(closures())
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('se llega desde las vistas y le pasa al mapa el recorrido y los cortes de esa noche', async () => {
    const { router } = renderApp('/llamadas')
    await userEvent.click(await screen.findByRole('link', { name: 'Recorrido' }))
    expect(router.state.location.pathname).toBe('/llamadas/recorrido')
    expect(await screen.findByTestId('mapa')).toHaveTextContent('4 esquinas, 2 cortes')
    expect(fetchParadeRoute).toHaveBeenCalledWith(NIGHT_1.id)
    expect(fetchStreetClosures).toHaveBeenCalledWith(NIGHT_1.id)
  })

  it('lista las esquinas en orden, con la salida y la llegada marcadas', async () => {
    renderApp('/llamadas/recorrido')
    const section = await screen.findByRole('region', { name: 'Recorrido' })
    const corners = within(section).getAllByRole('listitem').slice(-4)
    expect(corners.map((li) => li.textContent)).toEqual([
      'Carlos Gardel y Zelmar MicheliniSalida',
      'Isla de Flores y Carlos Quijano',
      'Isla de Flores y Aquiles Lanza',
      'Isla de Flores y EjidoLlegada',
    ])
    expect(
      within(section).getByText('3 cuadras, 450 m de la salida a la llegada.'),
    ).toBeInTheDocument()
    expect(
      within(within(section).getByRole('list', { name: 'Referencias' }))
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Recorrido', 'Calle cortada', 'No estacionar'])
  })

  it('lista los cortes por tipo, con su horario en hora de Montevideo y marcados como estimados', async () => {
    renderApp('/llamadas/recorrido')
    const section = await screen.findByRole('region', { name: 'Cortes de calle' })
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Calles cortadas y desvíos', 'No estacionar'])
    const [cut, noParking] = within(section).getAllByRole('listitem')
    expect(
      within(cut!).getByText('Carlos Gardel e Isla de Flores, de Zelmar Michelini a Minas'),
    ).toBeInTheDocument()
    expect(within(cut!).getByText('desde el vie, 5 feb, 12:00')).toBeInTheDocument()
    expect(within(cut!).getByText('Estimado según años anteriores')).toBeInTheDocument()
    expect(within(noParking!).getByText('desde el vie, 5 feb, 08:00')).toBeInTheDocument()
  })

  it('un corte confirmado no lleva la marca de estimado, y uno sin horario no inventa uno', async () => {
    vi.mocked(fetchStreetClosures).mockResolvedValue([
      { ...closures()[0]!, estado: 'confirmado', desde: null },
    ])
    renderApp('/llamadas/recorrido')
    const section = await screen.findByRole('region', { name: 'Cortes de calle' })
    const [cut] = within(section).getAllByRole('listitem')
    expect(within(cut!).queryByText('Estimado según años anteriores')).not.toBeInTheDocument()
    expect(within(cut!).queryByText(/desde el/)).not.toBeInTheDocument()
  })

  it('dice que el recorrido es estimado y de dónde salió', async () => {
    renderApp('/llamadas/recorrido')
    await screen.findByTestId('mapa')
    expect(screen.getByText(/todavía no es oficial/)).toBeInTheDocument()
    const source = screen.getByRole('region', { name: 'Fuente' })
    expect(
      within(source)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href')),
    ).toEqual(['https://example.org/recorrido', 'https://example.org/cortes'])
    expect(
      within(source).getByText('Coordenadas: © colaboradores de OpenStreetMap.'),
    ).toBeInTheDocument()
  })

  it('sin cortes cargados lo dice, y el recorrido se ve igual', async () => {
    vi.mocked(fetchStreetClosures).mockResolvedValue([])
    renderApp('/llamadas/recorrido')
    expect(await screen.findByTestId('mapa')).toHaveTextContent('4 esquinas, 0 cortes')
    expect(
      await screen.findByText('Todavía no hay cortes de calle cargados para esta noche.'),
    ).toBeInTheDocument()
  })

  it('sin recorrido cargado lo dice, sin mapa', async () => {
    vi.mocked(fetchParadeRoute).mockResolvedValue([])
    renderApp('/llamadas/recorrido')
    expect(
      await screen.findByText('Todavía no está cargado el recorrido del desfile.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('mapa')).not.toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/llamadas/recorrido')
    const section = await screen.findByRole('region', { name: 'Route' })
    expect(within(section).getByText('Carlos Gardel & Zelmar Michelini')).toBeInTheDocument()
    expect(within(section).getByText('Start')).toBeInTheDocument()
    expect(within(section).getByText('Finish')).toBeInTheDocument()
    const cuts = screen.getByRole('region', { name: 'Street closures' })
    expect(within(cuts).getByText('from Fri, Feb 5, 12:00 PM')).toBeInTheDocument()
    expect(within(cuts).getAllByText('Estimated from previous years')).toHaveLength(2)
  })
})

describe('estilo del mapa', () => {
  it('con key y con red, las calles de MapTiler', () => {
    expect(initialStyle('mi-key', true)).toEqual({
      style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=mi-key',
      blank: null,
    })
  })

  it('sin key va al fondo liso, que no pide nada a la red', () => {
    expect(initialStyle(undefined, true)).toEqual({ style: BLANK_STYLE, blank: 'no-key' })
    expect(BLANK_STYLE.sources).toEqual({})
    expect(JSON.stringify(BLANK_STYLE)).not.toMatch(/https?:/)
  })

  it('sin red va directo al fondo liso, aunque haya key', () => {
    expect(initialStyle('mi-key', false)).toEqual({ style: BLANK_STYLE, blank: 'no-network' })
  })
})
