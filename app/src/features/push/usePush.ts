import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { getUserId, registerPushDevice } from '../../lib/api'
import { preferencesStorage } from '../../lib/preferencesStorage'
import {
  checkPushPermission,
  ensureNoticeChannel,
  getPushToken,
  listenToPush,
  pushEnabled,
  pushPlatform,
  requestPushPermission,
  type PushPermission,
} from '../../lib/push'

const PERMISSION_KEY = ['push', 'permiso'] as const
const ASKED_KEY = ['push', 'preguntado'] as const
/** Dónde se guarda que la app ya preguntó por los avisos: no se insiste (decisión 45). */
export const ASKED_STORAGE_KEY = 'cuerda-push-asked'

/** El idioma en el que se mandan los avisos a este teléfono: el de la interfaz. */
const noticeLanguage = (resolved: string | undefined) => (resolved === 'en' ? 'en' : 'es')

/**
 * Registra este teléfono para recibir avisos, si hay permiso y hay sesión. Sin sesión no
 * hay a quién avisar: se registra cuando se siga el primer conjunto.
 */
async function registerDevice(
  language: 'es' | 'en',
  known: { token?: string; permission?: PushPermission } = {},
): Promise<void> {
  if (!pushEnabled) return
  if ((known.permission ?? (await checkPushPermission())) !== 'granted') return
  if (!(await getUserId())) return
  const { token } = known
  await registerPushDevice(token ?? (await getPushToken()), pushPlatform(), language)
}

/** Sólo acepta rutas de la app: empieza con una sola barra. */
export function safeRoute(route: unknown): string | null {
  return typeof route === 'string' && /^\/(?!\/)/.test(route) ? route : null
}

/**
 * Conecta los avisos con la app. Se monta una sola vez, en el marco:
 *
 * - al arrancar (y cuando cambia el idioma) vuelve a registrar el teléfono, por si cambió
 *   el token o el usuario;
 * - si el token cambia, lo registra;
 * - al tocar un aviso abre la pantalla que indica (la ficha del conjunto o el pizarrón);
 * - si llega uno con la app abierta, vuelve a pedir la grilla.
 */
export function usePushSync(): void {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t, i18n } = useTranslation()
  const language = noticeLanguage(i18n.resolvedLanguage)

  useEffect(() => {
    if (!pushEnabled) return
    void ensureNoticeChannel(t('push.channel')).catch(() => undefined)
    // Si falla (sin red, por ejemplo), se vuelve a intentar en el próximo arranque.
    void registerDevice(language).catch(() => undefined)
  }, [language, t])

  useEffect(() => {
    if (!pushEnabled) return
    let stop: (() => void) | undefined
    let cancelled = false
    void listenToPush({
      onToken: (token) => void registerDevice(language, { token }).catch(() => undefined),
      onTap: (route) => {
        const target = safeRoute(route)
        if (target) void navigate(target)
      },
      onReceived: () => {
        void queryClient.invalidateQueries({
          predicate: ({ queryKey }) => queryKey[0] === 'actuaciones' || queryKey[0] === 'proximas',
        })
      },
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe()
      else stop = unsubscribe
    })
    return () => {
      cancelled = true
      stop?.()
    }
  }, [language, navigate, queryClient])
}

/** El permiso de notificaciones y si la app ya preguntó por los avisos. */
export function usePushStatus() {
  const permission = useQuery({
    queryKey: PERMISSION_KEY,
    queryFn: checkPushPermission,
    enabled: pushEnabled,
    // El permiso se puede cambiar desde los ajustes del teléfono: se vuelve a mirar al volver.
    staleTime: 0,
    meta: { persist: false },
  })
  const asked = useQuery({
    queryKey: ASKED_KEY,
    queryFn: async () => (await preferencesStorage.getItem(ASKED_STORAGE_KEY)) === '1',
    enabled: pushEnabled,
    staleTime: Infinity,
    meta: { persist: false },
  })
  return {
    enabled: pushEnabled,
    permission: permission.data,
    asked: asked.data,
    isPending: permission.isPending || asked.isPending,
  }
}

/** Anota que ya se preguntó, para no volver a mostrar la tarjeta. */
function useMarkAsked() {
  const queryClient = useQueryClient()
  return async () => {
    queryClient.setQueryData(ASKED_KEY, true)
    await preferencesStorage.setItem(ASKED_STORAGE_KEY, '1')
  }
}

/** «Ahora no»: la app no vuelve a preguntar por su cuenta. */
export function useDismissPushPrompt() {
  const markAsked = useMarkAsked()
  return () => void markAsked()
}

/** Pide el permiso del sistema y, si se concede, registra el teléfono. */
export function useEnablePush() {
  const queryClient = useQueryClient()
  const { i18n } = useTranslation()
  const markAsked = useMarkAsked()
  return useMutation({
    mutationFn: async (): Promise<PushPermission> => {
      await markAsked()
      const permission = await requestPushPermission()
      queryClient.setQueryData(PERMISSION_KEY, permission)
      await registerDevice(noticeLanguage(i18n.resolvedLanguage), { permission })
      return permission
    },
  })
}
