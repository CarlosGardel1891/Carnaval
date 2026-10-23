import type { CapacitorConfig } from '@capacitor/cli'

// Bundle ID provisional: cambiarlo antes de crear las fichas en las tiendas (ver CLAUDE.md).
const APP_ID = 'uy.cuerda.app'

// CUERDA_LOCAL=1 (scripts *:local) permite http hacia el Supabase local desde el emulador.
const localBackend = process.env.CUERDA_LOCAL === '1'

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: 'Cuerda',
  webDir: 'dist',
  ...(localBackend && {
    server: { cleartext: true },
    android: { allowMixedContent: true },
  }),
}

export default config
