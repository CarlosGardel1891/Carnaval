import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchCurrentSeason,
  fetchLocatedStages,
  fetchNightActs,
  fetchStage,
  type LocatedStage,
} from '../../lib/api'
import { currentPosition, hasLocationPermission } from '../../lib/geo'
import { nightFixture } from '../../test-fixtures'
import { renderApp } from '../../test-utils'
import type { MapMarker } from './markers'

vi.mock('../../lib/api')
vi.mock('../../lib/geo', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/geo')>()),
  currentPosition: vi.fn(),
  hasLocationPermission: vi.fn(),
}))
// MapLibre necesita WebGL: en los tests, el mapa es una lista de botones.
vi.mock('./MontevideoMap', () => ({
  MontevideoMap: ({
    markers,
    labelOf,
    onOpen,
    user,
  }: {
    markers: MapMarker[]
    labelOf: (marker: MapMarker) => string
    onOpen: (marker: MapMarker) => void
    user: { lat: number; lng: number } | null
  }) => (
    <div data-testid="mapa">
      {markers.map((marker) => (
        <button key={marker.key} type="button" onClick={() => onOpen(marker)}>
          {labelOf(marker)}
        </button>
      ))}
      {user && <span>{`usuario ${user.lat},${user.lng}`}</span>}
    </div>
  ),
}))

const base = { barrio: null, precio_texto: null, itinerante: false, distancia_m: 0 }

/** Lo que devuelve `escenarios_cercanos`: una fila por escenario con ubicación. */
const STAGES: LocatedStage[] = [
  {
    ...base,
    escenario_id: 1,
    slug: 'ficticio-centro',
    nombre: 'Tablado Centro',
    tipo: 'privado',
    direccion: 'Av. 18 de Julio 1234',
    gratis: false,
    lat: -34.9058,
    lng: -56.1913,
  },
  {
    ...base,
    escenario_id: 2,
    slug: 'ficticio-prado',
    nombre: 'Escenario Prado',
    tipo: 'popular',
    direccion: 'Av. Agraciada 3000',
    gratis: true,
    lat: -34.86,
    lng: -56.2,
  },
  {
    ...base,
    escenario_id: 3,
    slug: 'ficticio-movil',
    nombre: 'Escenario Móvil',
    tipo: 'movil',
    direccion: null,
    gratis: true,
    itinerante: true,
    lat: -34.89,
    lng: -56.17,
  },
]

const markerNames = () =>
  within(screen.getByTestId('mapa'))
    .queryAllByRole('button')
    .map((button) => button.textContent)

describe('mapa', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-28T19:00:00-03:00'))
    vi.mocked(fetchNightActs).mockResolvedValue(nightFixture())
    vi.mocked(fetchLocatedStages).mockResolvedValue(STAGES)
    vi.mocked(fetchCurrentSeason).mockResolvedValue(null)
    vi.mocked(fetchStage).mockResolvedValue(null)
    vi.mocked(hasLocationPermission).mockResolvedValue(false)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('muestra los escenarios fijos y al móvil en sus paradas de la noche', async () => {
    renderApp('/mapa')
    expect(await screen.findByRole('button', { name: /Tablado Centro/ })).toBeInTheDocument()
    expect(markerNames()).toEqual([
      'Tablado Centro · Tablado privado · Av. 18 de Julio 1234',
      'Escenario Prado · Escenario popular · Av. Agraciada 3000',
      'Escenario Móvil · Escenario móvil · 21:00 · Esquina ficticia 1',
      'Escenario Móvil · Escenario móvil · 22:15 · Esquina ficticia 2',
    ])
    expect(fetchLocatedStages).toHaveBeenCalledWith('2027-01-28')
    expect(fetchNightActs).toHaveBeenCalledWith(
      expect.objectContaining({ noche: '2027-01-28', origin: null }),
    )
  })

  it('las referencias nombran sólo los tipos que están en el mapa', async () => {
    renderApp('/mapa')
    const legend = await screen.findByRole('list', { name: 'Referencias' })
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Tablado privado', 'Escenario popular', 'Escenario móvil'])
  })

  it('avisa cuántos escenarios de la noche no tienen ubicación', async () => {
    renderApp('/mapa')
    expect(
      await screen.findByText(
        '1 escenario de esta noche no está en el mapa: todavía no tiene ubicación cargada.',
      ),
    ).toBeInTheDocument()
  })

  it('tocar un marcador lleva a la ficha del escenario', async () => {
    const { router } = renderApp('/mapa')
    await userEvent.click(await screen.findByRole('button', { name: /22:15/ }))
    expect(router.state.location.pathname).toBe('/escenarios/ficticio-movil')
  })

  it('con otra noche en la URL, consulta esa noche y la ficha abre en ella', async () => {
    const { router } = renderApp('/mapa?noche=2027-02-05')
    await userEvent.click(await screen.findByRole('button', { name: /Tablado Centro/ }))
    expect(fetchLocatedStages).toHaveBeenCalledWith('2027-02-05')
    expect(router.state.location.pathname).toBe('/escenarios/ficticio-centro')
    expect(router.state.location.search).toBe('?noche=2027-02-05')
  })

  it('sin permiso de ubicación no lo pide ni muestra al usuario', async () => {
    renderApp('/mapa')
    await screen.findByRole('button', { name: /Tablado Centro/ })
    expect(currentPosition).not.toHaveBeenCalled()
    expect(screen.queryByText(/^usuario/)).not.toBeInTheDocument()
  })

  it('si ya había permiso, muestra la posición del usuario', async () => {
    vi.mocked(hasLocationPermission).mockResolvedValue(true)
    vi.mocked(currentPosition).mockResolvedValue({
      coords: { lat: -34.9, lng: -56.18 },
      approximate: false,
    })
    renderApp('/mapa')
    expect(await screen.findByText('usuario -34.9,-56.18')).toBeInTheDocument()
  })

  it('sin escenarios con ubicación lo dice', async () => {
    vi.mocked(fetchLocatedStages).mockResolvedValue([])
    vi.mocked(fetchNightActs).mockResolvedValue([])
    renderApp('/mapa')
    expect(
      await screen.findByText('Todavía no hay escenarios con ubicación cargada.'),
    ).toBeInTheDocument()
    expect(markerNames()).toEqual([])
  })

  it('si falla la consulta, avisa y deja reintentar', async () => {
    vi.mocked(fetchLocatedStages).mockRejectedValueOnce(new Error('sin red'))
    renderApp('/mapa')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar los escenarios.')
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: /Tablado Centro/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('si falla la actualización, sigue mostrando lo anterior y lo avisa', async () => {
    const { queryClient } = renderApp('/mapa')
    await screen.findByRole('button', { name: /Tablado Centro/ })
    vi.mocked(fetchNightActs).mockRejectedValue(new Error('sin red'))
    await queryClient.refetchQueries({ queryKey: ['actuaciones'] })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo actualizar: estás viendo lo último que cargó.',
    )
    expect(screen.getByRole('button', { name: /Tablado Centro/ })).toBeInTheDocument()
  })

  it('en inglés, los marcadores y los avisos están en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/mapa')
    expect(
      await screen.findByText(
        "1 of tonight's stages is not on the map: it has no location on file yet.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Legend' })).toBeInTheDocument()
  })
})
