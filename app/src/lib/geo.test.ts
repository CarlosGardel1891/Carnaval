import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { APPROXIMATE_FROM_M, currentPosition, hasLocationPermission, LocationError } from './geo'

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
    getCurrentPosition: vi.fn(),
  },
}))

const permission = (state: 'granted' | 'denied' | 'prompt', coarse = state) => ({
  location: state,
  coarseLocation: coarse,
})

const positionWithin = (accuracy: number) =>
  ({ timestamp: 0, coords: { latitude: -34.9, longitude: -56.2, accuracy } }) as Awaited<
    ReturnType<typeof Geolocation.getCurrentPosition>
  >
const position = positionWithin(12)

const HERE = { lat: -34.9, lng: -56.2 }
const highAccuracy = () =>
  vi.mocked(Geolocation.getCurrentPosition).mock.lastCall?.[0]?.enableHighAccuracy

const reasonOf = async (attempt: Promise<unknown>) => {
  const error = await attempt.then(
    () => null,
    (e: unknown) => e,
  )
  expect(error).toBeInstanceOf(LocationError)
  return (error as LocationError).reason
}

describe('ubicación', () => {
  const native = vi.spyOn(Capacitor, 'isNativePlatform')

  beforeEach(() => {
    native.mockReturnValue(true)
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue(permission('prompt'))
    vi.mocked(Geolocation.requestPermissions).mockResolvedValue(permission('granted'))
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(position)
  })
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('pide el permiso si falta, preciso y aproximado a la vez, y devuelve la posición', async () => {
    await expect(currentPosition()).resolves.toEqual({ coords: HERE, approximate: false })
    expect(Geolocation.requestPermissions).toHaveBeenCalledTimes(1)
    // Sin argumentos: el plugin pide los dos permisos y Android deja elegir.
    expect(Geolocation.requestPermissions).toHaveBeenCalledWith()
    // Con el permiso preciso se pide la mejor posición.
    expect(highAccuracy()).toBe(true)
  })

  it('si el usuario elige la aproximada, anda igual y la posición sale marcada', async () => {
    vi.mocked(Geolocation.requestPermissions).mockResolvedValue(permission('denied', 'granted'))
    await expect(currentPosition()).resolves.toEqual({ coords: HERE, approximate: true })
    // Sin el permiso preciso no se pide alta precisión: el plugin volvería a preguntar.
    expect(highAccuracy()).toBe(false)
  })

  it('si ya hay permiso no lo vuelve a pedir, sea preciso o aproximado', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue(permission('denied', 'granted'))
    await expect(currentPosition()).resolves.toEqual({ coords: HERE, approximate: true })
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue(permission('granted'))
    await expect(currentPosition()).resolves.toEqual({ coords: HERE, approximate: false })
    expect(Geolocation.requestPermissions).not.toHaveBeenCalled()
  })

  it('con permiso preciso pero un margen grande (iOS sin «ubicación exacta»), es aproximada', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue(permission('granted'))
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(
      positionWithin(APPROXIMATE_FROM_M + 1),
    )
    await expect(currentPosition()).resolves.toEqual({ coords: HERE, approximate: true })
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue(positionWithin(APPROXIMATE_FROM_M))
    await expect(currentPosition()).resolves.toEqual({ coords: HERE, approximate: false })
  })

  it('permiso negado: `denied`, sin consultar la posición', async () => {
    vi.mocked(Geolocation.requestPermissions).mockResolvedValue(permission('denied'))
    expect(await reasonOf(currentPosition())).toBe('denied')
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled()
  })

  it('ubicación del teléfono apagada o demora: `unavailable`', async () => {
    vi.mocked(Geolocation.checkPermissions).mockRejectedValue({ code: 'OS-PLUG-GLOC-0007' })
    expect(await reasonOf(currentPosition())).toBe('unavailable')

    vi.mocked(Geolocation.checkPermissions).mockResolvedValue(permission('granted'))
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue({ code: 'OS-PLUG-GLOC-0010' })
    expect(await reasonOf(currentPosition())).toBe('unavailable')
  })

  it('en la web el permiso lo pide el navegador al consultar la posición', async () => {
    native.mockReturnValue(false)
    await expect(currentPosition()).resolves.toEqual({ coords: HERE, approximate: false })
    expect(Geolocation.checkPermissions).not.toHaveBeenCalled()
    expect(Geolocation.requestPermissions).not.toHaveBeenCalled()

    // GeolocationPositionError: 1 es permiso negado; 3, demora.
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue({ code: 1 })
    expect(await reasonOf(currentPosition())).toBe('denied')
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue({ code: 3 })
    expect(await reasonOf(currentPosition())).toBe('unavailable')
  })

  it('hasLocationPermission no pregunta nada y nunca falla', async () => {
    await expect(hasLocationPermission()).resolves.toBe(false)
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue(permission('granted'))
    await expect(hasLocationPermission()).resolves.toBe(true)
    vi.mocked(Geolocation.checkPermissions).mockRejectedValue(new Error('sin API de permisos'))
    await expect(hasLocationPermission()).resolves.toBe(false)
    expect(Geolocation.requestPermissions).not.toHaveBeenCalled()
  })
})
