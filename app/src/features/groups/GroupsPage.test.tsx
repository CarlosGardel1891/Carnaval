import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { fetchCurrentSeason, fetchGroups, type Group } from '../../lib/api'
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

const in2027 = (en_concurso: boolean | null, en_llamadas = false) => [
  { temporada_id: 1, en_concurso, en_llamadas },
]

const GROUPS: Group[] = [
  {
    id: 1,
    slug: 'c-1080',
    nombre: 'C 1080',
    categoria: 'comparsa',
    barrio: 'Barrio Sur',
    foto_url: null,
    claves: ['c 1080', 'cuareim 1080'],
    temporadas: in2027(false, true),
  },
  {
    id: 2,
    slug: 'curtidores-de-hongos',
    nombre: 'Curtidores de Hongos',
    categoria: 'murga',
    barrio: null,
    foto_url: null,
    claves: ['curtidores de hongos'],
    temporadas: [],
  },
  {
    id: 3,
    slug: 'dona-bastarda',
    nombre: 'Doña Bastarda',
    categoria: 'murga',
    barrio: null,
    foto_url: null,
    claves: ['dona bastarda'],
    temporadas: in2027(true),
  },
  {
    id: 4,
    slug: 'la-margarita',
    nombre: 'La Margarita',
    categoria: 'murga',
    barrio: null,
    foto_url: null,
    claves: ['la margarita'],
    temporadas: in2027(null),
  },
]

const shownNames = () =>
  within(screen.getByRole('list', { name: 'Conjuntos' }))
    .getAllByRole('link')
    .map((link) => link.textContent)

function rowOf(name: string): HTMLElement {
  const row = screen.getByText(name).closest('li')
  if (!row) throw new Error(`No hay fila para ${name}`)
  return row
}

describe('lista de conjuntos', () => {
  beforeEach(async () => {
    vi.mocked(fetchGroups).mockResolvedValue(GROUPS)
    vi.mocked(fetchCurrentSeason).mockResolvedValue(season)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('lista los conjuntos de la temporada, con sus marcas', async () => {
    renderApp('/conjuntos')
    expect(await screen.findByText('Doña Bastarda')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Conjuntos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Conjuntos' })).toHaveAttribute('aria-current', 'page')

    expect(screen.getByText('3 conjuntos')).toBeInTheDocument()
    expect(screen.queryByText('Curtidores de Hongos')).not.toBeInTheDocument()

    expect(within(rowOf('Doña Bastarda')).getByText('En concurso')).toBeInTheDocument()
    expect(
      within(rowOf('La Margarita')).getByText('Pendiente de la Prueba de Admisión'),
    ).toBeInTheDocument()
    const c1080 = within(rowOf('C 1080'))
    expect(c1080.getByText('En las Llamadas')).toBeInTheDocument()
    expect(c1080.queryByText('En concurso')).not.toBeInTheDocument()
    expect(c1080.getByText('Comparsa')).toBeInTheDocument()
    expect(c1080.getByText('Barrio Sur')).toBeInTheDocument()
    // Sin barrio, la línea no deja un separador colgando.
    expect(within(rowOf('Doña Bastarda')).getByText('Murga')).toBeInTheDocument()
  })

  it('cada fila lleva a la ficha del conjunto', async () => {
    renderApp('/conjuntos')
    await screen.findByText('Doña Bastarda')
    expect(rowOf('Doña Bastarda').querySelector('a')).toHaveAttribute(
      'href',
      '/conjuntos/dona-bastarda',
    )
  })

  it('busca por nombre y alias dentro de todo el catálogo, y lo deja en la URL', async () => {
    const { router } = renderApp('/conjuntos')
    const search = await screen.findByRole('searchbox', { name: 'Buscar un conjunto' })

    await userEvent.type(search, 'cuareim')
    expect(shownNames()).toEqual(['C 1080'])
    expect(router.state.location.search).toBe('?q=cuareim')

    await userEvent.clear(search)
    await userEvent.type(search, 'HONGOS')
    expect(shownNames()).toEqual(['Curtidores de Hongos'])
    expect(screen.getByText('1 conjunto')).toBeInTheDocument()
  })

  it('sin coincidencias lo dice y deja quitar los filtros', async () => {
    renderApp('/conjuntos?q=bastrada')
    expect(
      await screen.findByText('No encontramos conjuntos con esa búsqueda.'),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(shownNames()).toEqual(['C 1080', 'Doña Bastarda', 'La Margarita'])
  })

  it('filtra por categoría', async () => {
    const { router } = renderApp('/conjuntos')
    await screen.findByText('Doña Bastarda')

    await userEvent.click(screen.getByRole('button', { name: 'Comparsa' }))
    expect(shownNames()).toEqual(['C 1080'])
    expect(router.state.location.search).toBe('?cat=comparsa')
    expect(screen.getByRole('button', { name: 'Comparsa' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('si la temporada no carga, lista todo el catálogo sin marcas', async () => {
    vi.mocked(fetchCurrentSeason).mockRejectedValue(new Error('sin red'))
    renderApp('/conjuntos')
    expect(await screen.findByText('Curtidores de Hongos')).toBeInTheDocument()
    expect(screen.getByText('4 conjuntos')).toBeInTheDocument()
    expect(screen.queryByText('En concurso')).not.toBeInTheDocument()
  })

  it('si falla la carga lo avisa y deja reintentar', async () => {
    vi.mocked(fetchGroups).mockRejectedValueOnce(new Error('sin red'))
    renderApp('/conjuntos')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los conjuntos.')

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByText('Doña Bastarda')).toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/conjuntos')
    expect(await screen.findByText('3 groups')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Groups' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search for a group' })).toBeInTheDocument()
    expect(
      within(rowOf('La Margarita')).getByText('Awaiting the Admission Trial'),
    ).toBeInTheDocument()
  })
})
