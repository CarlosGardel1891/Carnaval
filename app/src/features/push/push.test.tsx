import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n from '../../i18n'
import {
  fetchFollowed,
  fetchGroup,
  fetchNightActs,
  getUserId,
  registerPushDevice,
  type GroupDetail,
} from '../../lib/api'
import {
  checkPushPermission,
  ensureNoticeChannel,
  getPushToken,
  listenToPush,
  requestPushPermission,
  type PushListeners,
} from '../../lib/push'
import { nightFixture } from '../../test-fixtures'
import { renderApp } from '../../test-utils'
import { ASKED_STORAGE_KEY, safeRoute } from './usePush'

vi.mock('../../lib/api')

// El plugin de push, de mentira. `enabled` es lo que en la app decide `VITE_PUSH_ENABLED`
// y que sea un teléfono.
const device = vi.hoisted(() => ({ enabled: true }))
vi.mock('../../lib/push', () => ({
  get pushEnabled() {
    return device.enabled
  },
  pushPlatform: () => 'android',
  checkPushPermission: vi.fn(),
  requestPushPermission: vi.fn(),
  getPushToken: vi.fn(),
  ensureNoticeChannel: vi.fn(),
  listenToPush: vi.fn(),
}))

const GROUP: GroupDetail = {
  id: 10,
  slug: 'la-gran-muneca',
  nombre: 'La Gran Muñeca',
  categoria: 'murga',
  barrio: null,
  bio: null,
  instagram: null,
  facebook: null,
  foto_url: null,
  temporadas: [],
}

const ASK = '¿Te avisamos cuando actúe?'
let listeners: PushListeners | undefined

