import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import { LoginPage } from './LoginPage'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <LoginPage />
  </StrictMode>,
)
