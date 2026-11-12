import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { fetchGroups, fetchStages, type Group, type StageEntry } from '../../lib/api'
import { renderApp } from '../../test-utils'

vi.mock('../../lib/api')

const GROUPS: Group[] = [
  {
    id: 1,
    slug: 'agarrate-catalina',
    nombre: 'Agarrate Catalina',
    categoria: 'murga',
    barrio: 'Malvín Norte',
    foto_url: null,
    claves: ['agarrate catalina', 'la catalina'],
    temporadas: [],
  },
  {
    id: 2,
    slug: 'c-1080',
    nombre: 'C 1080',
    categoria: 'comparsa',
    barrio: 'Barrio Sur',
    foto_url: null,
    claves: ['c 1080', 'cuareim 1080'],
    temporadas: [],
  },
]

const STAGES: StageEntry[] = [
  {
    id: 1,
    slug: 'teatro-de-verano',
    nombre: 'Teatro de Verano',
    tipo: 'teatro_verano',
    barrio: 'Parque Rodó',
    claves: ['teatro de verano', 'ramon collazo'],
  },
  {
    id: 2,
    slug: 'club-malvin',
    nombre: 'Club Malvín',
    tipo: 'privado',
    barrio: 'Malvín',
    claves: ['club malvin'],
  },
]

const resultLinks = () =>
  within(screen.getByRole('main'))
    .getAllByRole('link')
    .map((link) => link.textContent)

describe('Buscar', () => {
  beforeEach(async () => {
    vi.mocked(fetchGroups).mockResolvedValue(GROUPS)
    vi.mocked(fetchStages).mockResolvedValue(STAGES)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('se abre desde el buscador de Hoy', async () => {
    const { router } = renderApp('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Buscar conjunto o escenario' }))
    expect(router.state.location.pathname).toBe('/buscar')
    expect(
      await screen.findByRole('searchbox', { name: 'Buscar conjunto o escenario' }),
    ).toHaveFocus()
    expect(screen.getByRole('heading', { level: 1, name: 'Buscar' })).toBeInTheDocument()
  })

  it('sin texto invita a escribir y no lista nada', async () => {
    renderApp('/buscar')
    expect(await screen.findByText('¿Qué estás buscando?')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryAllByRole('link')).toHaveLength(0)
  })

  it('encuentra conjuntos y escenarios por nombre, y lo escrito queda en la dirección', async () => {
    const { router } = renderApp('/buscar')
    await userEvent.type(await screen.findByRole('searchbox'), 'malv')
    expect(await screen.findByRole('heading', { name: 'Escenarios' })).toBeInTheDocument()
    expect(resultLinks()).toEqual(['Club Malvín'])
    expect(screen.queryByRole('heading', { name: 'Conjuntos' })).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?q=malv')
    expect(screen.getByRole('link', { name: 'Club Malvín' })).toHaveAttribute(
      'href',
      '/escenarios/club-malvin',
    )
  })

  it('encuentra por alias, sin tildes ni mayúsculas', async () => {
    renderApp('/buscar?q=CUAREIM')
    expect(await screen.findByRole('link', { name: 'C 1080' })).toHaveAttribute(
      'href',
      '/conjuntos/c-1080',
    )
    expect(screen.getByText('Comparsa')).toBeInTheDocument()
    cleanup()
    renderApp('/buscar?q=Ramón Collazo')
    expect(await screen.findByRole('link', { name: 'Teatro de Verano' })).toBeInTheDocument()
  })

  it('lista conjuntos y escenarios juntos, cada uno en su sección', async () => {
    renderApp('/buscar?q=at')
    expect(await screen.findByRole('heading', { name: 'Conjuntos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Escenarios' })).toBeInTheDocument()
    expect(resultLinks()).toEqual(['Agarrate Catalina', 'Teatro de Verano'])
  })

  it('si no hay nada lo dice, y se puede borrar la búsqueda', async () => {
    renderApp('/buscar?q=zzz')
    expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
    expect(screen.getByText(/«zzz»/)).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: 'Borrar la búsqueda' })[0]!)
    expect(await screen.findByText('¿Qué estás buscando?')).toBeInTheDocument()
    expect(screen.getByRole('searchbox')).toHaveValue('')
  })

  it('si los escenarios no cargan, igual busca conjuntos', async () => {
    vi.mocked(fetchStages).mockRejectedValue(new Error('sin red'))
    renderApp('/buscar?q=catalina')
    expect(await screen.findByRole('link', { name: 'Agarrate Catalina' })).toBeInTheDocument()
  })

  it('si no carga nada, avisa y deja reintentar', async () => {
    vi.mocked(fetchGroups).mockRejectedValue(new Error('sin red'))
    vi.mocked(fetchStages).mockRejectedValue(new Error('sin red'))
    renderApp('/buscar?q=catalina')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar la búsqueda.')
    vi.mocked(fetchGroups).mockResolvedValue(GROUPS)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('link', { name: 'Agarrate Catalina' })).toBeInTheDocument()
  })

  it('en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/buscar?q=verano')
    expect(await screen.findByRole('heading', { name: 'Stages' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search groups or stages' })).toBeInTheDocument()
  })
})
