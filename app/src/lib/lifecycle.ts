import { App as NativeApp } from '@capacitor/app'
import { focusManager } from '@tanstack/react-query'
import { followPhoneLanguage } from '../i18n'
import { setAuthActive } from './api'

/**
 * Conecta la app con su ciclo de vida. Se llama una sola vez, al arrancar.
 *
 * - «App al frente»: TanStack Query lo deduce del foco de la ventana, que en Capacitor no
 *   siempre se dispara. Acá sale de `appStateChange` de @capacitor/app (en la web, ese
 *   evento es `visibilitychange`). De eso cuelgan el refresco al volver, la pausa del
 *   refetch periódico en segundo plano y el reloj de `useNow`.
 * - Sesión: se renueva sola sólo con la app al frente.
 * - Idioma: sigue al del teléfono, también si cambia con la app abierta (decisión 94).
 * - Botón «atrás» de Android: vuelve en el historial y, si no hay adónde, minimiza la app
 *   en vez de cerrarla.
 */
export function initLifecycle(): void {
  focusManager.setEventListener((setFocused) => {
    const listener = NativeApp.addListener('appStateChange', ({ isActive }) => {
      setFocused(isActive)
      setAuthActive(isActive)
      if (isActive) followPhoneLanguage()
    })
    return () => {
      void listener.then((handle) => handle.remove())
    }
  })

  window.addEventListener('languagechange', followPhoneLanguage)

  void NativeApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else void NativeApp.minimizeApp()
  })
}
