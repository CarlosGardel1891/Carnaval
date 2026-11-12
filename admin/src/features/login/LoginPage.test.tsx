import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import { ADMIN, renderAdmin } from '../../test-utils'

vi.mock('../../lib/api')

const fill = async (email = 'ana@ejemplo.com', password = 'secreta') => {
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('Email'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('login del panel', () => {
  it('sin sesión, cualquier pantalla manda al login', async () => {
    const { router } = renderAdmin('/', null)
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('un admin entra y llega al inicio', async () => {
    vi.mocked(api.signIn).mockResolvedValue(ADMIN)
    const { router } = renderAdmin('/login', null)
    await fill()
    expect(api.signIn).toHaveBeenCalledWith('ana@ejemplo.com', 'secreta')
    expect(await screen.findByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByText('Sesión de ana@ejemplo.com')).toBeInTheDocument()
  })

  it('una cuenta que no es admin no entra, y se le cierra la sesión', async () => {
    vi.mocked(api.signIn).mockResolvedValue({ email: 'otro@ejemplo.com', isAdmin: false })
    const { router } = renderAdmin('/login', null)
    await fill('otro@ejemplo.com')
    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene permiso de admin')
    expect(api.signOut).toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('una sesión guardada que no es de admin tampoco pasa', async () => {
    const { router } = renderAdmin('/', { email: 'otro@ejemplo.com', isAdmin: false })
    expect(await screen.findByRole('alert')).toHaveTextContent('no tiene permiso de admin')
    expect(api.signOut).toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('avisa si el email o la contraseña están mal', async () => {
    vi.mocked(api.signIn).mockRejectedValue(new api.WrongCredentialsError('no'))
    renderAdmin('/login', null)
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent('no son correctos')
  })

  it('avisa si el inicio de sesión falla por otra cosa', async () => {
    vi.mocked(api.signIn).mockRejectedValue(new Error('sin red'))
    renderAdmin('/login', null)
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo iniciar la sesión')
  })

  it('«Salir» cierra la sesión y vuelve al login', async () => {
    const { router } = renderAdmin('/')
    await userEvent.click(await screen.findByRole('button', { name: 'Salir' }))
    expect(api.signOut).toHaveBeenCalled()
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
