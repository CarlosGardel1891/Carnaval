import { beforeAll, describe, expect, it } from 'vitest'
import {
  classifyFcmError,
  createFcmSender,
  fcmMessage,
  parseServiceAccount,
  signServiceAccountJwt,
  type ServiceAccount,
} from './fcm'
import type { Notice } from './notices'

// Nada de esto habla con Google: `fetch` es de mentira y la key se genera acá, para el test.

const NOTICE: Notice = {
  token: 'token-del-telefono',
  language: 'es',
  title: 'Hoy actúa La Gran Muñeca',
  body: 'A las 22:50 en Tablado del Centro.',
  route: '/conjuntos/la-gran-muneca',
  noticeIds: [1],
}

let account: ServiceAccount
let publicKey: CryptoKey

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )
  publicKey = pair.publicKey
  const der = Buffer.from(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
  const lines = der.toString('base64').match(/.{1,64}/g) ?? []
  account = {
    project_id: 'cuerda-test',
    client_email: 'avisos@cuerda-test.iam.gserviceaccount.com',
    private_key: `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----\n`,
  }
})

type Reply = { status: number; body?: unknown } | Error

/** Un `fetch` de mentira: el token de Google siempre sale bien; FCM responde lo que se le diga. */
function fakeFetch(fcmReplies: Reply[], tokenReplies: Reply[] = []) {
  const calls: { url: string; headers: Record<string, string>; body: string }[] = []
  let tokens = 0
  const respond = (reply: Reply) => {
    if (reply instanceof Error) throw reply
    return new Response(JSON.stringify(reply.body ?? {}), { status: reply.status })
  }
  const fetchImpl = ((input: Parameters<typeof fetch>[0], init?: RequestInit) => {
    const url = String(input)
    calls.push({
      url,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: String(init?.body ?? ''),
    })
    try {
      if (url.includes('oauth2.googleapis.com')) {
        tokens++
        return Promise.resolve(
          respond(
            tokenReplies.shift() ?? {
              status: 200,
              body: { access_token: `access-${tokens}`, expires_in: 3600 },
            },
          ),
        )
      }
      return Promise.resolve(respond(fcmReplies.shift() ?? { status: 200 }))
    } catch (error) {
      return Promise.reject(error as Error)
    }
  }) as typeof fetch
  const sends = () => calls.filter((call) => call.url.includes('fcm.googleapis.com'))
  const tokenCalls = () => calls.filter((call) => call.url.includes('oauth2.googleapis.com'))
  return { fetchImpl, sends, tokenCalls }
}

const noSleep = () => Promise.resolve()
const fcmError = (status: string, message = '', errorCode?: string) => ({
  error: { status, message, details: errorCode ? [{ errorCode }] : [] },
})

describe('cuenta de servicio', () => {
  it('lee el JSON y exige los tres campos', () => {
    expect(parseServiceAccount(JSON.stringify(account))).toEqual(account)
    expect(() => parseServiceAccount('no es json')).toThrow(/JSON válido/)
    expect(() => parseServiceAccount(JSON.stringify({ ...account, private_key: '' }))).toThrow(
      /private_key/,
    )
    expect(() => parseServiceAccount('null')).toThrow(/project_id/)
  })

  it('firma el JWT con la key de la cuenta', async () => {
    const jwt = await signServiceAccountJwt(account, 1_800_000_000)
    const [header, claims, signature] = jwt.split('.') as [string, string, string]
    const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
    expect(decode(header)).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(decode(claims)).toEqual({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: 1_800_000_000,
      exp: 1_800_003_600,
    })
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      publicKey,
      Buffer.from(signature, 'base64url'),
      new TextEncoder().encode(`${header}.${claims}`),
    )
    expect(valid).toBe(true)
  })
})

describe('mensaje de FCM', () => {
  it('lleva el título, el cuerpo y la ruta que abre la app', () => {
    expect(fcmMessage(NOTICE)).toEqual({
      message: {
        token: 'token-del-telefono',
        notification: {
          title: 'Hoy actúa La Gran Muñeca',
          body: 'A las 22:50 en Tablado del Centro.',
        },
        data: { route: '/conjuntos/la-gran-muneca' },
        android: { priority: 'HIGH', notification: { channel_id: 'avisos' } },
        apns: { payload: { aps: { sound: 'default' } } },
      },
    })
  })
})