describe('avisos push en la app', () => {
  beforeEach(async () => {
    device.enabled = true
    listeners = undefined
    localStorage.clear()
    vi.mocked(fetchGroup).mockResolvedValue(GROUP)
    vi.mocked(fetchFollowed).mockResolvedValue([10])
    vi.mocked(getUserId).mockResolvedValue('usuario-a')
    vi.mocked(checkPushPermission).mockResolvedValue('prompt')
    vi.mocked(requestPushPermission).mockResolvedValue('granted')
    vi.mocked(getPushToken).mockResolvedValue('token-del-telefono')
    vi.mocked(ensureNoticeChannel).mockResolvedValue()
    vi.mocked(listenToPush).mockImplementation((given) => {
      listeners = given
      return Promise.resolve(() => undefined)
    })
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.resetAllMocks()
  })

  describe('permiso', () => {
    it('abrir la app no pide el permiso ni muestra la tarjeta', async () => {
      vi.mocked(fetchNightActs).mockResolvedValue(nightFixture())
      renderApp('/')
      await screen.findByRole('region', { name: 'Tablado Centro' })
      expect(requestPushPermission).not.toHaveBeenCalled()
      expect(screen.queryByText(ASK)).not.toBeInTheDocument()
      // Sin permiso todavía, tampoco se registra nada.
      expect(registerPushDevice).not.toHaveBeenCalled()
    })

    it('en la ficha de un conjunto que no se sigue no se ofrece nada', async () => {
      vi.mocked(fetchFollowed).mockResolvedValue([])
      renderApp('/conjuntos/la-gran-muneca')
      const follow = await screen.findByRole('button', { name: 'Seguir a La Gran Muñeca' })
      await waitFor(() => expect(follow).toBeEnabled())
      expect(screen.queryByText(ASK)).not.toBeInTheDocument()
    })

    it('después de «Seguir» aparece la tarjeta; el diálogo del sistema, sólo al aceptar', async () => {
      vi.mocked(fetchFollowed).mockResolvedValue([])
      renderApp('/conjuntos/la-gran-muneca')
      const follow = await screen.findByRole('button', { name: 'Seguir a La Gran Muñeca' })
      await waitFor(() => expect(follow).toBeEnabled())

      vi.mocked(fetchFollowed).mockResolvedValue([10])
      await userEvent.click(follow)
      expect(await screen.findByRole('heading', { name: ASK })).toBeInTheDocument()
      expect(requestPushPermission).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole('button', { name: 'Sí, avisame' }))
      expect(requestPushPermission).toHaveBeenCalledTimes(1)
      await waitFor(() =>
        expect(registerPushDevice).toHaveBeenCalledWith('token-del-telefono', 'android', 'es'),
      )
      expect(await screen.findByText(/Avisos activados/)).toBeInTheDocument()
      expect(screen.queryByText(ASK)).not.toBeInTheDocument()
    })

    it('si se niega el permiso no se rompe nada: sigue siguiendo y explica cómo prenderlos', async () => {
      vi.mocked(requestPushPermission).mockResolvedValue('denied')
      renderApp('/conjuntos/la-gran-muneca')
      await userEvent.click(await screen.findByRole('button', { name: 'Sí, avisame' }))

      expect(await screen.findByText(/permití las notificaciones de Cuerda/)).toBeInTheDocument()
      expect(registerPushDevice).not.toHaveBeenCalled()
      expect(getPushToken).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: /^Siguiendo a La Gran Muñeca/ })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      // No hay forma de volver a disparar el diálogo desde la app.
      expect(screen.queryByRole('button', { name: 'Sí, avisame' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Activar avisos' })).not.toBeInTheDocument()
    })

    it('«Ahora no» no pide nada y la app no vuelve a preguntar sola', async () => {
      const first = renderApp('/conjuntos/la-gran-muneca')
      await userEvent.click(await screen.findByRole('button', { name: 'Ahora no' }))
      expect(requestPushPermission).not.toHaveBeenCalled()
      expect(screen.queryByText(ASK)).not.toBeInTheDocument()
      expect(await screen.findByText('Los avisos están apagados.')).toBeInTheDocument()
      await waitFor(() =>
        expect(localStorage.getItem(`CapacitorStorage.${ASKED_STORAGE_KEY}`)).toBe('1'),
      )

      // Otro día, otra ficha: no hay tarjeta, pero sí cómo activarlos.
      first.unmount()
      renderApp('/conjuntos/la-gran-muneca')
      const enable = await screen.findByRole('button', { name: 'Activar avisos' })
      expect(screen.queryByText(ASK)).not.toBeInTheDocument()
      await userEvent.click(enable)
      await waitFor(() => expect(registerPushDevice).toHaveBeenCalledTimes(1))
    })

    it('si falla el registro lo avisa y deja reintentar', async () => {
      vi.mocked(registerPushDevice).mockRejectedValueOnce(new Error('sin red'))
      renderApp('/conjuntos/la-gran-muneca')
      await userEvent.click(await screen.findByRole('button', { name: 'Sí, avisame' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos activar los avisos')
      expect(screen.queryByText(/Avisos activados/)).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Activar avisos' }))
      expect(await screen.findByText(/Avisos activados/)).toBeInTheDocument()
      expect(registerPushDevice).toHaveBeenCalledTimes(2)
    })

    it('en el navegador (o sin Firebase configurado) no aparece nada de avisos', async () => {
      device.enabled = false
      renderApp('/conjuntos/la-gran-muneca')
      await screen.findByRole('button', { name: /^Siguiendo a La Gran Muñeca/ })
      expect(screen.queryByText(ASK)).not.toBeInTheDocument()
      expect(screen.queryByText(/avisos/i)).not.toBeInTheDocument()
      expect(checkPushPermission).not.toHaveBeenCalled()
      expect(listenToPush).not.toHaveBeenCalled()
    })

    it('la tarjeta está en inglés con el idioma en inglés', async () => {
      await i18n.changeLanguage('en')
      renderApp('/conjuntos/la-gran-muneca')
      expect(
        await screen.findByRole('heading', { name: 'Want a heads-up when they perform?' }),
      ).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Yes, notify me' }))
      await waitFor(() =>
        expect(registerPushDevice).toHaveBeenCalledWith('token-del-telefono', 'android', 'en'),
      )
    })
  })

  describe('registro del dispositivo', () => {
    beforeEach(() => {
      vi.mocked(checkPushPermission).mockResolvedValue('granted')
      vi.mocked(fetchNightActs).mockResolvedValue(nightFixture())
    })

    it('al abrir, con permiso y sesión, registra el token con la plataforma y el idioma', async () => {
      renderApp('/')
      await waitFor(() =>
        expect(registerPushDevice).toHaveBeenCalledWith('token-del-telefono', 'android', 'es'),
      )
      expect(ensureNoticeChannel).toHaveBeenCalledWith('Avisos de tus conjuntos')
    })

    it('cuando cambia el token lo vuelve a registrar', async () => {
      renderApp('/')
      await waitFor(() => expect(registerPushDevice).toHaveBeenCalledTimes(1))
      await act(async () => {
        listeners?.onToken('token-nuevo')
        await Promise.resolve()
      })
      await waitFor(() =>
        expect(registerPushDevice).toHaveBeenLastCalledWith('token-nuevo', 'android', 'es'),
      )
    })

    it('sin sesión no registra nada: no hay a quién avisar', async () => {
      vi.mocked(getUserId).mockResolvedValue(null)
      renderApp('/')
      await screen.findByRole('region', { name: 'Tablado Centro' })
      await waitFor(() => expect(checkPushPermission).toHaveBeenCalled())
      expect(registerPushDevice).not.toHaveBeenCalled()
      expect(getPushToken).not.toHaveBeenCalled()
    })

    it('si el registro falla al abrir, la app sigue andando', async () => {
      vi.mocked(registerPushDevice).mockRejectedValue(new Error('sin red'))
      renderApp('/')
      expect(await screen.findByRole('region', { name: 'Tablado Centro' })).toBeInTheDocument()
      await waitFor(() => expect(registerPushDevice).toHaveBeenCalled())
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('al tocar un aviso', () => {
    beforeEach(() => {
      vi.mocked(fetchNightActs).mockResolvedValue(nightFixture())
    })

    const tap = async (route: unknown) => {
      await waitFor(() => expect(listeners).toBeDefined())
      act(() => listeners?.onTap(route))
    }

    it('abre la ficha del conjunto', async () => {
      const { router } = renderApp('/')
      await tap('/conjuntos/la-gran-muneca')
      expect(router.state.location.pathname).toBe('/conjuntos/la-gran-muneca')
      expect(
        await screen.findByRole('heading', { level: 1, name: 'La Gran Muñeca' }),
      ).toBeInTheDocument()
    })

    it('o el pizarrón de esa noche con «mis conjuntos»', async () => {
      const { router } = renderApp('/conjuntos')
      await tap('/?noche=2027-01-28&mios=1')
      expect(router.state.location.pathname).toBe('/')
      expect(router.state.location.search).toBe('?noche=2027-01-28&mios=1')
      await waitFor(() =>
        expect(fetchNightActs).toHaveBeenCalledWith(
          expect.objectContaining({ noche: '2027-01-28', onlyFollowed: true }),
        ),
      )
    })

    it('ignora un aviso sin ruta o con una dirección de afuera', async () => {
      const { router } = renderApp('/mapa')
      for (const route of [
        undefined,
        42,
        '',
        'https://example.org/',
        '//example.org',
        'conjuntos',
      ]) {
        await tap(route)
        expect(router.state.location.pathname).toBe('/mapa')
      }
    })

    it('si llega un aviso con la app abierta, vuelve a pedir la grilla', async () => {
      renderApp('/')
      await screen.findByRole('region', { name: 'Tablado Centro' })
      const before = vi.mocked(fetchNightActs).mock.calls.length
      act(() => listeners?.onReceived())
      await waitFor(() =>
        expect(vi.mocked(fetchNightActs).mock.calls.length).toBeGreaterThan(before),
      )
    })
  })
})

describe('safeRoute', () => {
  it('sólo acepta rutas de la app', () => {
    expect(safeRoute('/conjuntos/c-1080')).toBe('/conjuntos/c-1080')
    expect(safeRoute('/?noche=2027-01-28&mios=1')).toBe('/?noche=2027-01-28&mios=1')
    expect(safeRoute('/')).toBe('/')
    for (const bad of ['//example.org', 'https://example.org', 'javascript:alert(1)', '', null]) {
      expect(safeRoute(bad)).toBeNull()
    }
  })
})
