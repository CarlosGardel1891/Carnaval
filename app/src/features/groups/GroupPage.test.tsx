import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchCurrentSeason,
  fetchGroup,
  fetchGroups,
  fetchNightActs,
  fetchUpcomingActs,
  type GroupDetail,
  type UpcomingAct,
} from '../../lib/api'
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

const FULL: GroupDetail = {
  id: 10,
  slug: 'la-gran-muneca',
  nombre: 'La Gran Muñeca',
  categoria: 'murga',
  barrio: 'La Teja',
  bio: 'Murga fundada en 1921.',
  instagram: 'https://www.instagram.com/murgalgm/',
  facebook: 'https://www.facebook.com/murgala.granmuneca/',
  foto_url: 'https://example.org/lgm.jpg',
  temporadas: [{ temporada_id: 1, en_concurso: true, en_llamadas: false }],
}

/** Como la mayoría del seed: sin barrio, sin redes, sin bio y sin foto. */
const BARE: GroupDetail = {
  id: 11,
  slug: 'la-nueva-milonga',
  nombre: 'La Nueva Milonga',
  categoria: 'murga',
  barrio: null,
  bio: null,
  instagram: null,
  facebook: null,
  foto_url: null,
  temporadas: [],
}

function upcoming(overrides: Partial<UpcomingAct>): UpcomingAct {
  return {
    actuacion_id: 1,
    inicio: '2027-01-28T21:00:00-03:00',
    noche: '2027-01-28',
    estado: 'programada',
    etapa_rueda: null,
    etapa_numero: null,
    escenario_id: 1,
    escenario_slug: 'ficticio-centro',
    escenario_nombre: 'Tablado Centro',
    escenario_tipo: 'privado',
    escenario_barrio: 'Centro',
    direccion: 'Av. 18 de Julio 1234',
    gratis: false,
    precio_texto: '$ 300',
    itinerante: false,
    lat: null,
    lng: null,
    ...overrides,
  }
}

const UPCOMING: UpcomingAct[] = [
  upcoming({ actuacion_id: 1 }),
  // Pasada la medianoche: sigue siendo la noche del 28.
  upcoming({
    actuacion_id: 2,
    inicio: '2027-01-29T00:40:00-03:00',
    escenario_slug: 'ficticio-prado',
    escenario_nombre: 'Escenario Prado',
  }),
  upcoming({
    actuacion_id: 3,
    inicio: '2027-01-30T22:15:00-03:00',
    noche: '2027-01-30',
    estado: 'suspendida',
    escenario_slug: 'ficticio-movil',
    escenario_nombre: 'Escenario Móvil',
    itinerante: true,
    direccion: 'Esquina ficticia 2',
  }),
]

describe('ficha de conjunto', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    // El teléfono en Tokio y son las 19:00 de la noche del 28/01 en Montevideo.
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-28T19:00:00-03:00'))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(season)
    vi.mocked(fetchGroups).mockResolvedValue([])
    vi.mocked(fetchGroup).mockImplementation((slug) =>
      Promise.resolve([FULL, BARE].find((group) => group.slug === slug) ?? null),
    )
    vi.mocked(fetchUpcomingActs).mockResolvedValue(UPCOMING)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('muestra los datos, las redes y las marcas de la temporada', async () => {
    renderApp('/conjuntos/la-gran-muneca')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'La Gran Muñeca' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Murga · La Teja')).toBeInTheDocument()
    expect(screen.getByText('En concurso')).toBeInTheDocument()
    expect(screen.getByText('Murga fundada en 1921.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://www.instagram.com/murgalgm/',
    )
    expect(screen.getByRole('link', { name: 'Facebook' })).toHaveAttribute(
      'href',
      'https://www.facebook.com/murgala.granmuneca/',
    )
    // Dentro de una ficha, la pestaña Conjuntos sigue marcada.
    expect(screen.getByRole('link', { name: 'Conjuntos' })).toHaveAttribute('aria-current', 'page')
  })

  it('lista las próximas actuaciones por noche, con las horas de Montevideo', async () => {
    renderApp('/conjuntos/la-gran-muneca')
    const section = await screen.findByRole('region', { name: 'Próximas actuaciones' })
    await within(section).findByText('Tablado Centro')

    expect(fetchUpcomingActs).toHaveBeenCalledWith(10, '2027-01-28')
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Esta noche', 'sábado, 30 de enero'])
    expect(
      within(section)
        .getAllByRole('listitem')
        .map((row) => row.querySelector('time')?.textContent),
    ).toEqual(['21:00', '00:40', '22:15'])

    expect(within(section).getByRole('link', { name: 'Escenario Prado' })).toHaveAttribute(
      'href',
      '/escenarios/ficticio-prado?noche=2027-01-28',
    )
    const movil = within(section).getByText('Escenario Móvil').closest('li') as HTMLElement
    expect(within(movil).getByText('Suspendida')).toBeInTheDocument()
    expect(within(movil).getByText('Esquina ficticia 2')).toBeInTheDocument()
  })

  it('sin barrio, redes, bio ni actuaciones se ve completa igual', async () => {
    vi.mocked(fetchUpcomingActs).mockResolvedValue([])
    renderApp('/conjuntos/la-nueva-milonga')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'La Nueva Milonga' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Murga')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Redes' })).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText('En concurso')).not.toBeInTheDocument()
    expect(
      await screen.findByText('Todavía no hay actuaciones cargadas para este conjunto.'),
    ).toBeInTheDocument()
  })

  it('no enlaza una red que no sea una dirección web', async () => {
    vi.mocked(fetchGroup).mockResolvedValue({ ...FULL, instagram: 'javascript:alert(1)' })
    renderApp('/conjuntos/la-gran-muneca')
    expect(await screen.findByRole('link', { name: 'Facebook' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Instagram' })).not.toBeInTheDocument()
  })

  it('un conjunto que no existe lo dice, y «Volver» lleva a la lista', async () => {
    const { router } = renderApp('/conjuntos/no-existe')
    expect(await screen.findByText('No encontramos ese conjunto.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    expect(router.state.location.pathname).toBe('/conjuntos')
  })

  it('si falla la carga lo avisa y deja reintentar', async () => {
    vi.mocked(fetchGroup).mockRejectedValueOnce(new Error('sin red'))
    renderApp('/conjuntos/la-gran-muneca')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar el conjunto.')

    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'La Gran Muñeca' }),
    ).toBeInTheDocument()
  })

  it('desde el pizarrón, tocar un conjunto abre su ficha y «Volver» regresa', async () => {
    vi.mocked(fetchNightActs).mockResolvedValue(nightFixture())
    const { router } = renderApp('/')
    const link = await screen.findByRole('link', { name: 'Agarrate Catalina' })
    expect(link).toHaveAttribute('href', '/conjuntos/conjunto-1')

    await userEvent.click(link)
    expect(router.state.location.pathname).toBe('/conjuntos/conjunto-1')
    expect(fetchGroup).toHaveBeenCalledWith('conjunto-1')

    await userEvent.click(await screen.findByRole('button', { name: 'Volver' }))
    expect(router.state.location.pathname).toBe('/')
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/conjuntos/la-gran-muneca')
    const section = await screen.findByRole('region', { name: 'Upcoming shows' })
    await within(section).findByText('Tablado Centro')
    expect(
      within(section)
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(['Tonight', 'Saturday, January 30'])
    expect(within(section).getByText('Cancelled')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Social media' })).toBeInTheDocument()
  })
})
