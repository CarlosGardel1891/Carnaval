import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import i18n from './i18n'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('muestra el aviso de placeholder al enviar', async () => {
    await i18n.changeLanguage('es')
    render(<LoginPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(screen.getByRole('status')).toHaveTextContent('todavía no está conectado')
  })
})
