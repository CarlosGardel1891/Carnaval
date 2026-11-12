/**
 * El sitio público de Carnavalero (decisión 83): la política de privacidad, el soporte y la
 * página de borrado de datos. No es una versión web de la app.
 */
export const SITE_URL = 'https://carnavalero.vercel.app'

/** La política de privacidad, en el idioma de la app. */
export const privacyUrl = (language: string): string =>
  language.startsWith('en') ? `${SITE_URL}/privacy` : `${SITE_URL}/privacidad`
