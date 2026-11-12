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
  type Stage,
} from '../../lib/api'
import { nightFixture } from '../../test-fixtures'
import { renderApp } from '../../test-utils'

vi.mock('../../lib/api')
vi.mock('../map/MontevideoMap', () => ({ MontevideoMap: () => null }))

const STAGES: Record<string, Stage> = {
  'ficticio-prado': {
    id: 2,
    slug: 'ficticio-prado',
    nombre: 'Escenario Prado',
    tipo: 'popular',
    barrio: 'Prado',
    direccion: 'Av. Agraciada 3000',
    gratis: true,
    precio_texto: null,
    itinerante: false,
  },
  'ficticio-movil': {
    id: 3,
    slug: 'ficticio-movil',
    nombre: 'Escenario Móvil',
    tipo: 'movil',
    barrio: null,
    direccion: null,
    gratis: true,
    precio_texto: null,
    itinerante: true,
  },
  'ficticio-union': {
    id: 4,
    slug: 'ficticio-union',
    nombre: 'Club Unión',
    tipo: 'popular',
    barrio: 'Unión',
    direccion: null,
    gratis: false,
    precio_texto: '$ 150',
    itinerante: false,
  },
  // Un escenario real, con lo poco que hoy tiene cargado y sin actuaciones esa noche.
  'teatro-de-verano': {
    id: 5,
    slug: 'teatro-de-verano',
    nombre: 'Teatro de Verano Ramón Collazo',
    tipo: 'teatro_verano',
    barrio: 'Parque Rodó',
    direccion: 'Rambla Wilson s/n',
    gratis: null,
    precio_texto: null,
    itinerante: false,
  },
}

const PRADO_LOCATED: LocatedStage = {
  escenario_id: 2,
  slug: 'ficticio-prado',
  nombre: 'Escenario Prado',
  tipo: 'popular',
  barrio: 'Prado',
  direccion: 'Av. Agraciada 3000',
  gratis: true,
  precio_texto: null,
  itinerante: false,
  lat: -34.86,
  lng: -56.2,
  distancia_m: 5000,
}

const main = () => within(screen.getByRole('main'))
const rows = () =>
  main()
    .getAllByRole('listitem')
    .map((row) => row.textContent)
const directions = () =>
  main()
    .queryAllByRole('link', { name: 'Cómo llegar' })
    .map((link) => link.getAttribute('href'))