describe('envío por FCM', () => {
  it('manda al proyecto de la cuenta, con el access token de Google', async () => {
    const { fetchImpl, sends, tokenCalls } = fakeFetch([{ status: 200 }])
    const sender = createFcmSender(account, { fetch: fetchImpl, sleep: noSleep })
    expect(sender.dryRun).toBe(false)
    expect(await sender.send(NOTICE)).toBe('sent')

    expect(tokenCalls()).toHaveLength(1)
    expect(tokenCalls()[0]!.body).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth')
    expect(sends()).toHaveLength(1)
    expect(sends()[0]!.url).toBe('https://fcm.googleapis.com/v1/projects/cuerda-test/messages:send')
    expect(sends()[0]!.headers.authorization).toBe('Bearer access-1')
    expect(JSON.parse(sends()[0]!.body)).toEqual(fcmMessage(NOTICE))
  })

  it('pide el access token una sola vez para muchos envíos', async () => {
    const { fetchImpl, sends, tokenCalls } = fakeFetch([])
    const sender = createFcmSender(account, { fetch: fetchImpl, sleep: noSleep })
    const results = await Promise.all(
      Array.from({ length: 5 }, (_unused, i) => sender.send({ ...NOTICE, token: `t${i}` })),
    )
    expect(results).toEqual(['sent', 'sent', 'sent', 'sent', 'sent'])
    expect(sends()).toHaveLength(5)
    expect(tokenCalls()).toHaveLength(1)
  })

  it('renueva el access token cuando vence', async () => {
    let clock = 1_800_000_000_000
    const { fetchImpl, tokenCalls } = fakeFetch([])
    const sender = createFcmSender(account, {
      fetch: fetchImpl,
      sleep: noSleep,
      now: () => clock,
    })
    await sender.send(NOTICE)
    clock += 30 * 60_000
    await sender.send(NOTICE)
    expect(tokenCalls()).toHaveLength(1)
    clock += 30 * 60_000
    await sender.send(NOTICE)
    expect(tokenCalls()).toHaveLength(2)
  })

  it.each([
    ['UNREGISTERED (404)', { status: 404, body: fcmError('NOT_FOUND', '', 'UNREGISTERED') }],
    [
      'un token que no es de FCM (400)',
      {
        status: 400,
        body: fcmError(
          'INVALID_ARGUMENT',
          'The registration token is not a valid FCM registration token',
        ),
      },
    ],
    [
      'un token de otro proyecto (403)',
      { status: 403, body: fcmError('PERMISSION_DENIED', '', 'SENDER_ID_MISMATCH') },
    ],
  ])('un token rechazado por %s se informa para borrarlo, sin reintentar', async (_name, reply) => {
    const { fetchImpl, sends } = fakeFetch([reply])
    const sender = createFcmSender(account, { fetch: fetchImpl, sleep: noSleep })
    expect(await sender.send(NOTICE)).toBe('invalid-token')
    expect(sends()).toHaveLength(1)
  })

  it('un mensaje mal armado (400) falla sin dar por inválido el token', async () => {
    const { fetchImpl, sends } = fakeFetch([
      { status: 400, body: fcmError('INVALID_ARGUMENT', 'Invalid JSON payload received.') },
    ])
    const sender = createFcmSender(account, { fetch: fetchImpl, sleep: noSleep })
    expect(await sender.send(NOTICE)).toBe('failed')
    expect(sends()).toHaveLength(1)
  })

  it.each([
    ['el límite de envíos (429)', { status: 429, body: fcmError('RESOURCE_EXHAUSTED') }],
    ['un error de FCM (503)', { status: 503, body: fcmError('UNAVAILABLE') }],
    ['un corte de red', new Error('sin red')],
  ])('ante %s reintenta y sale al segundo intento', async (_name, reply) => {
    const waits: number[] = []
    const { fetchImpl, sends } = fakeFetch([reply, { status: 200 }])
    const sender = createFcmSender(account, {
      fetch: fetchImpl,
      sleep: (ms) => {
        waits.push(ms)
        return Promise.resolve()
      },
    })
    expect(await sender.send(NOTICE)).toBe('sent')
    expect(sends()).toHaveLength(2)
    expect(waits).toEqual([500])
  })

  it('después de tres intentos fallidos se rinde, sin dar por inválido el token', async () => {
    const waits: number[] = []
    const unavailable = { status: 503, body: fcmError('UNAVAILABLE') }
    const { fetchImpl, sends } = fakeFetch([unavailable, unavailable, unavailable, { status: 200 }])
    const sender = createFcmSender(account, {
      fetch: fetchImpl,
      sleep: (ms) => {
        waits.push(ms)
        return Promise.resolve()
      },
    })
    expect(await sender.send(NOTICE)).toBe('failed')
    expect(sends()).toHaveLength(3)
    expect(waits).toEqual([500, 1000])
  })

  it('si el access token dejó de valer (401), pide otro y vuelve a mandar', async () => {
    const { fetchImpl, sends, tokenCalls } = fakeFetch([
      { status: 401, body: fcmError('UNAUTHENTICATED') },
      { status: 200 },
    ])
    const sender = createFcmSender(account, { fetch: fetchImpl, sleep: noSleep })
    expect(await sender.send(NOTICE)).toBe('sent')
    expect(tokenCalls()).toHaveLength(2)
    expect(sends().map((call) => call.headers.authorization)).toEqual([
      'Bearer access-1',
      'Bearer access-2',
    ])
  })

  it('si Google no da el access token, falla sin borrar nada', async () => {
    const denied = { status: 400, body: { error: 'invalid_grant' } }
    const { fetchImpl, sends } = fakeFetch([], [denied, denied, denied])
    const sender = createFcmSender(account, { fetch: fetchImpl, sleep: noSleep })
    expect(await sender.send(NOTICE)).toBe('failed')
    expect(sends()).toHaveLength(0)
  })
})

describe('classifyFcmError', () => {
  it('distingue el token inválido de lo transitorio y de lo demás', () => {
    expect(classifyFcmError(404, {})).toBe('invalid-token')
    expect(classifyFcmError(500, {})).toBe('retry')
    expect(classifyFcmError(429, {})).toBe('retry')
    expect(classifyFcmError(401, {})).toBe('auth')
    expect(classifyFcmError(403, fcmError('PERMISSION_DENIED'))).toBe('failed')
    expect(classifyFcmError(400, fcmError('INVALID_ARGUMENT', 'Invalid value at message'))).toBe(
      'failed',
    )
  })
})
