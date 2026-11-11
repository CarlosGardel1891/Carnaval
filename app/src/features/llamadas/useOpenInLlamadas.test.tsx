import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchCurrentSeason,
  fetchNightActs,
  fetchParadeEvents,
  fetchParadeOrder,
} from '../../lib/api'
import { nightFixture } from '../../test-fixtures'
import { renderApp } from '../../test-utils'
import { nights, order1, SEASON } from './llamadas-fixtures'

vi.mock('../../lib/api')

/** Abre la app en una ruta, a una hora de Montevideo, y espera a que se decida dónde queda. */
async function openAt(path: string, montevideoTime: string) {
  vi.setSystemTime(new Date(`${montevideoTime}:00-03:00`))
  const view = renderApp(path)
  await waitFor(() => expect(fetchCurrentSeason).toHaveBeenCalled())
  await screen.findAllByRole('heading', { level: 1 })
  return view
}

describe('con el modo Llamadas activo la app abre en Llamadas', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    // El teléfono en Tokio: la fecha del sistema no es la de Montevideo.
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchNightActs).mockResolvedValue(nightFixture())
    vi.mocked(fetchParadeEvents).mockResolvedValue(nights())
    vi.mocked(fetchParadeOrder).mockResolvedValue(order1())
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('la primera noche de Llamadas abre en Llamadas', async () => {
    const { router } = await openAt('/', '2027-02-05T19:30')
    await waitFor(() => expect(router.state.location.pathname).toBe('/llamadas'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Llamadas' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Noche 1 · Hoy' })).toBeInTheDocument()
  })

  it('el día del desfile, desde la mañana (el modo va por noche lógica, desde las 06:00)', async () => {
    const { router } = await openAt('/', '2027-02-05T06:00')
    await waitFor(() => expect(router.state.location.pathname).toBe('/llamadas'))
  })

  it('la madrugada después de la última noche sigue en modo Llamadas, hasta las 06:00', async () => {
    // Domingo 7, 02:30 en Montevideo: todavía es la noche del sábado 6.
    const { router } = await openAt('/', '2027-02-07T02:30')
    await waitFor(() => expect(router.state.location.pathname).toBe('/llamadas'))
    expect(await screen.findByRole('link', { name: 'Noche 2 · Hoy' })).toBeInTheDocument()
  })

  it.each([
    ['la víspera', '2027-02-04T23:00'],
    ['la madrugada de la víspera, aunque en Tokio ya sea 5', '2027-02-05T02:00'],
    ['el domingo a las 06:00, cuando termina la última noche', '2027-02-07T06:00'],
    ['cualquier otro día de la temporada', '2027-01-28T21:00'],
  ])('fuera de fecha (%s) abre en Hoy', async (_caso, time) => {
    const { router } = await openAt('/', time)
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('«Hoy» queda a un toque y no rebota', async () => {
    const { router } = await openAt('/', '2027-02-05T21:00')
    await waitFor(() => expect(router.state.location.pathname).toBe('/llamadas'))
    await userEvent.click(screen.getByRole('link', { name: 'Hoy' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    // Y vuelve a Llamadas sólo si se toca la pestaña.
    await userEvent.click(screen.getByRole('link', { name: 'Llamadas' }))
    expect(router.state.location.pathname).toBe('/llamadas')
  })

  it('si se abrió otra pantalla, o una noche en particular, no se toca', async () => {
    const first = await openAt('/conjuntos', '2027-02-05T21:00')
    expect(first.router.state.location.pathname).toBe('/conjuntos')
    cleanup()
    const second = await openAt('/?noche=2027-02-05&mios=1', '2027-02-05T21:00')
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
    expect(second.router.state.location.search).toBe('?noche=2027-02-05&mios=1')
  })

  it('abrir con el reloj simulado en la dirección (?ahora=) también entra a Llamadas', async () => {
    const { router } = await openAt('/?ahora=2027-02-05T21:00', '2027-02-05T21:00')
    await waitFor(() => expect(router.state.location.pathname).toBe('/llamadas'))
  })

  it('una temporada sin fechas de Llamadas nunca activa el modo, haya o no eventos de Llamadas', async () => {
    vi.mocked(fetchCurrentSeason).mockResolvedValue({
      ...SEASON,
      modo_llamadas_desde: null,
      modo_llamadas_hasta: null,
    })
    const { router } = await openAt('/', '2027-02-05T21:00')
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })

  it('si la temporada no carga, abre en Hoy como siempre', async () => {
    vi.mocked(fetchCurrentSeason).mockRejectedValue(new Error('sin red'))
    const { router } = await openAt('/', '2027-02-05T21:00')
    expect(await screen.findByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
  })
})
