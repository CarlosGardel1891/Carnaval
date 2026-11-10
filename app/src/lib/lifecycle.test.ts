import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusManager, QueryClient, QueryObserver } from '@tanstack/react-query'
import { nightActsQuery, REFRESH_MS } from '../features/today/useNightActs'
import { fetchNightActs } from './api'
import { initLifecycle } from './lifecycle'

type Listener = (event: never) => void

const native = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  minimizeApp: vi.fn(() => Promise.resolve()),
}))

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (event: string, listener: Listener) => {
      native.listeners.set(event, listener)
      return Promise.resolve({ remove: () => Promise.resolve() })
    },
    minimizeApp: native.minimizeApp,
  },
}))
vi.mock('./api')

const emit = (event: string, data: unknown) => native.listeners.get(event)?.(data as never)

describe('ciclo de vida de la app', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2027-01-28T21:00:00-03:00'))
    vi.mocked(fetchNightActs).mockResolvedValue([])
    initLifecycle()
  })
  afterEach(() => {
    focusManager.setFocused(undefined)
    native.listeners.clear()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('«al frente» sale del evento de @capacitor/app', () => {
    emit('appStateChange', { isActive: false })
    expect(focusManager.isFocused()).toBe(false)
    emit('appStateChange', { isActive: true })
    expect(focusManager.isFocused()).toBe(true)
  })

  it('la grilla se vuelve a pedir cada 5 minutos sólo con la app al frente, y al volver', async () => {
    const queryClient = new QueryClient()
    queryClient.mount()
    const observer = new QueryObserver(queryClient, nightActsQuery('2027-01-28'))
    const unsubscribe = observer.subscribe(() => {})

    await vi.advanceTimersByTimeAsync(0)
    expect(fetchNightActs).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(REFRESH_MS)
    expect(fetchNightActs).toHaveBeenCalledTimes(2)

    // En segundo plano, nada: ni a los 5 minutos ni a los 20.
    emit('appStateChange', { isActive: false })
    await vi.advanceTimersByTimeAsync(4 * REFRESH_MS)
    expect(fetchNightActs).toHaveBeenCalledTimes(2)

    // Al volver, se refresca enseguida y retoma el ritmo.
    emit('appStateChange', { isActive: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchNightActs).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(REFRESH_MS)
    expect(fetchNightActs).toHaveBeenCalledTimes(4)

    unsubscribe()
    queryClient.unmount()
  })

  it('volver enseguida no vuelve a pedir lo que tiene menos de un minuto', async () => {
    const queryClient = new QueryClient()
    queryClient.mount()
    const observer = new QueryObserver(queryClient, nightActsQuery('2027-01-28'))
    const unsubscribe = observer.subscribe(() => {})
    await vi.advanceTimersByTimeAsync(0)

    emit('appStateChange', { isActive: false })
    await vi.advanceTimersByTimeAsync(20_000)
    emit('appStateChange', { isActive: true })
    await vi.advanceTimersByTimeAsync(0)
    expect(fetchNightActs).toHaveBeenCalledTimes(1)

    unsubscribe()
    queryClient.unmount()
  })

  it('el botón «atrás» vuelve en el historial y, si no hay adónde, minimiza la app', () => {
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})

    emit('backButton', { canGoBack: true })
    expect(back).toHaveBeenCalledTimes(1)
    expect(native.minimizeApp).not.toHaveBeenCalled()

    emit('backButton', { canGoBack: false })
    expect(back).toHaveBeenCalledTimes(1)
    expect(native.minimizeApp).toHaveBeenCalledTimes(1)
    back.mockRestore()
  })
})
