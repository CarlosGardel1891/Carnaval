import { useTranslation } from 'react-i18next'
import { formatLocale } from './format'

/** Idioma con el que se formatean fechas, horas y números (ver `formatLocale`). */
export function useLocale(): string {
  const { i18n } = useTranslation()
  return formatLocale(i18n.language, i18n.resolvedLanguage ?? 'es')
}
