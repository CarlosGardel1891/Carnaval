import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'

// El panel es una web interna y va sólo en español (decisión 70). Los textos igual salen de
// acá, no de los componentes.
void i18n.use(initReactI18next).init({
  resources: { es: { translation: es } },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

export default i18n
