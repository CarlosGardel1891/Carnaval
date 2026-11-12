import { Capacitor } from '@capacitor/core'

/**
 * Una vibración liviana, para confirmar un toque que guarda algo (Seguir). Sólo en el teléfono;
 * si el plugin falla o el teléfono no vibra, no pasa nada.
 */
export function tapLight(): void {
  if (!Capacitor.isNativePlatform()) return
  void import('@capacitor/haptics')
    .then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: ImpactStyle.Light }))
    .catch(() => undefined)
}
