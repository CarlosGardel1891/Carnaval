import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchCurrentSeason,
  fetchFollowed,
  fetchGroups,
  fetchParadeEvents,
  fetchParadeOrder,
} from '../../lib/api'
import { renderApp } from '../../test-utils'
import { groups, NIGHT_1, NIGHT_2, nights, order1, order2, SEASON } from './llamadas-fixtures'

vi.mock('../../lib/api')

const rows = () =>
  within(screen.getByRole('region', { name: 'Orden de desfile' })).getAllByRole('listitem')

describe('Llamadas: orden de desfile', () => {
  const systemTz = process.env.TZ

  beforeEach(async () => {
    // El teléfono en Tokio; en Montevideo es 30 de enero: todavía no empezó el desfile.
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-30T19:00:00-03:00'))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchParadeEvents).mockResolvedValue(nights())
    vi.mocked(fetchParadeOrder).mockImplementation((eventId) =>
      Promise.resolve(eventId === NIGHT_1.id ? order1() : order2()),
    )
    vi.mocked(fetchGroups).mockResolvedValue(groups())
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('la pestaña Llamadas está siempre y abre el orden de la próxima noche', async () => {
    const { router } = renderApp('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Llamadas' }))
    expect(router.state.location.pathname).toBe('/llamadas')
    expect(await screen.findByRole('heading', { level: 1, name: 'Llamadas' })).toBeInTheDocument()
    expect(await screen.findByText('viernes, 5 de febrero')).toBeInTheDocument()
    expect(fetchParadeEvents).toHaveBeenCalledWith(1)
    expect(fetchParadeOrder).toHaveBeenCalledWith(NIGHT_1.id)
    expect(screen.getByRole('link', { name: 'Llamadas' })).toHaveAttribute('aria-current', 'page')
  })

  it('muestra el número, la comparsa y la hora estimada de salida, en hora de Montevideo', async () => {
    renderApp('/llamadas')
    await screen.findByRole('region', { name: 'Orden de desfile' })
    expect(
      rows().map((row) => [
        within(row).getByLabelText(/^Lugar/).textContent,
        row.querySelector('a')?.textContent,
        row.querySelector('time')?.textContent,
      ]),
    ).toEqual([
      ['1', 'C 1080', '≈ 20:00'],
      ['2', 'Valores de Ansina', '≈ 20:10'],
      ['3', 'La Dominguera', '≈ 20:20'],
    ])
    expect(within(rows()[0]!).getByText('Barrio Sur')).toBeInTheDocument()
    expect(within(rows()[0]!).getByRole('link', { name: 'C 1080' })).toHaveAttribute(
      'href',
      '/conjuntos/c-1080',
    )
  })

  it('las horas se muestran siempre como estimadas, con la regla explicada', async () => {
    renderApp('/llamadas')
    await screen.findByRole('region', { name: 'Orden de desfile' })
    for (const row of rows()) {
      const time = row.querySelector('time')!
      expect(time.textContent).toMatch(/^≈ /)
      expect(time).toHaveAttribute('aria-label', expect.stringMatching(/^Hora estimada: /))
    }
    expect(
      screen.getByText(
        /La primera comparsa sale a las 20:00 y cada una larga 10 minutos y 150 metros después/,
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/de atraso/)).not.toBeInTheDocument()
  })

  it('marca las comparsas que el usuario sigue', async () => {
    vi.mocked(fetchFollowed).mockResolvedValue([202])
    renderApp('/llamadas')
    await screen.findByRole('region', { name: 'Orden de desfile' })
    expect(await within(rows()[1]!).findByText('La seguís')).toBeInTheDocument()
    expect(within(rows()[0]!).queryByText('La seguís')).not.toBeInTheDocument()
  })

  it('se puede cambiar de noche, y la última sale después de medianoche', async () => {
    const { router } = renderApp('/llamadas')
    await screen.findByRole('region', { name: 'Orden de desfile' })
    await userEvent.click(screen.getByRole('link', { name: 'Noche 2' }))
    expect(router.state.location.search).toBe('?noche=2027-02-06')
    expect(await screen.findByText('sábado, 6 de febrero')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Comparsa 26' })).toBeInTheDocument()
    expect(rows()).toHaveLength(26)
    expect(rows().at(-1)!.querySelector('time')?.textContent).toBe('≈ 00:10')
    expect(screen.getByRole('link', { name: 'Noche 2' })).toHaveAttribute('aria-current', 'true')
  })

  it('la noche del desfile abre en esa noche, marcada como hoy', async () => {
    // Las 00:30 del domingo en Montevideo: todavía es la noche del sábado 6.
    vi.setSystemTime(new Date('2027-02-07T00:30:00-03:00'))
    renderApp('/llamadas')
    expect(await screen.findByText('sábado, 6 de febrero')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Noche 2 · Hoy' })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('si el desfile lleva atraso, lo dice y corre las horas', async () => {
    vi.mocked(fetchParadeEvents).mockResolvedValue([
      { ...NIGHT_1, desfile_atraso_min: 25 },
      NIGHT_2,
    ])
    renderApp('/llamadas')
    await screen.findByRole('region', { name: 'Orden de desfile' })
    expect(screen.getByText(/El desfile lleva 25 minutos de atraso/)).toBeInTheDocument()
    expect(rows()[0]!.querySelector('time')?.textContent).toBe('≈ 20:25')
  })

  it('sin orden dice que todavía no se publicó y lista las clasificadas, sin número ni hora', async () => {
    vi.mocked(fetchParadeOrder).mockResolvedValue([])
    vi.mocked(fetchFollowed).mockResolvedValue([203])
    renderApp('/llamadas')
    expect(
      await screen.findByText('El orden de desfile de esta noche todavía no se publicó.'),
    ).toBeInTheDocument()
    const qualified = await screen.findByRole('region', { name: '3 comparsas clasificadas' })
    expect(
      within(qualified)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['C 1080', 'Valores de Ansina', 'La Dominguera'])
    expect(within(qualified).queryByText('Sin Clasificar')).not.toBeInTheDocument()
    expect(within(qualified).getByText('La seguís')).toBeInTheDocument()
    expect(document.querySelector('main time')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Orden de desfile' })).not.toBeInTheDocument()
  })

  it('con el orden de prueba cargado avisa que es de prueba; con el real, no', async () => {
    vi.mocked(fetchParadeOrder).mockResolvedValue(order1('orden-ficticio'))
    renderApp('/llamadas')
    expect(await screen.findByRole('note')).toHaveTextContent(/Orden de prueba/)

    cleanup()
    vi.mocked(fetchParadeOrder).mockResolvedValue(order1())
    renderApp('/llamadas')
    await screen.findByRole('region', { name: 'Orden de desfile' })
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('sin noches cargadas lo dice', async () => {
    vi.mocked(fetchParadeEvents).mockResolvedValue([])
    renderApp('/llamadas')
    expect(
      await screen.findByText('Todavía no están cargadas las noches del Desfile de Llamadas.'),
    ).toBeInTheDocument()
  })

  it('si falla la carga lo avisa y deja reintentar', async () => {
    vi.mocked(fetchParadeEvents).mockRejectedValueOnce(new Error('sin red'))
    renderApp('/llamadas')
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar las Llamadas.')
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('region', { name: 'Orden de desfile' })).toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/llamadas')
    await screen.findByRole('region', { name: 'Parade line-up' })
    expect(screen.getByText('Friday, February 5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Night 1' })).toBeInTheDocument()
    const first = within(screen.getByRole('region', { name: 'Parade line-up' })).getAllByRole(
      'listitem',
    )[0]!
    expect(first.querySelector('time')?.textContent).toBe('≈ 8:00 PM')
    expect(first.querySelector('time')).toHaveAttribute('aria-label', 'Estimated time: 8:00 PM')
    expect(screen.getByText(/The first comparsa sets off at 20:00/)).toBeInTheDocument()
  })
})
