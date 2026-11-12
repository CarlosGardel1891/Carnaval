import { Capacitor } from '@capacitor/core'
import { NOTICE_CHANNEL_ID } from '@cuerda/shared'

/**
 * Todo lo que habla con el plugin de push (`@capacitor-firebase/messaging`) pasa por acá;
 * los tests de pantallas mockean este módulo entero.
 *
 * El plugin sólo se carga en un teléfono y con `VITE_PUSH_ENABLED=1`: sin
 * `google-services.json`, Firebase no arranca en Android y cualquier llamada falla
 * (decisión 46). En el navegador no hay push.
 */
export const pushEnabled: boolean =
  import.meta.env.VITE_PUSH_ENABLED === '1' && Capacitor.isNativePlatform()

/** `prompt`: todavía no se pidió (o se puede volver a pedir). */
export type PushPermission = 'granted' | 'denied' | 'prompt'

export type PushPlatform = 'android' | 'ios'

export function pushPlatform(): PushPlatform {
  return Capacitor.getPlatform() === 'ios' ? 'ios' : 'android'
}

async function messaging() {
  const { FirebaseMessaging } = await import('@capacitor-firebase/messaging')
  return FirebaseMessaging
}

const toPermission = (state: string): PushPermission =>
  state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'prompt'

/** El permiso de notificaciones, sin pedirlo. */
export async function checkPushPermission(): Promise<PushPermission> {
  if (!pushEnabled) return 'denied'
  return toPermission((await (await messaging()).checkPermissions()).receive)
}

/**
 * Muestra el diálogo del sistema. En Android 13 o más es el permiso `POST_NOTIFICATIONS`;
 * en Android 12 o menos no hay diálogo y ya está concedido.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  if (!pushEnabled) return 'denied'
  return toPermission((await (await messaging()).requestPermissions()).receive)
}

/** El token de FCM de este teléfono. Sólo con el permiso concedido. */
export async function getPushToken(): Promise<string> {
  return (await (await messaging()).getToken()).token
}

/**
 * Da de baja el token de FCM de este teléfono: deja de recibir avisos hasta que se vuelva a
 * pedir uno (decisión 84, borrar mis datos).
 */
export async function deletePushToken(): Promise<void> {
  if (!pushEnabled) return
  await (await messaging()).deleteToken()
}

/**
 * El canal de Android en el que caen los avisos, con su nombre visible en los ajustes del
 * teléfono. Crear uno que ya existe no hace nada. En iOS no hay canales.
 */
export async function ensureNoticeChannel(name: string): Promise<void> {
  if (!pushEnabled || pushPlatform() !== 'android') return
  // 4 = alta: suena y aparece arriba, que es lo que se espera de «se suspendió».
  await (await messaging()).createChannel({ id: NOTICE_CHANNEL_ID, name, importance: 4 })
}

export interface PushListeners {
  /** El token cambió: hay que volver a registrarlo. */
  onToken: (token: string) => void
  /** Tocaron un aviso. `route` es la ruta que mandó el servidor, tal cual. */
  onTap: (route: unknown) => void
  /** Llegó un aviso con la app abierta (no se muestra como notificación). */
  onReceived: () => void
}

/** Se suscribe a los eventos del plugin. Devuelve cómo dejar de escuchar. */
export async function listenToPush(listeners: PushListeners): Promise<() => void> {
  if (!pushEnabled) return () => undefined
  const plugin = await messaging()
  const handles = await Promise.all([
    plugin.addListener('tokenReceived', ({ token }) => listeners.onToken(token)),
    plugin.addListener('notificationActionPerformed', ({ notification }) => {
      const data = notification.data
      listeners.onTap(
        data && typeof data === 'object' ? (data as Record<string, unknown>).route : undefined,
      )
    }),
    plugin.addListener('notificationReceived', () => listeners.onReceived()),
  ])
  return () => {
    for (const handle of handles) void handle.remove()
  }
}
