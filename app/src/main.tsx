import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import i18n from './i18n'
import { App } from './App'
import { initClock } from './lib/clock'
import { initLifecycle } from './lib/lifecycle'
import './index.css'

const syncHtmlLang = (lng: string) => document.documentElement.setAttribute('lang', lng)
syncHtmlLang(i18n.resolvedLanguage ?? 'es')
i18n.on('languageChanged', syncHtmlLang)

initClock({ search: window.location.search, storage: window.sessionStorage, env: import.meta.env })
initLifecycle()

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
