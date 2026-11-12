// Lo común a las dos Edge Functions de avisos: quién puede llamarlas, el cliente de la base,
// el envío y la respuesta. La lógica de quién recibe qué está en la base
// (`tomar_avisos_…`) y el armado de los textos en `@cuerda/shared` (`notices.ts`): se
// importan por ruta relativa, con extensión, porque esto corre en Deno.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { Database } from '../../../packages/shared/src/database.types.ts'
import { deliver, dryRunSender, type Sender } from '../../../packages/shared/src/delivery.ts'
import { createFcmSender, parseServiceAccount } from '../../../packages/shared/src/fcm.ts'
import type { Notice } from '../../../packages/shared/src/notices.ts'

export type Db = SupabaseClient<Database>

export interface RunContext {
  db: Db
  /** El instante de la corrida: de acá salen la noche lógica y la hora de Montevideo. */
  now: Date
  /** El cuerpo del pedido (JSON), si vino. */
  options: Record<string, unknown>
}

export interface RunResult {
  noche: string
  notices: Notice[]
  /** Datos extra para la respuesta (por ejemplo, que se llamó fuera de horario). */
  info?: Record<string, unknown>
}

export interface HandleOptions {
  /**
   * Si además de la service role puede llamarla un admin con su sesión (decisión 72). Es
   * para el panel, que corre en un navegador: por eso también responde al preflight de CORS.
   */
  allowAdmin?: boolean
}

// El panel llama desde otro origen. No hay cookies: lo que autoriza es el token.
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
}

const respond = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
  })

/** Si el token es el de la sesión de un usuario con `app_metadata.rol = 'admin'` (decisión 23). */
async function isAdminToken(db: Db, authorization: string | null): Promise<boolean> {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1]
  if (!token) return false
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return false
  return data.user.app_metadata?.rol === 'admin'
}

/** Con Firebase configurado manda de verdad; sin él, simulacro (decisión 49). */
function pickSender(): Sender {
  const account = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
  return account ? createFcmSender(parseServiceAccount(account)) : dryRunSender
}

/** Para la respuesta del simulacro: el token no se muestra entero. */
const maskToken = (token: string) => `…${token.slice(-6)}`

/**
 * Atiende un pedido: sólo POST y sólo con la service role key (o, con `allowAdmin`, con la
 * sesión de un admin). Corre `build` (que toma los avisos de la base y arma las
 * notificaciones), las manda, cierra las que salieron y borra los tokens que el servicio de
 * push rechazó. La base se toca siempre con la service role, que no sale de acá.
 */
export async function handle(
  req: Request,
  build: (context: RunContext) => Promise<RunResult>,
  { allowAdmin = false }: HandleOptions = {},
): Promise<Response> {
  const cors = allowAdmin ? corsHeaders : {}
  const json = (body: unknown, status = 200) => respond(body, status, cors)

  if (allowAdmin && req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Sólo POST.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'Faltan las variables de Supabase.' }, 500)

  const db: Db = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const authorization = req.headers.get('authorization')
  if (authorization !== `Bearer ${serviceKey}`) {
    if (!allowAdmin) return json({ error: 'Sólo la service role puede mandar avisos.' }, 403)
    if (!(await isAdminToken(db, authorization))) {
      return json({ error: 'Sólo la service role o un admin pueden mandar estos avisos.' }, 403)
    }
  }

  let options: Record<string, unknown> = {}
  try {
    const body: unknown = await req.json()
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      options = body as Record<string, unknown>
    }
  } catch {
    // Sin cuerpo (o con uno que no es JSON): sin opciones.
  }

  try {
    const startedAt = new Date()
    const { noche, notices, info } = await build({ db, now: startedAt, options })
    const sender = pickSender()
    const report = await deliver(notices, sender)

    if (report.sentNoticeIds.length > 0) {
      const { error } = await db.rpc('cerrar_avisos', { p_avisos: report.sentNoticeIds })
      if (error) throw error
    }
    if (report.invalidTokens.length > 0) {
      const { error } = await db
        .from('dispositivos_push')
        .delete()
        .in('token', report.invalidTokens)
      if (error) throw error
    }

    // Avisos de cambio que se dieron por perdidos en esta pasada: la actuación empezó y
    // nunca salieron. Quedan en `avisos_enviados.fallido_en`; acá se dejan en el log.
    const { data: lost, error: lostError } = await db.rpc('avisos_fallidos_desde', {
      p_desde: startedAt.toISOString(),
    })
    if (lostError) throw lostError
    if (lost > 0) console.error(`Avisos de cambio que no salieron antes de la actuación: ${lost}`)

    return json({
      noche,
      simulacro: sender.dryRun,
      ...info,
      avisos: notices.length,
      enviados: report.sent,
      fallidos: report.failed,
      perdidos: lost,
      tokens_borrados: report.invalidTokens.length,
      // En simulacro se devuelve lo que se habría mandado, para poder mirarlo.
      ...(sender.dryRun
        ? {
            detalle: notices.map((notice) => ({
              dispositivo: maskToken(notice.token),
              idioma: notice.language,
              titulo: notice.title,
              cuerpo: notice.body,
              ruta: notice.route,
            })),
          }
        : {}),
    })
  } catch (error) {
    console.error(error)
    const message = error instanceof Error ? error.message : JSON.stringify(error)
    return json({ error: message }, 500)
  }
}
