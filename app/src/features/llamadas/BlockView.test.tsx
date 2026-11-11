import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchCurrentSeason,
  fetchFollowed,
  fetchParadeEvents,
  fetchParadeOrder,
  fetchParadeRoute,
} from '../../lib/api'
import { currentPosition, hasLocationPermission, LocationError } from '../../lib/geo'
import { renderApp } from '../../test-utils'
import { NIGHT_1, nights, order1, order2, route, SEASON } from './llamadas-fixtures'

vi.mock('../../lib/api')
vi.mock('../../lib/geo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/geo')>()),
  currentPosition: vi.fn(),
  hasLocationPermission: vi.fn(),
}))

const rows = () =>
  within(screen.getByRole('region', { name: 'A qué hora pasa por tu cuadra' })).getAllByRole(
    'listitem',
  )
const times = () => rows().map((row) => row.querySelector('time')?.textContent)
const select = () => screen.getByRole('combobox', { name: 'Cuadra' })
const nearChip = () => screen.getByRole('button', { name: 'Cerca mío' })

describe('Llamadas: por cuadra', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-02-05T19:00:00-03:00'))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchParadeEvents).mockResolvedValue(nights())
    vi.mocked(fetchParadeOrder).mockImplementation((eventId) =>
      Promise.resolve(eventId === NIGHT_1.id ? order1() : order2()),
    )
    vi.mocked(fetchParadeRoute).mockResolvedValue(route())
    vi.mocked(hasLocationPermission).mockResolvedValue(false)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('se llega desde el orden, y ofrece las cuadras del recorrido', async () => {
    const { router } = renderApp('/llamadas')
    await userEvent.click(await screen.findByRole('link', { name: 'Por cuadra' }))
    expect(router.state.location.pathname).toBe('/llamadas/cuadra')
    await screen.findByRole('combobox', { name: 'Cuadra' })
    expect(fetchParadeRoute).toHaveBeenCalledWith(NIGHT_1.id)
    expect(
      within(select())
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'Elegí una cuadra',
      '1. De Zelmar Michelini a Carlos Quijano',
      '2. De Carlos Quijano a Aquiles Lanza',
      '3. De Aquiles Lanza a Ejido',
    ])
    // Sin cuadra elegida no hay horas.
    expect(document.querySelector('main time')).toBeNull()
  })

  it('eligiendo una cuadra se ve a qué hora pasa cada comparsa, y queda en la URL', async () => {
    const { router } = renderApp('/llamadas/cuadra')
    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Cuadra' }), '3')
    expect(router.state.location.search).toBe('?cuadra=3')
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      'Isla de Flores, de Aquiles Lanza a Ejido',
    )
    // La mitad de la tercera cuadra está a 375 metros: 25 minutos después de cada salida.
    expect(times()).toEqual(['≈ 20:25', '≈ 20:35', '≈ 20:45'])
    expect(rows().map((row) => row.querySelector('a')?.textContent)).toEqual([
      'C 1080',
      'Valores de Ansina',
      'La Dominguera',
    ])
    expect(screen.getByText('Las horas son para la mitad de la cuadra.')).toBeInTheDocument()
    expect(screen.getByText(/La primera comparsa sale a las 20:00/)).toBeInTheDocument()
  })

  it('la primera cuadra va por Carlos Gardel', async () => {
    renderApp('/llamadas/cuadra?cuadra=1')
    expect(await screen.findByRole('heading', { level: 3 })).toHaveTextContent(
      'Carlos Gardel, de Zelmar Michelini a Carlos Quijano',
    )
    expect(times()).toEqual(['≈ 20:05', '≈ 20:15', '≈ 20:25'])
  })

  it('en otra noche usa el orden de esa noche, también pasada la medianoche', async () => {
    renderApp('/llamadas/cuadra?noche=2027-02-06&cuadra=3')
    await screen.findByRole('heading', { level: 3 })
    expect(rows()).toHaveLength(26)
    expect(times().at(-1)).toBe('≈ 00:35')
  })

  it('marca las comparsas que el usuario sigue', async () => {
    vi.mocked(fetchFollowed).mockResolvedValue([203])
    renderApp('/llamadas/cuadra?cuadra=2')
    await screen.findByRole('heading', { level: 3 })
    expect(await within(rows()[2]!).findByText('La seguís')).toBeInTheDocument()
  })

  it('«Cerca mío» elige la cuadra más cercana y dice a cuánto queda', async () => {
    const corners = route()
    // Unos 100 metros al sur de la mitad de la segunda cuadra.
    vi.mocked(currentPosition).mockResolvedValue({
      coords: { lat: -34.9119, lng: (corners[1]!.lng + corners[2]!.lng) / 2 },
      approximate: false,
    })
    renderApp('/llamadas/cuadra')
    await screen.findByRole('combobox', { name: 'Cuadra' })
    expect(currentPosition).not.toHaveBeenCalled()

    await userEvent.click(nearChip())
    expect(await screen.findByRole('heading', { level: 3 })).toHaveTextContent(
      'Isla de Flores, de Carlos Quijano a Aquiles Lanza',
    )
    expect(nearChip()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText(/Es la cuadra más cercana: estás a 100 m\./)).toBeInTheDocument()
    expect(select()).toHaveValue('2')
    expect(times()).toEqual(['≈ 20:15', '≈ 20:25', '≈ 20:35'])
  })

  it('elegir otra cuadra a mano apaga «Cerca mío»', async () => {
    vi.mocked(currentPosition).mockResolvedValue({
      coords: { lat: -34.911, lng: route()[0]!.lng },
      approximate: false,
    })
    renderApp('/llamadas/cuadra')
    await userEvent.click(await screen.findByRole('button', { name: 'Cerca mío' }))
    await screen.findByText(/Es la cuadra más cercana/)

    await userEvent.selectOptions(select(), '3')
    expect(nearChip()).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText(/Es la cuadra más cercana/)).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('de Aquiles Lanza a Ejido')
  })

  it('si se niega la ubicación lo dice, y la lista de cuadras sigue andando', async () => {
    vi.mocked(currentPosition).mockRejectedValue(new LocationError('denied'))
    renderApp('/llamadas/cuadra')
    await userEvent.click(await screen.findByRole('button', { name: 'Cerca mío' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/No tenemos permiso/)
    expect(nearChip()).toHaveAttribute('aria-pressed', 'false')

    await userEvent.selectOptions(select(), '1')
    expect(times()).toHaveLength(3)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('sin orden publicado dice igual cuándo llega el desfile a esa cuadra', async () => {
    vi.mocked(fetchParadeOrder).mockResolvedValue([])
    renderApp('/llamadas/cuadra?cuadra=3')
    expect(
      await screen.findByText('El orden de desfile todavía no se publicó.'),
    ).toBeInTheDocument()
    expect(screen.getByText(/La primera comparsa pasaría por acá/)).toBeInTheDocument()
    expect(document.querySelector('main time')?.textContent).toBe('≈ 20:25')
  })

  it('avisa que el recorrido es estimado mientras no sea el oficial', async () => {
    renderApp('/llamadas/cuadra')
    expect(await screen.findByText(/todavía no es oficial/)).toBeInTheDocument()

    cleanup()
    vi.mocked(fetchParadeEvents).mockResolvedValue(
      nights().map((night) => ({ ...night, recorrido_estado: 'confirmado' as const })),
    )
    renderApp('/llamadas/cuadra')
    await screen.findByRole('combobox', { name: 'Cuadra' })
    expect(screen.queryByText(/todavía no es oficial/)).not.toBeInTheDocument()
  })

  it('sin recorrido cargado lo dice', async () => {
    vi.mocked(fetchParadeRoute).mockResolvedValue([])
    renderApp('/llamadas/cuadra')
    expect(
      await screen.findByText('Todavía no está cargado el recorrido del desfile.'),
    ).toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/llamadas/cuadra?cuadra=3')
    expect(await screen.findByRole('heading', { level: 3 })).toHaveTextContent(
      'Isla de Flores, from Aquiles Lanza to Ejido',
    )
    expect(screen.getByRole('combobox', { name: 'Block' })).toBeInTheDocument()
    expect(screen.getByText('Times are for the middle of the block.')).toBeInTheDocument()
    const region = screen.getByRole('region', { name: 'When it passes your block' })
    expect(within(region).getAllByRole('listitem')[0]!.querySelector('time')?.textContent).toBe(
      '≈ 8:25 PM',
    )
  })
})
