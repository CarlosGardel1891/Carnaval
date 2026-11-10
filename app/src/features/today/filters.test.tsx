import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import { fetchCurrentSeason, fetchNightActs } from '../../lib/api'
import { nightFixture } from '../../test-fixtures'
import { renderApp } from '../../test-utils'
import { parseFilters, writeFilters } from './useBoardFilters'

vi.mock('../../lib/api')

const groupNames = () =>
  screen.queryAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)

/** Las filas del pizarrón (la barra inferior también tiene una lista). */
const boardRows = () => within(screen.getByRole('main')).getAllByRole('listitem')

const pressed = (name: string) =>
  screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true'

describe('filtros del pizarrón', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-28T19:00:00-03:00'))
    // Como la base: con `onlyFree` sólo vuelven las de escenarios gratuitos.
    vi.mocked(fetchNightActs).mockImplementation(({ onlyFree }) =>
      Promise.resolve(nightFixture().filter((act) => !onlyFree || act.gratis === true)),
    )
    vi.mocked(fetchCurrentSeason).mockResolvedValue(null)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('«Gratis» lo filtra la base y queda en la URL', async () => {
    const { router } = renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    expect(pressed('Gratis')).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Gratis' }))
    await waitFor(() => expect(groupNames()).toEqual(['Escenario Prado', 'Escenario Móvil']))
    expect(fetchNightActs).toHaveBeenLastCalledWith(expect.objectContaining({ onlyFree: true }))
    expect(router.state.location.search).toBe('?gratis=1')
    expect(pressed('Gratis')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Gratis' }))
    await waitFor(() => expect(groupNames()).toHaveLength(4))
    expect(router.state.location.search).toBe('')
  })

  it('abrir con ?gratis=1 ya pide sólo lo gratuito', async () => {
    renderApp('/?gratis=1')
    await screen.findByRole('region', { name: 'Escenario Prado' })
    expect(fetchNightActs).toHaveBeenCalledTimes(1)
    expect(fetchNightActs).toHaveBeenCalledWith(expect.objectContaining({ onlyFree: true }))
    expect(pressed('Gratis')).toBe(true)
  })

  it('ofrece sólo las categorías que hay esa noche', async () => {
    renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    const chips = within(screen.getByRole('group', { name: 'Filtros' }))
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(chips).toEqual(['Cerca mío', 'Gratis', 'Murga', 'Parodistas', 'Comparsa'])
  })

  it('la categoría se filtra en la app, sin volver a la base', async () => {
    const { router } = renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })

    await userEvent.click(screen.getByRole('button', { name: 'Comparsa' }))
    expect(groupNames()).toEqual(['Escenario Prado', 'Tablado Centro'])
    expect(screen.getByText('C 1080')).toBeInTheDocument()
    expect(screen.getByText('Valores de Ansina')).toBeInTheDocument()
    expect(screen.queryByText('Agarrate Catalina')).not.toBeInTheDocument()
    expect(router.state.location.search).toBe('?cat=comparsa')

    await userEvent.click(screen.getByRole('button', { name: 'Parodistas' }))
    expect(screen.getByText('Zíngaros')).toBeInTheDocument()
    expect(new URLSearchParams(router.state.location.search).get('cat')).toBe('parodistas,comparsa')
    expect(fetchNightActs).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Comparsa' }))
    await userEvent.click(screen.getByRole('button', { name: 'Parodistas' }))
    expect(groupNames()).toHaveLength(4)
    expect(router.state.location.search).toBe('')
  })

  it('«Por hora» muestra una sola lista ordenada, con el escenario en cada fila', async () => {
    const { router } = renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })

    await userEvent.click(screen.getByRole('button', { name: 'Por hora' }))
    expect(router.state.location.search).toBe('?vista=hora')
    expect(groupNames()).toEqual([])
    const rows = boardRows()
    expect(rows.map((row) => row.querySelector('time')?.textContent)).toEqual([
      '20:30',
      '20:30',
      '21:00',
      '21:30',
      '21:30',
      '22:15',
      '22:30',
      '23:45',
      '00:40',
    ])
    expect(
      within(rows[0] as HTMLElement).getByRole('link', { name: 'Tablado Centro' }),
    ).toHaveAttribute('href', '/escenarios/ficticio-centro')
    // La suspendida sigue estando, rotulada.
    expect(within(rows[4] as HTMLElement).getByText('Suspendida')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Por escenario' }))
    expect(router.state.location.search).toBe('')
    expect(groupNames()).toHaveLength(4)
  })

  it('los filtros se combinan y se leen de la URL al abrir', async () => {
    renderApp('/?gratis=1&cat=comparsa&vista=hora')
    expect(await screen.findByText('C 1080')).toBeInTheDocument()
    expect(boardRows()).toHaveLength(1)
    expect(pressed('Gratis')).toBe(true)
    expect(pressed('Comparsa')).toBe(true)
    expect(pressed('Por hora')).toBe(true)
  })

  it('si los filtros no dejan nada, lo dice y ofrece quitarlos', async () => {
    const { router } = renderApp('/?noche=2027-01-28&cat=humoristas&vista=hora')
    expect(await screen.findByText('No hay actuaciones con estos filtros.')).toBeInTheDocument()
    // La categoría elegida sigue a mano para sacarla, aunque esa noche no haya.
    expect(pressed('Humoristas')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(boardRows()).toHaveLength(9)
    // Quedan la noche y la vista; los filtros no.
    expect(router.state.location.search).toBe('?noche=2027-01-28&vista=hora')
  })

  it('con «Gratis» y nada gratuito también ofrece quitar los filtros', async () => {
    vi.mocked(fetchNightActs).mockImplementation(({ onlyFree }) =>
      Promise.resolve(onlyFree ? [] : nightFixture()),
    )
    renderApp('/?gratis=1')
    expect(await screen.findByText('No hay actuaciones con estos filtros.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(await screen.findByRole('region', { name: 'Tablado Centro' })).toBeInTheDocument()
  })
})

describe('filtros en la URL', () => {
  it('ignora lo que no entiende', () => {
    const filters = parseFilters(new URLSearchParams('gratis=si&cat=murga,inventada&vista=x'))
    expect(filters).toEqual({
      nearby: false,
      onlyFree: false,
      categories: ['murga'],
      view: 'stage',
    })
  })

  it('escribe sólo lo que no es el valor por defecto y respeta lo demás', () => {
    const params = writeFilters(new URLSearchParams('noche=2027-01-28&gratis=1'), {
      nearby: true,
      onlyFree: false,
      categories: ['murga', 'comparsa'],
      view: 'time',
    })
    expect(params.get('noche')).toBe('2027-01-28')
    expect(params.has('gratis')).toBe(false)
    expect(params.get('cerca')).toBe('1')
    expect(params.get('cat')).toBe('murga,comparsa')
    expect(params.get('vista')).toBe('hora')
  })
})
