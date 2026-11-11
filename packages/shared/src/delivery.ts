import type { Notice } from './notices.ts'

/**
 * El envío de los avisos, separado de quién recibe qué (`notices.ts`). `deliver` recorre las
 * notificaciones, las manda con el `Sender` que le pasen y devuelve qué salió, qué no y
 * qué tokens hay que borrar. No sabe de Firebase ni de la base: se prueba con un `Sender`
 * de mentira.
 */

/**
 * - `sent`: el servicio de push la aceptó.
 * - `invalid-token`: el token ya no existe (app desinstalada, token viejo): hay que borrarlo.
 * - `failed`: no salió por un error que no es del token (red, límite, error del servicio).
 * - `simulated`: simulacro; no se mandó nada.
 */
export type SendResult = 'sent' | 'invalid-token' | 'failed' | 'simulated'

export interface Sender {
  /** Si es un simulacro: arma todo y no manda nada. */
  readonly dryRun: boolean
  send(notice: Notice): Promise<SendResult>
}

export interface DeliveryReport {
  sent: number
  failed: number
  simulated: number
  /** Avisos (`avisos_enviados.id`) que llegaron a algún dispositivo: se cierran. */
  sentNoticeIds: number[]
  /** Tokens que el servicio de push rechazó como inexistentes: se borran. */
  invalidTokens: string[]
}

/** Sin Firebase configurado: no manda nada y lo dice. */
export const dryRunSender: Sender = {
  dryRun: true,
  send: () => Promise.resolve('simulated'),
}

/** Cuántas notificaciones se mandan a la vez. */
const CONCURRENCY = 8

export async function deliver(notices: Notice[], sender: Sender): Promise<DeliveryReport> {
  const report: DeliveryReport = {
    sent: 0,
    failed: 0,
    simulated: 0,
    sentNoticeIds: [],
    invalidTokens: [],
  }
  const sentIds = new Set<number>()
  const invalid = new Set<string>()
  let next = 0

  const worker = async () => {
    for (let notice = notices[next++]; notice; notice = notices[next++]) {
      let result: SendResult
      try {
        result = await sender.send(notice)
      } catch {
        // Un envío que explota no frena a los demás.
        result = 'failed'
      }
      if (result === 'sent') {
        report.sent++
        for (const id of notice.noticeIds) sentIds.add(id)
      } else if (result === 'simulated') {
        report.simulated++
      } else {
        report.failed++
        if (result === 'invalid-token') invalid.add(notice.token)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, notices.length) }, worker))

  report.sentNoticeIds = [...sentIds].sort((a, b) => a - b)
  report.invalidTokens = [...invalid]
  return report
}
