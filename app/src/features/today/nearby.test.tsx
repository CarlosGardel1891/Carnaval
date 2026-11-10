import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { fetchCurrentSeason, fetchNightActs, type Act } from '../../lib/api'
import { currentPosition, hasLocationPermission, LocationError } from '../../lib/geo'
import { nightFixture } from '../../test-fixtures'
import { renderApp } from '../../test-utils'

vi.mock('../../lib/api')
vi.mock('../../lib/geo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/geo')>()),
  currentPosition: vi.fn(),
  hasLocationPermission: vi.fn(),
}))

const HERE = { lat: -34.90581234, lng: -56.19134321 }

/** Metros desde `HERE` a cada actuación con ubicación (el móvil tiene dos paradas). */
const DISTANCES: Record<number, number> = {
  1: 2500,
  8: 2500,
  9: 2500,
  2: 800,
  5: 800,
  7: 800,
  3: 1200,
  6: 300,
}

/** Como la base: con origen, cada actuación con ubicación trae su distancia. */
function nightFrom(origin: unknown): Act[] {
  return nightFixture().map((act) => ({
    ...act,
    distancia_m: origin ? (DISTANCES[act.actuacion_id] ?? null) : null,
  }))
}

const groupNames = () =>
  screen.queryAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

const nearbyChip = () => screen.getByRole('button', { name: 'Cerca mío' })
const isOn = () => nearbyChip().getAttribute('aria-pressed') === 'true'

const HIDDEN = '1 escenario sin ubicación cargada no aparece en «Cerca mío».'

