import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import type { StageRow } from '../../lib/api'
import { renderAdmin } from '../../test-utils'
import { geocode } from '../map/geocode'

vi.mock('../../lib/api')

// MapLibre necesita WebGL, que jsdom no tiene: el mapa se reemplaza por un botón que hace lo
// mismo que un toque en un punto.
vi.mock('../map/LocationMap', () => ({
  default: ({ onChange }: { onChange: (value: { lat: number; lng: number }) => void }) => (
    <button type="button" onClick={() => onChange({ lat: -34.90591234, lng: -56.18521234 })}>
      tocar el mapa
    </button>
  ),
}))

const stage = (over: Partial<StageRow> & Pick<StageRow, 'id' | 'nombre'>): StageRow => ({
  slug: `escenario-${over.id}`,
  alias: [],
  tipo: 'popular',
  direccion: null,
  barrio: null,
  precio_texto: null,
  gratis: null,
  activo: true,
  itinerante: false,
  fuente_url: [],
  lat: null,
  lng: null,
  ...over,
})

const STAGES: StageRow[] = [
  stage({
    id: 1,
    nombre: 'Julia Arévalo',
    alias: ['JULIA AREVALO'],
    direccion: 'Av. Tal 123',
    barrio: 'Cerro',
  }),
  stage({ id: 2, nombre: 'Velódromo Municipal', lat: -34.8945, lng: -56.1534 }),
  stage({ id: 3, nombre: 'Escenario Móvil IM 1', tipo: 'movil', itinerante: true }),
  stage({ id: 4, nombre: 'Sodre', activo: false }),
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_MAPTILER_KEY', '')
  vi.mocked(api.fetchStages).mockResolvedValue(STAGES)
  vi.mocked(api.saveStage).mockResolvedValue(1)
  vi.mocked(api.fetchLocationProposals).mockResolvedValue([])
  vi.mocked(api.discardLocationProposal).mockResolvedValue()
})

const open = async () => {
  renderAdmin('/escenarios')
  await screen.findByText('4 de 4 escenarios')
  return userEvent.setup()
}

