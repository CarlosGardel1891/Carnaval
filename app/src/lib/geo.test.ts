import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Capacitor } from '@capacitor/core'
import { Geolocation } from '@capacitor/geolocation'
import { currentPosition, hasLocationPermission, LocationError } from './geo'

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

const position = { timestamp: 0, coords: { latitude: -34.9, longitude: -56.2 } } as Awaited<
  ReturnType<typeof Geolocation.getCurrentPosition>
>

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

  it('pide el permiso si falta y devuelve la posición', async () => {
    await expect(currentPosition()).resolves.toEqual({ lat: -34.9, lng: -56.2 })
    expect(Geolocation.requestPermissions).toHaveBeenCalledTimes(1)
  })

  it('si ya hay permiso no lo vuelve a pedir; alcanza con la ubicación aproximada', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue(permission('denied', 'granted'))
    await expect(currentPosition()).resolves.toEqual({ lat: -34.9, lng: -56.2 })
    expect(Geolocation.requestPermissions).not.toHaveBeenCalled()
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
    await expect(currentPosition()).resolves.toEqual({ lat: -34.9, lng: -56.2 })
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
