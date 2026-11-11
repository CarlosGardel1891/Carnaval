import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchContestFixture,
  fetchCurrentSeason,
  fetchEvent,
  fetchEvents,
  fetchGroup,
  type GroupDetail,
} from '../../lib/api'
import { renderApp } from '../../test-utils'
import { calendarFixture, SEASON } from '../calendar/calendar-fixtures'
import { fixtureRows } from './contest-fixtures'

vi.mock('../../lib/api')

const group = (overrides: Partial<GroupDetail>): GroupDetail => ({
  id: 102,
  slug: 'la-gran-muneca',
  nombre: 'La Gran Muñeca',
  categoria: 'murga',
  barrio: null,
  bio: null,
  instagram: null,
  facebook: null,
  foto_url: null,
  temporadas: [{ temporada_id: 1, en_concurso: true, en_llamadas: false }],
  ...overrides,
})

describe('el Concurso en la ficha de un conjunto y en el calendario', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-26T19:00:00-03:00'))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchEvents).mockResolvedValue(calendarFixture())
    vi.mocked(fetchContestFixture).mockResolvedValue(fixtureRows())
    vi.mocked(fetchGroup).mockResolvedValue(group({}))
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('la ficha muestra las noches del conjunto en el Concurso, con rueda, etapa y hora', async () => {
    renderApp('/conjuntos/la-gran-muneca')
    const section = await screen.findByRole('region', { name: 'En el Concurso' })
    const rows = within(section).getAllByRole('listitem')
    expect(rows.map((row) => row.querySelector('time')?.textContent)).toEqual(['00:15', '20:30'])
    // La de las 00:15 es de la noche del 25, aunque el reloj ya marque el 26.
    expect(within(rows[0]!).getByText('lunes, 25 de enero')).toBeInTheDocument()
    expect(within(rows[0]!).getByText('Primera rueda · etapa 1')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('martes, 26 de enero')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Primera rueda · etapa 2')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('Suspendida')).toBeInTheDocument()
  })

  it('las noches que ya pasaron siguen a la vista, en segundo plano', async () => {
    renderApp('/conjuntos/la-gran-muneca')
    const section = await screen.findByRole('region', { name: 'En el Concurso' })
    const rows = within(section).getAllByRole('listitem')
    expect(rows[0]!.className).toContain('opacity-60')
    expect(rows[1]!.className).not.toContain('opacity-60')
  })

  it('desde la ficha se llega al fixture del Concurso', async () => {
    const { router } = renderApp('/conjuntos/la-gran-muneca')
    await userEvent.click(await screen.findByRole('link', { name: 'Ver el fixture del Concurso' }))
    expect(router.state.location.pathname).toBe('/calendario/concurso')
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Primera rueda' }),
    ).toBeInTheDocument()
  })

  it('un conjunto que no está en el fixture no tiene el bloque', async () => {
    vi.mocked(fetchGroup).mockResolvedValue(
      group({ id: 999, slug: 'c-1080', nombre: 'C 1080', categoria: 'comparsa', temporadas: [] }),
    )
    renderApp('/conjuntos/c-1080')
    await screen.findByRole('heading', { level: 1, name: 'C 1080' })
    await screen.findByRole('region', { name: 'Próximas actuaciones' })
    expect(screen.queryByRole('region', { name: 'En el Concurso' })).not.toBeInTheDocument()
  })

  it('si está en el Concurso y el fixture no se publicó, lo dice', async () => {
    vi.mocked(fetchContestFixture).mockResolvedValue([])
    renderApp('/conjuntos/la-gran-muneca')
    const section = await screen.findByRole('region', { name: 'En el Concurso' })
    expect(within(section).getByText(/El fixture todavía no se publicó/)).toBeInTheDocument()
    expect(within(section).queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('sin fixture, un conjunto que no está en el Concurso no dice nada', async () => {
    vi.mocked(fetchContestFixture).mockResolvedValue([])
    vi.mocked(fetchGroup).mockResolvedValue(
      group({ temporadas: [{ temporada_id: 1, en_concurso: null, en_llamadas: false }] }),
    )
    renderApp('/conjuntos/la-gran-muneca')
    await screen.findByRole('region', { name: 'Próximas actuaciones' })
    expect(screen.queryByRole('region', { name: 'En el Concurso' })).not.toBeInTheDocument()
  })

  it('la ficha de un evento del Concurso lleva al fixture; la de otro evento, no', async () => {
    vi.mocked(fetchEvent).mockImplementation((slug) =>
      Promise.resolve(calendarFixture().find((event) => event.slug === slug) ?? null),
    )
    const { router } = renderApp('/calendario/concurso-inicio-2027')
    await userEvent.click(await screen.findByRole('link', { name: 'Ver el fixture del Concurso' }))
    expect(router.state.location.pathname).toBe('/calendario/concurso')

    cleanup()
    renderApp('/calendario/desfile-inaugural-2027')
    await screen.findByRole('heading', { level: 1, name: 'Desfile Inaugural del Carnaval' })
    expect(
      screen.queryByRole('link', { name: 'Ver el fixture del Concurso' }),
    ).not.toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/conjuntos/la-gran-muneca')
    const section = await screen.findByRole('region', { name: 'In the Contest' })
    expect(within(section).getByText('First round · night 1')).toBeInTheDocument()
    expect(within(section).getByText('Monday, January 25')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'See the Contest fixture' })).toBeInTheDocument()
  })
})
