// Estado del sistema (decisión 89), para un monitor externo: responde 200 si todas las tareas
// programadas dejaron su latido a tiempo y 503 si alguna está caída o nunca corrió. No pide
// ninguna key y no devuelve nada privado: sólo el nombre de cada tarea y hace cuánto corrió.
// Quien lo consulta (UptimeRobot, healthchecks.io o similar) avisa por mail cuando da 503.
import { createClient } from 'npm:@supabase/supabase-js@2'
import type { Database } from '../../../packages/shared/src/database.types.ts'
import { serverKeys } from '../_shared/run.ts'

const respond = (body: unknown, status: number) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  })

Deno.serve(async (req) => {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST') {
    return respond({ error: 'Sólo GET.' }, 405)
  }
  const url = Deno.env.get('SUPABASE_URL')
  const [key] = serverKeys()
  if (!url || !key) return respond({ ok: false, error: 'Faltan las variables de Supabase.' }, 500)

  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await db.rpc('estado_del_sistema')
  if (error) return respond({ ok: false, error: 'No se pudo leer el estado.' }, 503)

  const tareas = data.map((row) => ({
    tarea: row.tarea,
    al_dia: row.al_dia,
    ultimo_ok: row.ultimo_ok,
    minutos: row.minutos,
    limite_min: row.limite_min,
  }))
  const ok = tareas.every((row) => row.al_dia)
  return respond({ ok, tareas }, ok ? 200 : 503)
})
