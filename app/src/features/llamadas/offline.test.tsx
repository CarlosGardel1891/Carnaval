import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Preferences } from '@capacitor/preferences'
import {
  persistQueryClientRestore,
  persistQueryClientSave,
} from '@tanstack/react-query-persist-client'
import i18n from '../../i18n'
import * as api from '../../lib/api'
import { cachePersistOptions, createAppQueryClient } from '../../lib/queryCache'
import { nightFixture } from '../../test-fixtures'
import { renderApp } from '../../test-utils'
import {
  closures,
  groups,
  NIGHT_1,
  NIGHT_2,
  nights,
  order1,
  order2,
  route,
  SEASON,
} from './llamadas-fixtures'

vi.mock('../../lib/api')
vi.mock('../map/ParadeMap', () => ({
  ParadeMap: ({ corners, closures: cuts }: { corners: unknown[]; closures: unknown[] }) => (
    <div data-testid="mapa">{`${corners.length} esquinas, ${cuts.length} cortes`}</div>
  ),
}))

const DAY = 24 * 60 * 60_000

function appClient() {
  const queryClient = createAppQueryClient()
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  })
  return queryClient
}

/** Con red: todo responde. */
function online() {
  vi.mocked(api.fetchCurrentSeason).mockResolvedValue(SEASON)
  vi.mocked(api.fetchNightActs).mockResolvedValue(nightFixture())
  vi.mocked(api.fetchParadeEvents).mockResolvedValue(nights())
  vi.mocked(api.fetchParadeOrder).mockImplementation((eventId) =>
    Promise.resolve(eventId === NIGHT_1.id ? order1() : order2()),
  )
  vi.mocked(api.fetchParadeRoute).mockResolvedValue(route())
  vi.mocked(api.fetchStreetClosures).mockResolvedValue(closures())
  vi.mocked(api.fetchGroups).mockResolvedValue(groups())
}

/** Sin red: no responde nada de lo que habla con la base. */
function offline() {
  for (const [name, fn] of Object.entries(api)) {
    if (name.startsWith('fetch') && vi.isMockFunction(fn)) {
      fn.mockRejectedValue(new Error('sin red'))
    }
  }
}

/**
 * La app se abre una vez con red, en la pantalla «Hoy» y sin entrar a Llamadas; se guarda la
 * caché en el teléfono, se cierra, y se vuelve a abrir más tarde sin red, con lo restaurado.
 */
async function reopenOffline(openedAt: string, reopenedAt: string) {
  vi.setSystemTime(new Date(openedAt))
  online()
  const first = renderApp('/conjuntos', appClient())
  await waitFor(() => {
    expect(api.fetchStreetClosures).toHaveBeenCalledWith(NIGHT_2.id)
    expect(first.queryClient.isFetching()).toBe(0)
  })
  await persistQueryClientSave({ queryClient: first.queryClient, ...cachePersistOptions(0) })
  cleanup()

  vi.setSystemTime(new Date(reopenedAt))
  offline()
  const queryClient = appClient()
  await persistQueryClientRestore({ queryClient, ...cachePersistOptions(0) })
  return queryClient
}

