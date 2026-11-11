interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_MAPTILER_KEY?: string
  /** '1' activa los avisos push. Sólo con Firebase configurado (ver CLAUDE.md). */
  readonly VITE_PUSH_ENABLED?: string
  /** Fija el reloj de la app al compilar (`AAAA-MM-DDTHH:MM`). Sólo con la base local. */
  readonly VITE_AHORA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
