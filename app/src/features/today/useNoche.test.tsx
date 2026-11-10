import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { isIsoDate, useNoche } from './useNoche'

const wrapperAt = (path: string) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  }

describe('useNoche', () => {
  const systemTz = process.env.TZ

  beforeEach(() => {
    // El teléfono en otra zona: la noche sale igual de la hora de Montevideo.
    process.env.TZ = 'Asia/Tokyo'
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    if (systemTz === undefined) delete process.env.TZ
    else process.env.TZ = systemTz
  })

  it('a las 02:00 muestra la noche anterior', () => {
    vi.setSystemTime(new Date('2027-01-29T02:00:00-03:00'))
    const { result } = renderHook(() => useNoche(), { wrapper: wrapperAt('/') })
    expect(result.current.noche).toBe('2027-01-28')
    expect(result.current.isTonight).toBe(true)
  })

  it('a las 05:59 sigue la noche anterior y a las 06:00 cambia sola', () => {
    vi.setSystemTime(new Date('2027-01-29T05:59:00-03:00'))
    const { result } = renderHook(() => useNoche(), { wrapper: wrapperAt('/') })
    expect(result.current.noche).toBe('2027-01-28')

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.noche).toBe('2027-01-29')
    expect(result.current.isTonight).toBe(true)
  })

  it('con ?noche= abre esa noche y sabe que no es la de hoy', () => {
    vi.setSystemTime(new Date('2027-01-29T21:00:00-03:00'))
    const { result } = renderHook(() => useNoche(), { wrapper: wrapperAt('/?noche=2027-02-05') })
    expect(result.current.noche).toBe('2027-02-05')
    expect(result.current.isTonight).toBe(false)
  })

  it('ignora un ?noche= que no es una fecha', () => {
    vi.setSystemTime(new Date('2027-01-29T21:00:00-03:00'))
    const { result } = renderHook(() => useNoche(), { wrapper: wrapperAt('/?noche=2027-02-31') })
    expect(result.current.noche).toBe('2027-01-29')
  })
})

describe('isIsoDate', () => {
  it('acepta sólo fechas reales en formato YYYY-MM-DD', () => {
    expect(isIsoDate('2027-01-28')).toBe(true)
    expect(isIsoDate('2027-02-31')).toBe(false)
    expect(isIsoDate('28/01/2027')).toBe(false)
    expect(isIsoDate('')).toBe(false)
  })
})
