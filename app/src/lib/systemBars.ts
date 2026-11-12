import { useEffect } from 'react'
import { Capacitor, SystemBars, SystemBarsStyle, SystemBarType } from '@capacitor/core'

/**
 * Qué hay debajo de la barra de estado en una pantalla (decisión 92): el degradé de la marca
 * (íconos blancos) o el fondo claro (íconos oscuros).
 */
export type BarsOver = 'onBrand' | 'onLight'

/**
 * Si la app se dibuja por debajo de la barra de estado. En iOS, siempre. En Android depende del
 * WebView: los viejos la muestran encogida, con el fondo claro de la ventana detrás de la barra,
 * y ahí los íconos van siempre oscuros.
 */
function drawsUnderStatusBar(): boolean {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;height:var(--safe-top);visibility:hidden'
  document.body.appendChild(probe)
  const height = probe.getBoundingClientRect().height
  probe.remove()
  return height > 0
}

let current: BarsOver | null = null

function apply(over: BarsOver): void {
  if (!Capacitor.isNativePlatform() || current === over) return
  current = over
  const style =
    over === 'onBrand' && drawsUnderStatusBar() ? SystemBarsStyle.Dark : SystemBarsStyle.Light
  // `Dark` son íconos claros, para fondos oscuros; `Light`, íconos oscuros.
  void SystemBars.setStyle({ style, bar: SystemBarType.StatusBar }).catch(() => undefined)
}

/**
 * La pantalla dice qué tiene arriba y los íconos de la barra de estado se adaptan. Al salir
 * vuelven a oscuros, que es lo que va con el fondo claro de la app.
 */
export function useSystemBars(over: BarsOver): void {
  useEffect(() => {
    apply(over)
    return () => {
      if (over === 'onBrand') apply('onLight')
    }
  }, [over])
}
