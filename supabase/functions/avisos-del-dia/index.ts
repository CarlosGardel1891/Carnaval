// «Tu conjunto actúa hoy» (decisión 47). La despierta un cron cada 30 minutos; la hora la
// decide esta función con la zona de Montevideo, no la programación. Fuera de las 12:00 a
// las 19:00 no hace nada, salvo que el pedido traiga `{"forzar": true}` (para probarla).
import { nocheLogica } from '../../../packages/shared/src/dates.ts'
import { buildDailyNotices, isDailyNoticeWindow } from '../../../packages/shared/src/notices.ts'
import { handle } from '../_shared/run.ts'

Deno.serve((req) =>
  handle(
    req,
    async ({ db, now, options }) => {
      const noche = nocheLogica(now)
      if (!isDailyNoticeWindow(now) && options.forzar !== true) {
        return { noche, notices: [], info: { fuera_de_horario: true } }
      }
      const { data, error } = await db.rpc('tomar_avisos_del_dia', { p_noche: noche })
      if (error) throw error
      return { noche, notices: buildDailyNotices(data) }
    },
    { task: 'avisos-del-dia' },
  ),
)
