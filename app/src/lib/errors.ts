/**
 * Reporte de errores (decisión 86). Sólo la parte web de Sentry, y sólo si el build trae
 * `VITE_SENTRY_DSN`: en desarrollo y en los tests no hace nada. No lleva datos personales: sin
 * usuario, sin cookies, sin el contenido de los pedidos, sin grabación de pantalla ni medición
 * de rendimiento. La IP no se guarda: se apaga en el proyecto de Sentry (Settings → Security &
 * Privacy → Prevent Storing of IP Addresses), porque el navegador no puede ocultarla.
 */

type Reporter = (error: unknown) => void

let report: Reporter = () => undefined

/** Lo que identifica a este build en un reporte. */
export const releaseName = (): string => `carnavalero@${__APP_VERSION__}+${__APP_BUILD__}`

/**
 * Un evento, sin nada que pueda identificar a la persona. La dirección de la página se queda
 * sin sus parámetros: `?noche=` no dice nada de nadie, pero es más simple no mandar ninguno.
 */
export function scrub<T extends object>(event: T): T {
  const clean = { ...event } as T & { user?: unknown; request?: unknown; extra?: unknown }
  delete clean.user
  delete clean.extra
  const request = clean.request as { url?: string } | undefined
  if (request?.url) {
    clean.request = { url: request.url.split(/[?#]/)[0] }
  } else {
    delete clean.request
  }
  return clean
}

/**
 * Arranca el reporte de errores, si este build lo trae configurado. Sentry se baja aparte: un
 * build sin DSN no lo carga.
 */
export async function initErrorReporting(): Promise<boolean> {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return false
  const Sentry = await import('@sentry/react')
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: releaseName(),
    // Nada del usuario ni de sus pedidos: ni cookies, ni encabezados, ni cuerpos, ni parámetros.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    // Sólo errores: nada de trazas ni de sesiones.
    tracesSampleRate: 0,
    beforeSend: (event) => scrub(event),
    beforeBreadcrumb: (breadcrumb) =>
      // Los pedidos a la base y lo que se toca no viajan: alcanza con el error y dónde fue.
      breadcrumb.category === 'navigation' ? breadcrumb : null,
  })
  report = (error) => {
    Sentry.captureException(error)
  }
  return true
}

/** Manda un error al reporte, si está prendido. Nunca tira. */
export function reportError(error: unknown): void {
  try {
    report(error)
  } catch {
    // El reporte no puede romper la app.
  }
}

/** Sólo para los tests: reemplaza a quién se le avisa. */
export function setErrorReporter(next: Reporter | null): void {
  report = next ?? (() => undefined)
}