describe('modo Llamadas con la red cortada', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    await Preferences.clear()
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('en temporada, al abrir la app se baja todo el modo aunque no se entre a la pestaña', async () => {
    vi.setSystemTime(new Date('2027-02-02T18:00:00-03:00'))
    online()
    const { queryClient } = renderApp('/conjuntos', appClient())
    await waitFor(() => expect(api.fetchStreetClosures).toHaveBeenCalledTimes(2))
    for (const night of [NIGHT_1, NIGHT_2]) {
      expect(api.fetchParadeOrder).toHaveBeenCalledWith(night.id)
      expect(api.fetchParadeRoute).toHaveBeenCalledWith(night.id)
      expect(api.fetchStreetClosures).toHaveBeenCalledWith(night.id)
    }
    await waitFor(() =>
      expect(queryClient.getQueryData(['llamadas', 'orden', NIGHT_2.id])).toHaveLength(26),
    )
  })

  it.each([
    ['antes de la temporada', '2027-01-10T18:00:00-03:00'],
    ['pasadas las Llamadas', '2027-02-07T18:00:00-03:00'],
  ])('%s no se baja nada por adelantado', async (_caso, at) => {
    vi.setSystemTime(new Date(at))
    online()
    const { queryClient } = renderApp('/conjuntos', appClient())
    await waitFor(() => expect(api.fetchCurrentSeason).toHaveBeenCalled())
    await waitFor(() => expect(queryClient.isFetching()).toBe(0))
    expect(api.fetchParadeEvents).not.toHaveBeenCalled()
    expect(api.fetchParadeOrder).not.toHaveBeenCalled()
  })

  it('tres días después y sin red, abre en Llamadas con el orden y sus horas, y avisa de cuándo es', async () => {
    const queryClient = await reopenOffline(
      '2027-02-02T18:00:00-03:00',
      '2027-02-05T20:30:00-03:00',
    )
    const { router } = renderApp('/', queryClient)

    await waitFor(() => expect(router.state.location.pathname).toBe('/llamadas'))
    const list = await screen.findByRole('region', { name: 'Orden de desfile' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('C 1080')
    expect(rows.map((row) => row.querySelector('time')?.textContent)).toEqual([
      '≈ 20:00',
      '≈ 20:10',
      '≈ 20:20',
    ])
    // Lo que se ve es de hace tres días, y se dice.
    expect(await screen.findByText(/Actualizado hace 3 días/)).toBeInTheDocument()
    expect(screen.queryByText(/No pudimos cargar/)).not.toBeInTheDocument()
  })

  it('sin red, la otra noche también está, con la última saliendo pasada la medianoche', async () => {
    const queryClient = await reopenOffline(
      '2027-02-04T18:00:00-03:00',
      '2027-02-05T20:30:00-03:00',
    )
    renderApp('/llamadas', queryClient)
    await userEvent.click(await screen.findByRole('link', { name: 'Noche 2' }))
    const list = await screen.findByRole('region', { name: 'Orden de desfile' })
    const rows = within(list).getAllByRole('listitem')
    expect(rows).toHaveLength(26)
    expect(rows[25]!.querySelector('time')).toHaveTextContent('≈ 00:10')
  })

  it('sin red, «por cuadra» da la hora de paso por la cuadra elegida', async () => {
    const queryClient = await reopenOffline(
      '2027-02-04T18:00:00-03:00',
      '2027-02-05T20:30:00-03:00',
    )
    renderApp('/llamadas/cuadra', queryClient)
    const select = await screen.findByRole('combobox', { name: 'Cuadra' })
    await userEvent.selectOptions(select, within(select).getAllByRole('option').at(-1)!)
    const list = await screen.findByRole('region', { name: 'A qué hora pasa por tu cuadra' })
    const times = within(list)
      .getAllByRole('listitem')
      .map((row) => row.querySelector('time')?.textContent)
    expect(times).toHaveLength(3)
    // La mitad de la última cuadra está a 375 m de la salida: 25 minutos de marcha.
    expect(times[0]).toBe('≈ 20:25')
  })

  it('sin red, el recorrido y los cortes están, en el mapa y en la lista', async () => {
    const queryClient = await reopenOffline(
      '2027-02-04T18:00:00-03:00',
      '2027-02-05T20:30:00-03:00',
    )
    renderApp('/llamadas/recorrido', queryClient)
    expect(await screen.findByTestId('mapa')).toHaveTextContent(
      `${route().length} esquinas, ${closures().length} cortes`,
    )
    expect(screen.getAllByText(/Zelmar Michelini/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/No pudimos cargar/)).not.toBeInTheDocument()
  })

  it('sin red, el glosario está entero: va dentro de la app', async () => {
    const queryClient = await reopenOffline(
      '2027-02-04T18:00:00-03:00',
      '2027-02-05T20:30:00-03:00',
    )
    renderApp('/llamadas/glosario', queryClient)
    expect(await screen.findByText('Mama vieja')).toBeInTheDocument()
    expect(screen.getAllByRole('term')).toHaveLength(20)
  })

  it('sin red y sin orden publicado, están las clasificadas', async () => {
    vi.setSystemTime(new Date('2027-02-02T18:00:00-03:00'))
    const queryClient = await (async () => {
      online()
      vi.mocked(api.fetchParadeOrder).mockResolvedValue([])
      const first = renderApp('/conjuntos', appClient())
      await waitFor(() => {
        expect(api.fetchStreetClosures).toHaveBeenCalledWith(NIGHT_2.id)
        expect(first.queryClient.isFetching()).toBe(0)
      })
      await persistQueryClientSave({ queryClient: first.queryClient, ...cachePersistOptions(0) })
      cleanup()
      vi.setSystemTime(Date.now() + 2 * DAY)
      offline()
      const restored = appClient()
      await persistQueryClientRestore({ queryClient: restored, ...cachePersistOptions(0) })
      return restored
    })()
    renderApp('/llamadas', queryClient)
    expect(await screen.findByText(/todavía no se publicó/i)).toBeInTheDocument()
    expect(
      await screen.findByRole('region', { name: /comparsas clasificadas/ }),
    ).toBeInTheDocument()
  })

  it('pasada una semana sin abrir la app y sin red, lo dice y deja reintentar', async () => {
    const queryClient = await reopenOffline(
      '2027-01-28T18:00:00-03:00',
      '2027-02-05T20:30:00-03:00',
    )
    renderApp('/llamadas', queryClient)
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las Llamadas.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })
})
