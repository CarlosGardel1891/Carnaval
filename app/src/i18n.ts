import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const

/** Donde las versiones anteriores guardaban el idioma. Ya no se usa: se limpia al arrancar. */
const OLD_LANGUAGE_KEY = 'i18nextLng'

const phoneLanguages = () => (navigator.languages ?? [navigator.language]).join(',')
let seen = phoneLanguages()

// El idioma es siempre el del teléfono (decisión 94): no se guarda ni se elige en la app.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    fallbackLng: 'es',
    supportedLngs: SUPPORTED_LANGUAGES,
    load: 'languageOnly',
    detection: { order: ['navigator'], caches: [] },
    interpolation: { escapeValue: false },
  })

try {
  window.localStorage.removeItem(OLD_LANGUAGE_KEY)
} catch {
  // Sin acceso a lo guardado no hay nada que limpiar.
}

/**
 * Si el idioma del teléfono cambió desde la última vez que se miró, la app pasa a ese
 * idioma. Se llama cuando el sistema avisa del cambio y cada vez que la app vuelve al frente.
 */
export function followPhoneLanguage(): void {
  const current = phoneLanguages()
  if (current === seen) return
  seen = current
  // Sin argumento, i18next vuelve a detectar el idioma.
  void i18n.changeLanguage()
}

export default i18n
