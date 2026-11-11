import { instantInMontevideo } from './dates.ts'

/**
 * La hora estimada del Desfile de Llamadas (decisiones 7 y 63). Son funciones puras: la app
 * las usa en el teléfono, sin red, y las Edge Functions para el aviso del día.
 *
 * La regla: la primera comparsa sale a las 20:00 y cada una larga 10 minutos y 150 metros
 * después de la anterior. De ahí sale también la velocidad de marcha, 150 m cada 10 minutos.
 * Todo lo que devuelven es una estimación: quien lo muestra tiene que decirlo.
 */

/** Los valores de la decisión 7, para un evento que no trae los suyos. */
export const PARADE_DEFAULTS = {
  /** Hora de Montevideo a la que sale la primera comparsa. */
  start: '20:00',
  /** Minutos entre la salida de una comparsa y la de la siguiente. */
  intervalMin: 10,
  /** Metros que separan a una comparsa de la siguiente. */
  gapM: 150,
} as const

export interface ParadeRules {
  /** `HH:MM` (o `HH:MM:SS`), hora de Montevideo. */
  start: string
  intervalMin: number
  gapM: number
  /** Minutos de atraso que lleva el desfile: corre todas las horas. */
  delayMin: number
}

/** Lo que un evento de la base dice de su desfile. Todo puede faltar. */
export interface ParadeSettings {
  desfile_inicio?: string | null
  desfile_intervalo_min?: number | null
  desfile_separacion_m?: number | null
  desfile_atraso_min?: number | null
}

/** Las reglas de un desfile: las del evento y, en lo que no diga, las de la decisión 7. */
export function paradeRules(event: ParadeSettings = {}): ParadeRules {
  return {
    start: event.desfile_inicio ?? PARADE_DEFAULTS.start,
    intervalMin: event.desfile_intervalo_min ?? PARADE_DEFAULTS.intervalMin,
    gapM: event.desfile_separacion_m ?? PARADE_DEFAULTS.gapM,
    delayMin: event.desfile_atraso_min ?? 0,
  }
}

function checkRules({ intervalMin, gapM }: ParadeRules): void {
  if (!(intervalMin > 0) || !(gapM > 0)) {
    throw new RangeError('El intervalo y la separación entre comparsas tienen que ser positivos.')
  }
}

/** Metros por minuto a los que marcha el desfile: la separación sobre el intervalo. */
export function marchSpeed(rules: ParadeRules): number {
  checkRules(rules)
  return rules.gapM / rules.intervalMin
}

/**
 * El instante en que sale la primera comparsa en una noche (`YYYY-MM-DD`), con el atraso
 * incluido. La noche es la noche lógica: una salida antes de las 06:00 es de la madrugada
 * siguiente.
 */
export function paradeStart(noche: string, rules: ParadeRules): Date {
  const start = instantInMontevideo(noche, rules.start)
  const afterMidnight = Number(rules.start.slice(0, 2)) < 6
  return new Date(
    start.getTime() + (afterMidnight ? 24 * 60 : 0) * 60_000 + rules.delayMin * 60_000,
  )
}

/** A qué hora sale la comparsa que va en esa posición (la primera es la 1). */
export function departureTime(noche: string, position: number, rules: ParadeRules): Date {
  checkRules(rules)
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError(`La posición en el desfile empieza en 1: ${position}`)
  }
  return new Date(paradeStart(noche, rules).getTime() + (position - 1) * rules.intervalMin * 60_000)
}

/**
 * A qué hora pasa esa comparsa por un punto que está a `distanceM` metros de la salida,
 * medidos sobre el recorrido.
 */
export function passTime(
  noche: string,
  position: number,
  distanceM: number,
  rules: ParadeRules,
): Date {
  if (!(distanceM >= 0)) {
    throw new RangeError(`La distancia desde la salida no puede ser negativa: ${distanceM}`)
  }
  const minutes = distanceM / marchSpeed(rules)
  return new Date(departureTime(noche, position, rules).getTime() + minutes * 60_000)
}
