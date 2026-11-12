import { Capacitor } from '@capacitor/core'

export interface ShareContent {
  title: string
  text: string
  url: string
}

/** Si hay con qué compartir: en el teléfono siempre; en el navegador, si lo trae. */
export function canShare(): boolean {
  return Capacitor.isNativePlatform() || typeof navigator.share === 'function'
}

/** Abre la hoja de compartir del sistema. Que el usuario la cierre sin elegir no es un error. */
export async function share(content: ShareContent): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import('@capacitor/share')
      await Share.share({ ...content, dialogTitle: content.title })
    } else if (typeof navigator.share === 'function') {
      await navigator.share(content)
    }
  } catch {
    // Cancelado.
  }
}
