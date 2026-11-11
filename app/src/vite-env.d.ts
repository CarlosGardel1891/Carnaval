interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_MAPTILER_KEY?: string
  /** '1' activa los avisos push. Sólo con Firebase configurado (ver CLAUDE.md). */
  readonly VITE_PUSH_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
