import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient } from '@tanstack/react-query'
import i18n from '../../i18n'
import { deleteMyData, fetchCurrentSeason, fetchNightActs } from '../../lib/api'
import { preferencesStorage } from '../../lib/preferencesStorage'
import { deletePushToken } from '../../lib/push'
import { CACHE_KEY } from '../../lib/queryCache'
import { renderApp } from '../../test-utils'
import { ASKED_STORAGE_KEY } from '../push/usePush'

vi.mock('../../lib/api')
vi.mock('../../lib/push', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/push')>()),
  deletePushToken: vi.fn(() => Promise.resolve()),
}))

const removeItem = vi.spyOn(preferencesStorage, 'removeItem')

describe('acerca de', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es')
    vi.mocked(fetchCurrentSeason).mockResolvedValue(null)
    vi.mocked(fetchNightActs).mockResolvedValue([])
    vi.mocked(deleteMyData).mockResolvedValue()
    vi.mocked(deletePushToken).mockResolvedValue()
    removeItem.mockResolvedValue()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('se llega desde Hoy', async () => {
    const user = userEvent.setup()
    renderApp('/')
    await user.click(await screen.findByRole('link', { name: /Acerca de Carnavalero/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Acerca de' })).toBeVisible()
  })

  it('muestra la versión y enlaza la política de privacidad en español', async () => {
    renderApp('/acerca')
    expect(await screen.findByText(`Versión ${__APP_VERSION__} (${__APP_BUILD__})`)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Leer la política de privacidad' })).toHaveAttribute(
      'href',
      'https://carnavalero.vercel.app/privacidad',
    )
  })

  it('en inglés enlaza la política en inglés', async () => {
    await i18n.changeLanguage('en')
    renderApp('/acerca')
    expect(await screen.findByRole('link', { name: 'Read the privacy policy' })).toHaveAttribute(
      'href',
      'https://carnavalero.vercel.app/privacy',
    )
    expect(screen.getByRole('button', { name: 'Delete my data' })).toBeVisible()
  })

  it('no borra nada sin confirmar, y se puede cancelar', async () => {
    const user = userEvent.setup()
    renderApp('/acerca')
    await user.click(await screen.findByRole('button', { name: 'Borrar mis datos' }))
    expect(screen.getByText('¿Borrar tus datos?')).toBeVisible()
    expect(deleteMyData).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByText('¿Borrar tus datos?')).not.toBeInTheDocument()
    expect(deleteMyData).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('al confirmar borra en la base, da de baja el token y limpia lo guardado en el teléfono', async () => {
    const user = userEvent.setup()
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['seguidos'], [10, 11])
    renderApp('/acerca', queryClient)

    await user.click(await screen.findByRole('button', { name: 'Borrar mis datos' }))
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Listo: borramos tus datos.')
    expect(deleteMyData).toHaveBeenCalledTimes(1)
    expect(deletePushToken).toHaveBeenCalledTimes(1)
    expect(removeItem).toHaveBeenCalledWith(ASKED_STORAGE_KEY)
    expect(removeItem).toHaveBeenCalledWith(CACHE_KEY)
    expect(queryClient.getQueryData(['seguidos'])).toBeUndefined()
    expect(screen.getByRole('button', { name: 'Borrar mis datos' })).toBeVisible()
  })

  it('si la base falla avisa y no toca lo del teléfono', async () => {
    const user = userEvent.setup()
    vi.mocked(deleteMyData).mockRejectedValue(new Error('sin red'))
    renderApp('/acerca')

    await user.click(await screen.findByRole('button', { name: 'Borrar mis datos' }))
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos borrar tus datos')
    expect(deletePushToken).not.toHaveBeenCalled()
    expect(removeItem).not.toHaveBeenCalled()
  })

  it('si no se puede dar de baja el token, igual termina de borrar', async () => {
    const user = userEvent.setup()
    vi.mocked(deletePushToken).mockRejectedValue(new Error('sin Firebase'))
    renderApp('/acerca')

    await user.click(await screen.findByRole('button', { name: 'Borrar mis datos' }))
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }))

    await waitFor(() => expect(removeItem).toHaveBeenCalledWith(CACHE_KEY))
    expect(await screen.findByRole('status')).toBeVisible()
  })
})
