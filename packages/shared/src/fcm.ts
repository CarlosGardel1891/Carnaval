import type { Sender, SendResult } from './delivery.ts'
import type { Notice } from './notices.ts'

/**
 * Envío por Firebase Cloud Messaging (API HTTP v1), para Android e iOS (decisión 46).
 * Usa sólo `fetch` y WebCrypto, que están en Deno (Edge Functions) y en Node (tests): no
 * hay SDK de Firebase. La cuenta de servicio llega como texto (un secret de Supabase),
 * nunca desde el repo.
 */

export interface ServiceAccount {
  project_id: string
  client_email: string
  private_key: string
}

/** Canal de Android en el que caen los avisos. La app lo crea con este mismo id. */
export const NOTICE_CHANNEL_ID = 'avisos'

/** Lee la cuenta de servicio (el JSON que baja de Firebase) y controla que esté completa. */
export function parseServiceAccount(raw: string): ServiceAccount {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT no es un JSON válido.')
  }
  const account = (parsed ?? {}) as Record<string, unknown>
  for (const field of ['project_id', 'client_email', 'private_key'] as const) {
    if (typeof account[field] !== 'string' || account[field] === '') {
      throw new Error(`A FIREBASE_SERVICE_ACCOUNT le falta «${field}».`)
    }
  }
  return account as unknown as ServiceAccount
}

export interface FcmOptions {
  fetch?: typeof fetch
  /** Espera entre reintentos; los tests la reemplazan para no esperar de verdad. */
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
/** Intentos por notificación ante un error transitorio (429, 5xx o de red). */
const MAX_ATTEMPTS = 3
const BACKOFF_MS = 500

const encoder = new TextEncoder()

function base64url(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? encoder.encode(data) : data
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const base64 = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** El JWT firmado con la key de la cuenta de servicio, con el que Google da un access token. */
export async function signServiceAccountJwt(
  account: ServiceAccount,
  nowSeconds: number,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  )
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(`${header}.${claims}`),
  )
  return `${header}.${claims}.${base64url(new Uint8Array(signature))}`
}

/** El mensaje de FCM para una notificación: título, cuerpo y la ruta que abre al tocarla. */
export function fcmMessage(notice: Notice): Record<string, unknown> {
  return {
    message: {
      token: notice.token,
      notification: { title: notice.title, body: notice.body },
      // `data` sólo lleva textos: la app lee `route` al tocar el aviso.
      data: { route: notice.route },
      android: { priority: 'HIGH', notification: { channel_id: NOTICE_CHANNEL_ID } },
      apns: { payload: { aps: { sound: 'default' } } },
    },
  }
}

interface FcmError {
  error?: { status?: string; message?: string; details?: { errorCode?: string }[] }
}

/** Qué hacer con una respuesta de FCM que no fue un 200. */
export function classifyFcmError(status: number, body: FcmError): SendResult | 'retry' | 'auth' {
  const codes = [body.error?.status, ...(body.error?.details ?? []).map((d) => d.errorCode)]
  const has = (code: string) => codes.includes(code)

  // El token ya no existe (app desinstalada, token vencido) o es de otro proyecto.
  if (status === 404 || has('UNREGISTERED') || has('SENDER_ID_MISMATCH')) return 'invalid-token'
  // Un 400 puede ser el token o el mensaje: sólo se da por inválido si FCM habla del token,
  // para no borrar dispositivos por un mensaje mal armado.
  if (status === 400) {
    return /registration token/i.test(body.error?.message ?? '') ? 'invalid-token' : 'failed'
  }
  if (status === 401) return 'auth'
  if (status === 429 || status >= 500) return 'retry'
  return 'failed'
}

export function createFcmSender(account: ServiceAccount, options: FcmOptions = {}): Sender {
  const fetchImpl = options.fetch ?? fetch
  const sleep = options.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const now = options.now ?? Date.now
  const sendUrl = `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`
  let cached: { token: string; expiresAt: number } | null = null
  let pending: Promise<string> | null = null

  async function requestAccessToken(): Promise<string> {
    const assertion = await signServiceAccountJwt(account, Math.floor(now() / 1000))
    const response = await fetchImpl(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    })
    if (!response.ok) throw new Error(`Google no dio el access token (${response.status}).`)
    const data = (await response.json()) as { access_token: string; expires_in: number }
    // Un minuto de margen para no usar un token a punto de vencer.
    cached = { token: data.access_token, expiresAt: now() + (data.expires_in - 60) * 1000 }
    return data.access_token
  }

  /** Un solo pedido de token aunque lo necesiten varias notificaciones a la vez. */
  function accessToken(): Promise<string> {
    if (cached && cached.expiresAt > now()) return Promise.resolve(cached.token)
    pending ??= requestAccessToken().finally(() => {
      pending = null
    })
    return pending
  }

  async function send(notice: Notice): Promise<SendResult> {
    let renewedAuth = false
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let outcome: SendResult | 'retry' | 'auth'
      try {
        const response = await fetchImpl(sendUrl, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${await accessToken()}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify(fcmMessage(notice)),
        })
        if (response.ok) return 'sent'
        const body = (await response.json().catch(() => ({}))) as FcmError
        outcome = classifyFcmError(response.status, body)
      } catch {
        // Sin red, o Google no respondió: es transitorio.
        outcome = 'retry'
      }

      if (outcome === 'auth') {
        // El access token dejó de valer: se pide otro, una sola vez.
        if (renewedAuth) return 'failed'
        renewedAuth = true
        cached = null
        attempt--
        continue
      }
      if (outcome !== 'retry') return outcome
      if (attempt < MAX_ATTEMPTS) await sleep(BACKOFF_MS * 2 ** (attempt - 1))
    }
    return 'failed'
  }

  return { dryRun: false, send }
}
