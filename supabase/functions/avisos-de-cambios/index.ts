// Cambios y suspensiones (decisión 48). Vacía la cola que llena el trigger de `actuaciones`
// y manda un aviso por dispositivo con todo lo suyo. Espera a que una actuación lleve un
// minuto sin tocarse (ventana de calma), salvo que el pedido traiga `{"sin_espera": true}`:
// lo usa quien ya terminó de cargar y quiere avisar enseguida, como «suspender noche».
// Además de la service role la puede llamar un admin con su sesión: es el botón del panel
// (decisión 72).
import { nocheLogica } from '../../../packages/shared/src/dates.ts'
import { buildChangeNotices } from '../../../packages/shared/src/notices.ts'
import { handle } from '../_shared/run.ts'

const CALM_MS = 60_000

Deno.serve((req) =>
  handle(
    req,
    async ({ db, now, options }) => {
      const noche = nocheLogica(now)
      const calm = options.sin_espera === true ? 0 : CALM_MS
      const { data, error } = await db.rpc('tomar_avisos_de_cambios', {
        p_noche: noche,
        p_hasta: new Date(now.getTime() - calm).toISOString(),
      })
      if (error) throw error
      return { noche, notices: buildChangeNotices(data, noche) }
    },
    { allowAdmin: true },
  ),
)
