/// <reference types="@capacitor/status-bar" />
import type { CapacitorConfig } from '@capacitor/cli'

// El identificador de la app en las tiendas (decisión 54). Está también en Android
// (build.gradle, strings.xml y el paquete de MainActivity) y en iOS (project.pbxproj).
const APP_ID = 'uy.carnavalero.app'

// El fondo de la app (`--color-ground` en src/index.css). En Android, el mismo color está
// en android/app/src/main/res/values/colors.xml: si cambia uno, cambia el otro.
const GROUND = '#f4f6fb'

// CUERDA_LOCAL=1 (scripts *:local) permite http hacia el Supabase local desde el emulador.
const localBackend = process.env.CUERDA_LOCAL === '1'

const config: CapacitorConfig = {
  appId: APP_ID,
  appName: 'Carnavalero',
  webDir: 'dist',
  // Lo que se ve hasta que carga la página: el fondo claro de la app.
  backgroundColor: GROUND,
  plugins: {
    // Un único diseño, claro (decisión 92): la app arranca con íconos oscuros en las barras del
    // sistema, sin mirar el tema del teléfono, y cada pantalla los cambia según lo que tenga
    // arriba (`lib/systemBars.ts`). Desde Android 15 las barras son transparentes y el color de
    // fondo sale de `android:windowBackground` (styles.xml).
    StatusBar: { style: 'LIGHT' },
    SystemBars: { style: 'LIGHT' },
  },
  ...(localBackend && {
    server: { cleartext: true },
    android: { allowMixedContent: true },
  }),
}

export default config
