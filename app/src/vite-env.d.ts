interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_MAPTILER_KEY?: string
  /** '1' activa los avisos push. Sólo con Firebase configurado (ver CLAUDE.md). */
  readonly VITE_PUSH_ENABLED?: string
  /** Fija el reloj de la app al compilar (`AAAA-MM-DDTHH:MM`). Sólo con la base local. */
  readonly VITE_AHORA?: string
  /** El DSN de Sentry. Vacío, no hay reporte de errores (decisión 86). */
  readonly VITE_SENTRY_DSN?: string
  /** '1' activa el modo demostración. Sólo en el build `beta` (decisión 85). */
  readonly VITE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** La versión visible de la app y su número de build (`app/version.json`, decisión 81). */
declare const __APP_VERSION__: string
declare const __APP_BUILD__: number
