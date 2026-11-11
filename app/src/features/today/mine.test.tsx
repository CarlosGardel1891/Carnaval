import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchFollowed,
  fetchGroup,
  fetchNightActs,
  followGroup,
  type GroupDetail,
} from '../../lib/api'
import { nightFixture } from '../../test-fixtures'
import { renderApp } from '../../test-utils'

vi.mock('../../lib/api')

/** Los conjuntos de la noche de prueba que sigue el usuario: Agarrate Catalina y C 1080. */
const FOLLOWED = [101, 102]

const CATALINA: GroupDetail = {
  id: 101,
  slug: 'conjunto-1',
  nombre: 'Agarrate Catalina',
  categoria: 'murga',
  barrio: null,
  bio: null,
  instagram: null,
  facebook: null,
  foto_url: null,
  temporadas: [],
}

const boardNames = () =>
  within(screen.getByRole('main'))
    .getAllByRole('listitem')
    .map((row) => row.querySelector('p')?.textContent)

const pressed = (name: string) =>
  screen.getByRole('button', { name }).getAttribute('aria-pressed') === 'true'

describe('«mis conjuntos» en el pizarrón', () => {
  let followed: number[]

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-28T19:00:00-03:00'))
    followed = [...FOLLOWED]
    vi.mocked(fetchFollowed).mockImplementation(() => Promise.resolve(followed))
    // Como la base: con `onlyFollowed` sólo vuelven los conjuntos seguidos.
    vi.mocked(fetchNightActs).mockImplementation(({ onlyFollowed }) =>
      Promise.resolve(
        nightFixture().filter((act) => !onlyFollowed || followed.includes(act.conjunto_id)),
      ),
    )
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('el chip lo filtra la base con los seguidos y queda en la URL', async () => {
    const { router } = renderApp('/')
    await screen.findByRole('region', { name: 'Tablado Centro' })
    expect(pressed('Mis conjuntos')).toBe(false)

    await userEvent.click(screen.getByRole('button', { name: 'Mis conjuntos' }))
    // Por escenario: a igual hora, Escenario Prado va antes que Tablado Centro.
    await waitFor(() => expect(boardNames()).toEqual(['C 1080', 'Agarrate Catalina']))
    expect(fetchNightActs).toHaveBeenLastCalledWith(
      expect.objectContaining({ onlyFollowed: true, onlyFree: false }),
    )
    expect(router.state.location.search).toBe('?mios=1')
    expect(pressed('Mis conjuntos')).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Mis conjuntos' }))
    await waitFor(() => expect(boardNames()).toHaveLength(nightFixture().length))
    expect(router.state.location.search).toBe('')
  })

  it('se combina con «Gratis»', async () => {
    vi.mocked(fetchNightActs).mockImplementation(({ onlyFollowed, onlyFree }) =>
      Promise.resolve(
        nightFixture().filter(
          (act) =>
            (!onlyFollowed || followed.includes(act.conjunto_id)) &&
            (!onlyFree || act.gratis === true),
        ),
      ),
    )
    renderApp('/?mios=1&gratis=1')
    await waitFor(() => expect(boardNames()).toEqual(['C 1080']))
    expect(fetchNightActs).toHaveBeenCalledWith(
      expect.objectContaining({ onlyFollowed: true, onlyFree: true }),
    )
  })

  it('sin conjuntos seguidos explica cómo seguir uno y lleva a la lista', async () => {
    followed = []
    const { router } = renderApp('/?mios=1')
    expect(await screen.findByText(/Todavía no seguís ningún conjunto/)).toBeInTheDocument()
    expect(screen.getByText(/tocá «Seguir»/)).toBeInTheDocument()
    // El chip sigue a mano para apagarlo.
    expect(pressed('Mis conjuntos')).toBe(true)

    await userEvent.click(screen.getByRole('link', { name: 'Ver conjuntos' }))
    expect(router.state.location.pathname).toBe('/conjuntos')
  })

  it('si ninguno de los seguidos actúa esa noche, lo dice y deja quitar el filtro', async () => {
    followed = [999]
    renderApp('/?mios=1')
    expect(
      await screen.findByText('Ninguno de tus conjuntos actúa esta noche.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Todavía no seguís/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    await waitFor(() => expect(boardNames()).toHaveLength(nightFixture().length))
    expect(pressed('Mis conjuntos')).toBe(false)
  })

  it('sin sesión (o si se perdió) el filtro muestra el estado vacío, sin romperse', async () => {
    followed = []
    vi.mocked(fetchNightActs).mockImplementation(({ onlyFollowed }) =>
      Promise.resolve(onlyFollowed ? [] : nightFixture()),
    )
    renderApp('/?mios=1')
    expect(await screen.findByText(/Todavía no seguís ningún conjunto/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Hoy' })).toBeInTheDocument()
  })

  it('seguir un conjunto desde su ficha lo hace aparecer en «mis conjuntos»', async () => {
    followed = []
    vi.mocked(fetchGroup).mockResolvedValue(CATALINA)
    vi.mocked(followGroup).mockImplementation((id) => {
      followed = [...followed, id]
      return Promise.resolve()
    })
    renderApp('/?mios=1')
    await screen.findByText(/Todavía no seguís ningún conjunto/)

    // A la ficha (desde el pizarrón sin filtro), Seguir, y de vuelta.
    await userEvent.click(screen.getByRole('button', { name: 'Mis conjuntos' }))
    await userEvent.click(await screen.findByRole('link', { name: 'Agarrate Catalina' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Seguir a Agarrate Catalina' }))
    await screen.findByRole('button', { name: /^Siguiendo a Agarrate Catalina/ })
    expect(followGroup).toHaveBeenCalledWith(101)

    await userEvent.click(screen.getByRole('button', { name: 'Volver' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Mis conjuntos' }))
    await waitFor(() => expect(boardNames()).toEqual(['Agarrate Catalina']))
  })

  it('está en inglés con el idioma en inglés', async () => {
    followed = []
    await i18n.changeLanguage('en')
    renderApp('/?mios=1')
    expect(await screen.findByText(/You're not following any groups yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'My groups' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse groups' })).toBeInTheDocument()
  })
})
