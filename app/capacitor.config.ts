/// <reference types="@capacitor/status-bar" />
import type { CapacitorConfig } from '@capacitor/cli'

// Bundle ID provisional: cambiarlo antes de crear las fichas en las tiendas (ver CLAUDE.md).
const APP_ID = 'uy.cuerda.app'

// El fondo de la app (`--color-ground` en src/index.css). En Android, el mismo color está
// en android/app/src/main/res/values/colors.xml: si cambia uno, cambia el otro.
const GROUND = '#0a0f1c'

// CUERDA_LOCAL=1 (scripts *:local) permite http hacia el Supabase local desde el emulador.
const localBackend = process.env.CUERDA_LOCAL === '1'

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: 'Cuerda',
  webDir: 'dist',
  // Lo que se ve hasta que carga la página: oscuro, no un destello blanco.
  backgroundColor: GROUND,
  plugins: {
    // Un solo tema, oscuro: íconos claros en la barra de estado y en la de gestos, sin
    // mirar el tema del teléfono. Desde Android 15 las barras son transparentes y el color
    // de fondo no se puede fijar desde acá: sale de `android:windowBackground` (styles.xml).
    StatusBar: { style: 'DARK' },
    SystemBars: { style: 'DARK' },
  },
  ...(localBackend && {
    server: { cleartext: true },
    android: { allowMixedContent: true },
  }),
}

export default config
