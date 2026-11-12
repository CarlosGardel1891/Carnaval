import { afterEach, describe, expect, it, vi } from 'vitest'
import { initErrorReporting, releaseName, reportError, scrub, setErrorReporter } from './errors'

afterEach(() => {
  setErrorReporter(null)
  vi.unstubAllEnvs()
})

describe('el reporte de errores', () => {
  it('sin DSN no arranca ni carga nada', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', '')
    expect(await initErrorReporting()).toBe(false)
    expect(() => reportError(new Error('nadie escucha'))).not.toThrow()
  })

  it('le avisa a quien esté escuchando, y nunca tira', () => {
    const seen: unknown[] = []
    setErrorReporter((error) => seen.push(error))
    const error = new Error('se rompió')
    reportError(error)
    expect(seen).toEqual([error])

    setErrorReporter(() => {
      throw new Error('el reporte también se rompió')
    })
    expect(() => reportError(error)).not.toThrow()
  })

  it('identifica el build por su versión y su número', () => {
    expect(releaseName()).toBe(`carnavalero@${__APP_VERSION__}+${__APP_BUILD__}`)
  })
})

describe('scrub', () => {
  it('saca al usuario, los datos sueltos y todo lo del pedido menos la dirección sin parámetros', () => {
    const clean = scrub({
      message: 'falló',
      user: { id: 'u1', ip_address: '10.0.0.1' },
      extra: { seguidos: [1, 2] },
      request: {
        url: 'https://localhost/conjuntos/caballeros?mios=1#arriba',
        cookies: 'sb=secreto',
        headers: { Authorization: 'Bearer x' },
      },
    })
    expect(clean).toEqual({
      message: 'falló',
      request: { url: 'https://localhost/conjuntos/caballeros' },
    })
  })

  it('sin pedido, no inventa uno', () => {
    expect(scrub({ message: 'falló' })).toEqual({ message: 'falló' })
  })
})
