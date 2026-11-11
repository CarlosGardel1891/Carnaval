import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchFollowed,
  fetchGroup,
  followGroup,
  isRateLimited,
  onUserChange,
  unfollowGroup,
  type GroupDetail,
} from '../../lib/api'
import { renderApp } from '../../test-utils'

vi.mock('../../lib/api')

const GROUP: GroupDetail = {
  id: 10,
  slug: 'la-gran-muneca',
  nombre: 'La Gran Muñeca',
  categoria: 'murga',
  barrio: null,
  bio: null,
  instagram: null,
  facebook: null,
  foto_url: null,
  temporadas: [],
}

/** Una promesa que el test resuelve o rechaza cuando quiere. */
function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const followButton = () => screen.findByRole('button', { name: 'Seguir a La Gran Muñeca' })
const followingButton = () => screen.findByRole('button', { name: /^Siguiendo a La Gran Muñeca/ })

describe('Seguir', () => {
  beforeEach(async () => {
    vi.mocked(fetchGroup).mockResolvedValue(GROUP)
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  it('sin sesión el botón dice «Seguir» y no se crea nada hasta tocarlo', async () => {
    renderApp('/conjuntos/la-gran-muneca')
    const button = await followButton()
    await waitFor(() => expect(button).toBeEnabled())
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveTextContent('Seguir')
    expect(followGroup).not.toHaveBeenCalled()
  })

  it('seguir responde en el momento, antes de que conteste la base', async () => {
    const saving = deferred()
    vi.mocked(followGroup).mockReturnValue(saving.promise)
    renderApp('/conjuntos/la-gran-muneca')
    const button = await followButton()
    await waitFor(() => expect(button).toBeEnabled())

    await userEvent.click(button)
    expect(await followingButton()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { pressed: true })).toHaveTextContent('Siguiendo')
    expect(followGroup).toHaveBeenCalledWith(10)

    // Cuando la base confirma, la lista se vuelve a pedir y sigue marcado.
    vi.mocked(fetchFollowed).mockResolvedValue([10])
    await act(async () => {
      saving.resolve()
      await saving.promise
    })
    expect(await followingButton()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('si falla vuelve atrás y lo avisa', async () => {
    vi.mocked(followGroup).mockRejectedValue(new Error('sin red'))
    renderApp('/conjuntos/la-gran-muneca')
    const button = await followButton()
    await waitFor(() => expect(button).toBeEnabled())

    await userEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar el cambio. Probá de nuevo.',
    )
    expect(await followButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it('si el alta choca con el límite por IP, pide probar en un rato', async () => {
    vi.mocked(followGroup).mockRejectedValue({ status: 429 })
    vi.mocked(isRateLimited).mockReturnValue(true)
    renderApp('/conjuntos/la-gran-muneca')
    const button = await followButton()
    await waitFor(() => expect(button).toBeEnabled())

    await userEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('Probá de nuevo en un rato.')
    expect(await followButton()).toHaveAttribute('aria-pressed', 'false')
  })

  it('dejar de seguir también responde en el momento y vuelve atrás si falla', async () => {
    vi.mocked(fetchFollowed).mockResolvedValue([10, 11])
    const saving = deferred()
    vi.mocked(unfollowGroup).mockReturnValue(saving.promise)
    renderApp('/conjuntos/la-gran-muneca')

    await userEvent.click(await followingButton())
    expect(await followButton()).toHaveAttribute('aria-pressed', 'false')
    expect(unfollowGroup).toHaveBeenCalledWith(10)

    await act(async () => {
      saving.reject(new Error('sin red'))
      await saving.promise.catch(() => undefined)
    })
    expect(await followingButton()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('si no se pueden cargar los seguidos, la ficha anda y se puede seguir', async () => {
    vi.mocked(fetchFollowed).mockRejectedValue(new Error('sin red'))
    renderApp('/conjuntos/la-gran-muneca')
    const button = await followButton()
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByRole('heading', { level: 1, name: 'La Gran Muñeca' })).toBeInTheDocument()

    vi.mocked(fetchFollowed).mockResolvedValue([10])
    await userEvent.click(button)
    expect(await followingButton()).toBeInTheDocument()
  })

  it('si se pierde la sesión, deja de figurar como seguido sin romperse', async () => {
    let userChanged: (userId: string | null) => void = () => undefined
    vi.mocked(onUserChange).mockImplementation((listener) => {
      userChanged = listener
      return () => undefined
    })
    vi.mocked(fetchFollowed).mockResolvedValue([10])
    renderApp('/conjuntos/la-gran-muneca')
    expect(await followingButton()).toBeInTheDocument()

    // La sesión guardada dejó de valer (reinstalación, datos borrados, token vencido).
    vi.mocked(fetchFollowed).mockResolvedValue([])
    act(() => {
      userChanged('usuario-a')
      userChanged(null)
    })
    expect(await followButton()).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('heading', { level: 1, name: 'La Gran Muñeca' })).toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/conjuntos/la-gran-muneca')
    expect(await screen.findByRole('button', { name: 'Follow La Gran Muñeca' })).toHaveTextContent(
      'Follow',
    )
  })
})