describe('«cerca mío»', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-28T19:00:00-03:00'))
    vi.mocked(fetchNightActs).mockImplementation(({ origin }) => Promise.resolve(nightFrom(origin)))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(null)
    vi.mocked(hasLocationPermission).mockResolvedValue(false)
    vi.mocked(currentPosition).mockResolvedValue(HERE)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('al abrir la app no se pide la ubicación', async () => {
    renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    expect(hasLocationPermission).not.toHaveBeenCalled()
    expect(currentPosition).not.toHaveBeenCalled()
    expect(isOn()).toBe(false)
  })

  it('al activarlo pide la ubicación, ordena por distancia y la muestra', async () => {
    const { router } = renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })

    await userEvent.click(nearbyChip())
    await waitFor(() =>
      expect(groupNames()).toEqual(['Escenario Móvil', 'Escenario Prado', 'Tablado Centro']),
    )
    expect(currentPosition).toHaveBeenCalledTimes(1)
    expect(isOn()).toBe(true)

    // Cada escenario con su distancia; el móvil, la de su parada más cercana…
    const distanceOf = (name: string) =>
      within(screen.getByRole('region', { name })).getByText(/^[\d,]+\s(m|km)$/, {
        selector: 'p.text-accent',
      }).textContent
    expect(distanceOf('Escenario Móvil')).toMatch(/^300\sm$/)
    expect(distanceOf('Escenario Prado')).toMatch(/^800\sm$/)
    expect(distanceOf('Tablado Centro')).toMatch(/^2,5\skm$/)
    // …y además la de cada parada.
    const movil = screen.getByRole('region', { name: 'Escenario Móvil' })
    expect(within(movil).getByText(/Esquina ficticia 1 · 1,2\skm/)).toBeInTheDocument()
    expect(within(movil).getByText(/Esquina ficticia 2 · 300\sm/)).toBeInTheDocument()

    // El escenario sin ubicación cargada queda afuera, y se avisa.
    expect(screen.queryByText('Zíngaros')).not.toBeInTheDocument()
    expect(screen.getByText(HIDDEN)).toBeInTheDocument()

    // A la base va la posición redondeada (~11 m); a la URL, sólo que está prendido.
    expect(fetchNightActs).toHaveBeenLastCalledWith(
      expect.objectContaining({ origin: { lat: -34.9058, lng: -56.1913 } }),
    )
    expect(router.state.location.search).toBe('?cerca=1')
  })

  it('al apagarlo vuelve el orden por hora y los escenarios sin ubicación', async () => {
    const { router } = renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    await userEvent.click(nearbyChip())
    await waitFor(() => expect(groupNames()).toHaveLength(3))

    await userEvent.click(nearbyChip())
    await waitFor(() => expect(groupNames()).toHaveLength(4))
    expect(groupNames()[0]).toBe('Escenario Prado')
    expect(screen.queryByText(HIDDEN)).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('')
  })

  it('por hora mantiene el orden por hora y cada fila lleva su distancia', async () => {
    renderApp('/?vista=hora')
    await screen.findByText('Agarrate Catalina')
    await userEvent.click(nearbyChip())

    await waitFor(() => expect(screen.queryByText('Zíngaros')).not.toBeInTheDocument())
    const rows = within(screen.getByRole('main')).getAllByRole('listitem')
    expect(rows.map((row) => row.querySelector('time')?.textContent)).toEqual([
      '20:30',
      '20:30',
      '21:00',
      '21:30',
      '22:15',
      '22:30',
      '23:45',
      '00:40',
    ])
    expect(within(rows[0] as HTMLElement).getByText(/Murga · 2,5\skm/)).toBeInTheDocument()
  })

  it('si niega el permiso, todo sigue andando sin cercanía y se le explica', async () => {
    vi.mocked(currentPosition).mockRejectedValue(new LocationError('denied'))
    const { router } = renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })

    await userEvent.click(nearbyChip())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tenemos permiso para usar tu ubicación',
    )
    expect(isOn()).toBe(false)
    expect(groupNames()).toHaveLength(4)
    expect(router.state.location.search).toBe('')
    expect(fetchNightActs).toHaveBeenCalledTimes(1)

    // Los demás filtros siguen andando.
    await userEvent.click(screen.getByRole('button', { name: 'Comparsa' }))
    expect(groupNames()).toEqual(['Escenario Prado', 'Tablado Centro'])
  })

  it('si no se consigue la posición lo dice y deja reintentar', async () => {
    vi.mocked(currentPosition).mockRejectedValueOnce(new LocationError('unavailable'))
    renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })

    await userEvent.click(nearbyChip())
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos obtener tu ubicación')
    expect(isOn()).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(groupNames()).toHaveLength(3))
    expect(isOn()).toBe(true)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('abrir con ?cerca=1 sin permiso lo apaga sin preguntar ni avisar', async () => {
    const { router } = renderApp('/?cerca=1&cat=murga')
    await screen.findByRole('region', { name: 'Tablado Centro' })

    await waitFor(() => expect(router.state.location.search).toBe('?cat=murga'))
    // La URL cambia un instante antes de que se vuelva a dibujar el chip.
    await waitFor(() => expect(isOn()).toBe(false))
    expect(currentPosition).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('abrir con ?cerca=1 y permiso ya dado ordena por distancia sin preguntar', async () => {
    vi.mocked(hasLocationPermission).mockResolvedValue(true)
    const { router } = renderApp('/?cerca=1')

    await waitFor(() =>
      expect(groupNames()).toEqual(['Escenario Móvil', 'Escenario Prado', 'Tablado Centro']),
    )
    expect(isOn()).toBe(true)
    expect(router.state.location.search).toBe('?cerca=1')
  })

  it('si con «cerca mío» no queda nada, lo dice y «Quitar filtros» lo apaga', async () => {
    // Una noche real: ningún escenario tiene ubicación cargada.
    vi.mocked(fetchNightActs).mockResolvedValue(
      nightFixture().map((act) => ({ ...act, lat: null, lng: null })),
    )
    const { router } = renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })

    await userEvent.click(nearbyChip())
    expect(await screen.findByText('No hay actuaciones con estos filtros.')).toBeInTheDocument()
    expect(
      screen.getByText('4 escenarios sin ubicación cargada no aparecen en «Cerca mío».'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    await waitFor(() => expect(groupNames()).toHaveLength(4))
    expect(router.state.location.search).toBe('')
  })
})