describe('ficha de escenario', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-28T19:00:00-03:00'))
    vi.mocked(fetchStage).mockImplementation((slug) => Promise.resolve(STAGES[slug] ?? null))
    vi.mocked(fetchNightActs).mockResolvedValue(nightFixture())
    vi.mocked(fetchLocatedStages).mockResolvedValue([PRADO_LOCATED])
    vi.mocked(fetchCurrentSeason).mockResolvedValue(null)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('muestra tipo, barrio, precio, dirección y la grilla de la noche', async () => {
    renderApp('/escenarios/ficticio-prado')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Escenario Prado' }),
    ).toBeInTheDocument()
    expect(main().getByText('Escenario popular · Prado')).toBeInTheDocument()
    expect(main().getByText('Gratis')).toBeInTheDocument()
    expect(main().getByText('Av. Agraciada 3000')).toBeInTheDocument()
    expect(main().getByRole('heading', { level: 2, name: 'Esta noche' })).toBeInTheDocument()
    // La suspendida sigue en la lista, marcada.
    expect(rows()).toEqual([
      '20:30C 1080Comparsa',
      '21:30La Nueva MilongaMurgaSuspendida',
      '22:30Cayó la CabraMurga',
    ])
    expect(fetchStage).toHaveBeenCalledWith('ficticio-prado')
  })

  it('usa la misma consulta que el pizarrón sin filtros', async () => {
    renderApp('/escenarios/ficticio-prado')
    await screen.findByText('Cayó la Cabra')
    expect(fetchNightActs).toHaveBeenCalledTimes(1)
    expect(fetchNightActs).toHaveBeenCalledWith({
      noche: '2027-01-28',
      onlyFree: false,
      onlyFollowed: false,
    })
  })

  it('con ubicación, enlaza a la app de mapas', async () => {
    renderApp('/escenarios/ficticio-prado')
    await screen.findByText('Cayó la Cabra')
    expect(directions()).toEqual([
      'https://www.google.com/maps/dir/?api=1&destination=-34.86,-56.2',
    ])
  })

  it('sin ubicación cargada lo dice y no enlaza', async () => {
    renderApp('/escenarios/ficticio-union')
    expect(
      await screen.findByText('Todavía no tenemos su ubicación para mostrarte cómo llegar.'),
    ).toBeInTheDocument()
    expect(main().getByText('$ 150')).toBeInTheDocument()
    expect(directions()).toEqual([])
    expect(rows()).toEqual(['21:30ZíngarosParodistas'])
  })

  it('un itinerante muestra cada parada de la noche con su enlace', async () => {
    renderApp('/escenarios/ficticio-movil')
    const stops = within(
      await screen.findByRole('region', { name: 'Dónde está esta noche' }),
    ).getAllByRole('listitem')
    expect(stops.map((stop) => stop.textContent)).toEqual([
      '21:00 · Esquina ficticia 1Cómo llegar',
      '22:15 · Esquina ficticia 2Cómo llegar',
    ])
    expect(directions()).toEqual([
      'https://www.google.com/maps/dir/?api=1&destination=-34.89,-56.17',
      'https://www.google.com/maps/dir/?api=1&destination=-34.89,-56.16',
    ])
    expect(main().getByText('Escenario móvil · Itinerante')).toBeInTheDocument()
    const lineup = within(screen.getByRole('region', { name: 'Esta noche' }))
    expect(lineup.getAllByRole('listitem').map((row) => row.textContent)).toEqual([
      '21:00Los Patos CabrerosMurgaEsquina ficticia 1',
      '22:15Queso MagroMurgaEsquina ficticia 2',
    ])
  })

  it('un escenario sin actuaciones esa noche muestra igual sus datos', async () => {
    renderApp('/escenarios/teatro-de-verano')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Teatro de Verano Ramón Collazo' }),
    ).toBeInTheDocument()
    expect(main().getByText('Teatro de Verano · Parque Rodó')).toBeInTheDocument()
    expect(main().getByText('Rambla Wilson s/n')).toBeInTheDocument()
    expect(
      await screen.findByText('No hay actuaciones cargadas en este escenario para esta noche.'),
    ).toBeInTheDocument()
    // Sin precio cargado no se inventa uno.
    expect(main().queryByText('Gratis')).not.toBeInTheDocument()
    expect(main().queryByText('Con entrada')).not.toBeInTheDocument()
  })

  it('marca «ahora en escena» sólo si la noche es la de hoy', async () => {
    vi.setSystemTime(new Date('2027-01-28T22:35:00-03:00'))
    renderApp('/escenarios/ficticio-prado')
    await screen.findByText('Cayó la Cabra')
    expect(rows()).toContain('22:30Cayó la CabraMurgaAhora en escena')

    cleanup()
    renderApp('/escenarios/ficticio-prado?noche=2027-01-27')
    await screen.findByText('Cayó la Cabra')
    expect(main().queryByText('Ahora en escena')).not.toBeInTheDocument()
    expect(
      main().getByRole('heading', { level: 2, name: 'miércoles, 27 de enero' }),
    ).toBeInTheDocument()
    expect(fetchNightActs).toHaveBeenLastCalledWith(
      expect.objectContaining({ noche: '2027-01-27' }),
    )
  })

  it('si el escenario no existe, lo dice', async () => {
    renderApp('/escenarios/no-existe')
    expect(await screen.findByText('No encontramos ese escenario.')).toBeInTheDocument()
  })

  it('si falla la consulta del escenario, arma la ficha con la grilla de la noche', async () => {
    vi.mocked(fetchStage).mockRejectedValue(new Error('sin red'))
    renderApp('/escenarios/ficticio-prado')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Escenario Prado' }),
    ).toBeInTheDocument()
    expect(main().getByText('Escenario popular · Prado')).toBeInTheDocument()
    expect(rows()).toHaveLength(3)
  })

  it('si falla todo, avisa y deja reintentar', async () => {
    vi.mocked(fetchStage).mockRejectedValueOnce(new Error('sin red'))
    vi.mocked(fetchNightActs).mockResolvedValue([])
    renderApp('/escenarios/ficticio-prado')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No pudimos cargar el escenario.')
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Escenario Prado' }),
    ).toBeInTheDocument()
  })

  it('si falla la actualización de la grilla, sigue mostrando lo anterior y lo avisa', async () => {
    const { queryClient } = renderApp('/escenarios/ficticio-prado')
    await screen.findByText('Cayó la Cabra')
    vi.mocked(fetchNightActs).mockRejectedValue(new Error('sin red'))
    await queryClient.refetchQueries({ queryKey: ['actuaciones'] })
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo actualizar: estás viendo lo último que cargó.',
    )
    expect(rows()).toHaveLength(3)
  })

  it('«Volver» vuelve a donde se estaba; entrando directo, va a Hoy', async () => {
    const { router } = renderApp('/')
    await userEvent.click(await screen.findByRole('link', { name: /Escenario Prado/ }))
    expect(router.state.location.pathname).toBe('/escenarios/ficticio-prado')
    await userEvent.click(await screen.findByRole('button', { name: 'Volver' }))
    expect(router.state.location.pathname).toBe('/')

    cleanup()
    const direct = renderApp('/escenarios/ficticio-prado')
    await userEvent.click(await screen.findByRole('button', { name: 'Volver' }))
    expect(direct.router.state.location.pathname).toBe('/')
  })

  it('en inglés, la ficha está en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/escenarios/ficticio-prado')
    expect(await screen.findByRole('link', { name: 'Get directions' })).toBeInTheDocument()
    expect(main().getByRole('heading', { level: 2, name: 'Tonight' })).toBeInTheDocument()
    expect(main().getByText('Free')).toBeInTheDocument()
  })
})