describe('escenarios', () => {
  it('dice cuáles no tienen ubicación y los filtra', async () => {
    const user = await open()
    // Fijo, activo y sin punto: sólo Julia Arévalo. El móvil y el inactivo no cuentan.
    await user.click(screen.getByLabelText('Sólo los que no tienen ubicación (1)'))
    expect(await screen.findByText('1 de 4 escenarios')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Julia Arévalo/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Velódromo/ })).not.toBeInTheDocument()
  })

  it('busca por nombre y por alias, sin tildes', async () => {
    const user = await open()
    await user.type(screen.getByLabelText('Buscar un escenario'), 'arevalo')
    expect(await screen.findByText('1 de 4 escenarios')).toBeInTheDocument()
  })

  it('carga la ubicación tocando el mapa y la guarda con el escenario', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Julia Arévalo/ }))
    expect(screen.getByText('Sin ubicación.')).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: 'tocar el mapa' }))
    expect(screen.getByText('Punto elegido: -34.905912, -56.185212')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.saveStage).toHaveBeenCalledTimes(1))
    expect(vi.mocked(api.saveStage).mock.calls[0]).toEqual([
      1,
      {
        slug: 'escenario-1',
        nombre: 'Julia Arévalo',
        alias: ['JULIA AREVALO'],
        tipo: 'popular',
        direccion: 'Av. Tal 123',
        barrio: 'Cerro',
        precio_texto: null,
        gratis: null,
        activo: true,
        itinerante: false,
        fuente_url: [],
        lat: -34.905912,
        lng: -56.185212,
      },
    ])
    expect(await screen.findByText('Escenario guardado.')).toBeInTheDocument()
  })

  it('se puede quitar una ubicación cargada', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Velódromo Municipal/ }))
    expect(screen.getByText('Punto elegido: -34.8945, -56.1534')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Quitar la ubicación' }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.saveStage).toHaveBeenCalled())
    expect(vi.mocked(api.saveStage).mock.calls[0]![1]).toMatchObject({ lat: null, lng: null })
  })

  describe('con una ubicación propuesta (decisión 87)', () => {
    const PROPOSAL = {
      escenario_id: 1,
      lat: -34.851634,
      lng: -56.290163,
      consulta: 'Av. Tal 123, Montevideo, Uruguay',
      resultado: 'Avenida Tal, Cerro, Montevideo, Uruguay',
      fuente: 'openstreetmap',
    }

    beforeEach(() => {
      vi.mocked(api.fetchLocationProposals).mockResolvedValue([PROPOSAL])
    })

    it('avisa cuántas hay y marca el escenario en la lista', async () => {
      await open()
      expect(await screen.findByText('1 tiene una propuesta para confirmar.')).toBeVisible()
      expect(
        within(screen.getByRole('button', { name: /Julia Arévalo/ })).getByText('con propuesta'),
      ).toBeVisible()
    })

    it('muestra qué se buscó y qué se encontró, y no guarda nada sola', async () => {
      const user = await open()
      await user.click(screen.getByRole('button', { name: /Julia Arévalo/ }))
      expect(await screen.findByText('Se buscó: Av. Tal 123, Montevideo, Uruguay')).toBeVisible()
      expect(
        screen.getByText('OpenStreetMap encontró: Avenida Tal, Cerro, Montevideo, Uruguay'),
      ).toBeVisible()
      expect(api.saveStage).not.toHaveBeenCalled()
    })

    it('la propuesta pasa a ser la ubicación recién al guardar el escenario', async () => {
      const user = await open()
      await user.click(screen.getByRole('button', { name: /Julia Arévalo/ }))
      await user.click(await screen.findByRole('button', { name: 'Ver la propuesta en el mapa' }))
      expect(api.saveStage).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: 'Guardar' }))

      await waitFor(() =>
        expect(api.saveStage).toHaveBeenCalledWith(
          1,
          expect.objectContaining({ lat: -34.851634, lng: -56.290163 }),
        ),
      )
    })

    it('se puede descartar sin tocar el escenario', async () => {
      const user = await open()
      await user.click(screen.getByRole('button', { name: /Julia Arévalo/ }))
      await user.click(await screen.findByRole('button', { name: 'Descartar la propuesta' }))

      await waitFor(() => expect(api.discardLocationProposal).toHaveBeenCalledWith(1))
      expect(await screen.findByText('Propuesta descartada.')).toBeVisible()
      expect(api.saveStage).not.toHaveBeenCalled()
    })

    it('un escenario que ya tiene ubicación no muestra propuesta', async () => {
      vi.mocked(api.fetchLocationProposals).mockResolvedValue([{ ...PROPOSAL, escenario_id: 2 }])
      const user = await open()
      await user.click(screen.getByRole('button', { name: /Velódromo Municipal/ }))
      expect(screen.queryByText('1 tiene una propuesta para confirmar.')).not.toBeInTheDocument()
      expect(screen.queryByText('con propuesta')).not.toBeInTheDocument()
    })
  })

  it('un itinerante no tiene ubicación propia', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Escenario Móvil IM 1/ }))
    expect(screen.getByText(/no tiene un lugar fijo/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'tocar el mapa' })).not.toBeInTheDocument()
  })

  it('crea un escenario nuevo con su slug y sus alias', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Nuevo' }))
    const form = screen.getByRole('heading', { name: 'Escenario nuevo' }).closest('form')!
    await user.type(within(form).getByLabelText('Nombre'), 'Tablado del Parque Batlle')
    await user.type(within(form).getByLabelText(/^Alias/), 'PARQUE BATLLE\nTABLADO BATLLE')
    await user.selectOptions(within(form).getByLabelText('Es gratis'), 'Sí')
    await user.click(within(form).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(api.saveStage).toHaveBeenCalled())
    expect(vi.mocked(api.saveStage).mock.calls[0]).toEqual([
      null,
      expect.objectContaining({
        slug: 'tablado-del-parque-batlle',
        nombre: 'Tablado del Parque Batlle',
        alias: ['PARQUE BATLLE', 'TABLADO BATLLE'],
        tipo: null,
        gratis: true,
        itinerante: false,
        lat: null,
        lng: null,
      }),
    ])
  })

  it('si la base lo rechaza (por ejemplo, un alias repetido), muestra el motivo', async () => {
    vi.mocked(api.saveStage).mockRejectedValue(
      new Error('El nombre o alias «velodromo» ya es del escenario «Velódromo Municipal».'),
    )
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Julia Arévalo/ }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'ya es del escenario «Velódromo Municipal»',
    )
  })

  it('sin key de MapTiler avisa que no hay buscador', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Julia Arévalo/ }))
    expect(screen.getByText(/Falta la key de MapTiler/)).toBeInTheDocument()
  })

  it('con key, busca la dirección y propone puntos para elegir', async () => {
    vi.stubEnv('VITE_MAPTILER_KEY', 'clave-de-prueba')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          features: [{ place_name: 'Avenida Tal 123, Montevideo', center: [-56.2001, -34.8802] }],
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Julia Arévalo/ }))

    // El buscador arranca con la dirección del escenario.
    expect(screen.getByLabelText('Buscar una dirección')).toHaveValue('Av. Tal 123, Cerro')
    await user.click(screen.getByRole('button', { name: 'Buscar' }))
    await user.click(await screen.findByRole('button', { name: 'Avenida Tal 123, Montevideo' }))
    expect(screen.getByText('Punto elegido: -34.8802, -56.2001')).toBeInTheDocument()

    const url = new URL(String(fetchMock.mock.calls[0]![0]))
    expect(url.pathname).toBe('/geocoding/Av.%20Tal%20123%2C%20Cerro.json')
    expect(url.searchParams.get('country')).toBe('uy')
    vi.unstubAllGlobals()
  })
})

describe('geocode', () => {
  it('sin texto no pide nada', async () => {
    const fetcher = vi.fn()
    expect(await geocode('  ', 'k', fetcher)).toEqual([])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('si el servicio falla, tira un error', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('no', { status: 403 }))
    await expect(geocode('18 de Julio 1000', 'k', fetcher)).rejects.toThrow('403')
  })
})
