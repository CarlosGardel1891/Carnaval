import { describe, expect, it } from 'vitest'
import { deliver, dryRunSender, type SendResult, type Sender } from './delivery'
import type { Notice } from './notices'

function notice(token: string, noticeIds: number[]): Notice {
  return { token, language: 'es', title: 't', body: 'b', route: '/', noticeIds }
}

/** Un sender de mentira: responde lo que se le diga para cada token. */
function fakeSender(results: Record<string, SendResult | Error>): Sender & { sentTo: string[] } {
  const sentTo: string[] = []
  return {
    dryRun: false,
    sentTo,
    send: ({ token }) => {
      sentTo.push(token)
      const result = results[token] ?? 'sent'
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result)
    },
  }
}

describe('deliver', () => {
  it('manda cada notificación una vez y junta los avisos que salieron', async () => {
    const sender = fakeSender({})
    const report = await deliver([notice('a', [1, 2]), notice('b', [3])], sender)
    expect(sender.sentTo.sort()).toEqual(['a', 'b'])
    expect(report).toEqual({
      sent: 2,
      failed: 0,
      simulated: 0,
      sentNoticeIds: [1, 2, 3],
      invalidTokens: [],
    })
  })

  it('un token rechazado se devuelve para borrarlo y su aviso no se cierra', async () => {
    const report = await deliver(
      [notice('viejo', [1]), notice('bueno', [2])],
      fakeSender({ viejo: 'invalid-token' }),
    )
    expect(report).toMatchObject({
      sent: 1,
      failed: 1,
      sentNoticeIds: [2],
      invalidTokens: ['viejo'],
    })
  })

  it('un error transitorio no borra el token ni cierra el aviso', async () => {
    const report = await deliver([notice('a', [1])], fakeSender({ a: 'failed' }))
    expect(report).toMatchObject({ sent: 0, failed: 1, sentNoticeIds: [], invalidTokens: [] })
  })

  it('un envío que explota no frena a los demás', async () => {
    const report = await deliver(
      [notice('roto', [1]), notice('b', [2]), notice('c', [3])],
      fakeSender({ roto: new Error('sin red') }),
    )
    expect(report).toMatchObject({ sent: 2, failed: 1, sentNoticeIds: [2, 3] })
  })

  it('un aviso con dos teléfonos se cierra si llega a alguno', async () => {
    const report = await deliver(
      [notice('tel-viejo', [7]), notice('tel-nuevo', [7])],
      fakeSender({ 'tel-viejo': 'invalid-token' }),
    )
    expect(report).toMatchObject({ sentNoticeIds: [7], invalidTokens: ['tel-viejo'] })
  })

  it('en simulacro no manda nada ni cierra nada', async () => {
    const report = await deliver([notice('a', [1]), notice('b', [2])], dryRunSender)
    expect(report).toEqual({
      sent: 0,
      failed: 0,
      simulated: 2,
      sentNoticeIds: [],
      invalidTokens: [],
    })
  })

  it('con muchas notificaciones las manda todas, una sola vez cada una', async () => {
    const sender = fakeSender({})
    const notices = Array.from({ length: 50 }, (_unused, i) => notice(`t${i}`, [i]))
    const report = await deliver(notices, sender)
    expect(report.sent).toBe(50)
    expect(new Set(sender.sentTo).size).toBe(50)
    expect(sender.sentTo).toHaveLength(50)
  })

  it('sin notificaciones no hace nada', async () => {
    expect(await deliver([], fakeSender({}))).toMatchObject({ sent: 0, failed: 0 })
  })
})
