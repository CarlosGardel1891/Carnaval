import { instantInMontevideo } from '@cuerda/shared'

/**
 * El reloj de la app. Normalmente es el del teléfono. Para probar lo que depende de la fecha
 * (el modo Llamadas, la noche lógica) se lo puede correr (decisión 66):
 *
 * - en la URL: `?ahora=2027-02-05T21:00` (hora de Montevideo); `?ahora=` vuelve a la real;
 * - o al compilar, con `VITE_AHORA=2027-02-05T21:00`, para el emulador.
 *
 * El reloj simulado arranca en esa hora y sigue corriendo. Sólo vale en desarrollo: en
 * `pnpm dev` o cuando la app apunta al Supabase local. Una app que apunta a un proyecto
 * remoto lo ignora, lo pida quien lo pida.
 */

const STORAGE_KEY = 'cuerda-ahora'
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '[::1]', '10.0.2.2']

let offsetMs = 0

/** El instante de ahora, según el reloj de la app. */
export function now(): Date {
  return new Date(Date.now() + offsetMs)
}

/**
 * Cuánto está corrido el reloj, en milisegundos (0 si no lo está). Lo que guarda horas del
 * reloj de verdad, como cuándo se bajó una consulta, se compara restando esto.
 */
export function clockOffsetMs(): number {
  return offsetMs
}

/** Si el reloj está corrido: la app lo avisa en pantalla. */
export function isClockSimulated(): boolean {
  return offsetMs !== 0
}

interface ClockEnv {
  DEV?: boolean
  VITE_SUPABASE_URL?: string
  VITE_AHORA?: string
}

/** Sólo en desarrollo: con `pnpm dev`, o si la base es la local. */
export function simulationAllowed(env: ClockEnv): boolean {
  if (env.DEV) return true
  try {
    return LOCAL_HOSTS.includes(new URL(env.VITE_SUPABASE_URL ?? '').hostname)
  } catch {
    return false
  }
}

/** `AAAA-MM-DDTHH:MM`, hora de Montevideo. Null si no tiene esa forma. */
export function parseSimulatedTime(value: string): Date | null {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(value)
  if (!match) return null
  try {
    return instantInMontevideo(match[1]!, match[2]!)
  } catch {
    return null
  }
}

interface ClockSources {
  search: string
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  env: ClockEnv
}

/**
 * Pone el reloj en hora al arrancar. Manda la URL; si no dice nada, lo que quedó de antes en
 * esta sesión; si no, `VITE_AHORA`. Devuelve si quedó simulado.
 */
export function initClock({ search, storage, env }: ClockSources): boolean {
  offsetMs = 0
  if (!simulationAllowed(env)) return false

  const params = new URLSearchParams(search)
  if (params.has('ahora')) {
    const target = parseSimulatedTime(params.get('ahora') ?? '')
    if (target) {
      offsetMs = target.getTime() - Date.now()
      storage.setItem(STORAGE_KEY, String(offsetMs))
    } else {
      // `?ahora=` vacío (o mal escrito): vuelve a la hora real.
      storage.removeItem(STORAGE_KEY)
    }
    return offsetMs !== 0
  }

  const saved = Number(storage.getItem(STORAGE_KEY))
  if (Number.isFinite(saved) && saved !== 0) {
    offsetMs = saved
    return true
  }
  const fromBuild = env.VITE_AHORA ? parseSimulatedTime(env.VITE_AHORA) : null
  if (fromBuild) offsetMs = fromBuild.getTime() - Date.now()
  return offsetMs !== 0
}
