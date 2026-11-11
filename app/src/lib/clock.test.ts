import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nocheLogica } from '@cuerda/shared'
import { initClock, isClockSimulated, now, parseSimulatedTime, simulationAllowed } from './clock'

const DEV = { DEV: true }
const LOCAL = { DEV: false, VITE_SUPABASE_URL: 'http://127.0.0.1:55321' }
const REMOTE = { DEV: false, VITE_SUPABASE_URL: 'https://abcd.supabase.co' }

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  }
}

describe('reloj de la app', () => {
  const systemTz = process.env.TZ
  beforeEach(() => {
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-11T15:00:00-03:00'))
  })
  afterEach(() => {
    initClock({ search: '', storage: memoryStorage(), env: REMOTE })
    vi.useRealTimers()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('sin nada que lo corra, es el reloj del teléfono', () => {
    expect(initClock({ search: '', storage: memoryStorage(), env: DEV })).toBe(false)
    expect(isClockSimulated()).toBe(false)
    expect(now().toISOString()).toBe('2026-11-11T18:00:00.000Z')
  })

  it('con ?ahora= arranca en esa hora de Montevideo, esté donde esté el teléfono', () => {
    const storage = memoryStorage()
    expect(initClock({ search: '?ahora=2027-02-05T21:00', storage, env: DEV })).toBe(true)
    expect(isClockSimulated()).toBe(true)
    expect(now().toISOString()).toBe('2027-02-06T00:00:00.000Z')
    expect(nocheLogica(now())).toBe('2027-02-05')
  })

  it('el reloj simulado sigue corriendo', () => {
    initClock({ search: '?ahora=2027-02-05T23:50', storage: memoryStorage(), env: DEV })
    vi.advanceTimersByTime(45 * 60_000)
    // Las 00:35 del sábado: sigue siendo la noche del viernes.
    expect(now().toISOString()).toBe('2027-02-06T03:35:00.000Z')
    expect(nocheLogica(now())).toBe('2027-02-05')
  })

  it('se conserva al navegar dentro de la sesión, y ?ahora= vacío vuelve a la hora real', () => {
    const storage = memoryStorage()
    initClock({ search: '?ahora=2027-02-05T21:00', storage, env: DEV })
    expect(initClock({ search: '?noche=2027-02-06', storage, env: DEV })).toBe(true)
    expect(now().toISOString()).toBe('2027-02-06T00:00:00.000Z')

    expect(initClock({ search: '?ahora=', storage, env: DEV })).toBe(false)
    expect(initClock({ search: '', storage, env: DEV })).toBe(false)
    expect(now().toISOString()).toBe('2026-11-11T18:00:00.000Z')
  })

  it('una fecha mal escrita no corre el reloj', () => {
    for (const bad of ['?ahora=mañana', '?ahora=2027-02-05', '?ahora=2027-02-31T25:00']) {
      expect(initClock({ search: bad, storage: memoryStorage(), env: DEV })).toBe(false)
    }
    expect(parseSimulatedTime('2027-02-05T21:00')?.toISOString()).toBe('2027-02-06T00:00:00.000Z')
    expect(parseSimulatedTime('05/02/2027 21:00')).toBeNull()
  })

  it('VITE_AHORA lo fija al compilar, para el emulador; la URL manda sobre eso', () => {
    const env = { ...LOCAL, VITE_AHORA: '2027-02-06T20:30' }
    expect(initClock({ search: '', storage: memoryStorage(), env })).toBe(true)
    expect(nocheLogica(now())).toBe('2027-02-06')
    initClock({ search: '?ahora=2027-02-05T21:00', storage: memoryStorage(), env })
    expect(nocheLogica(now())).toBe('2027-02-05')
  })

  it('vale en desarrollo y con la base local, también desde el emulador', () => {
    expect(simulationAllowed(DEV)).toBe(true)
    expect(simulationAllowed(LOCAL)).toBe(true)
    expect(simulationAllowed({ VITE_SUPABASE_URL: 'http://10.0.2.2:55321' })).toBe(true)
    expect(simulationAllowed({ VITE_SUPABASE_URL: 'http://localhost:55321' })).toBe(true)
  })

  it('una app que apunta a un proyecto remoto lo ignora, lo pida quien lo pida', () => {
    expect(simulationAllowed(REMOTE)).toBe(false)
    expect(simulationAllowed({})).toBe(false)
    const storage = memoryStorage()
    storage.setItem('cuerda-ahora', '999999999')
    const env = { ...REMOTE, VITE_AHORA: '2027-02-05T21:00' }
    expect(initClock({ search: '?ahora=2027-02-05T21:00', storage, env })).toBe(false)
    expect(isClockSimulated()).toBe(false)
    expect(now().toISOString()).toBe('2026-11-11T18:00:00.000Z')
  })
})
