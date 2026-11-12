import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import type { NightAct } from '../../lib/api'
import { renderAdmin } from '../../test-utils'
import { toPatch } from './actPatch'

vi.mock('../../lib/api')

const NOCHE = '2026-02-28'

const act = (over: Partial<NightAct> & Pick<NightAct, 'id'>): NightAct => ({
  // 20:00 de Montevideo.
  inicio: '2026-02-28T23:00:00Z',
  estado: 'programada',
  direccion_texto: null,
  fuente: 'El Observador',
  fuente_url: null,
  actualizado_en: '2026-02-28T15:00:00Z',
  escenario: { id: 10, nombre: 'Julia Arévalo', itinerante: false },
  conjunto: { id: 1, nombre: 'Caballeros' },
  ...over,
})

const ACTS: NightAct[] = [
  act({ id: 1 }),
  act({ id: 2, inicio: '2026-02-28T23:50:00Z', conjunto: { id: 2, nombre: 'Doña Bastarda' } }),
  act({
    id: 3,
    escenario: { id: 11, nombre: 'Velódromo Municipal', itinerante: false },
    conjunto: { id: 3, nombre: 'Falta y Resto' },
  }),
  act({
    id: 4,
    estado: 'suspendida',
    escenario: { id: 11, nombre: 'Velódromo Municipal', itinerante: false },
    conjunto: { id: 4, nombre: 'Cyranos' },
  }),
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchNightActs).mockResolvedValue(ACTS)
  vi.mocked(api.fetchSuspensions).mockResolvedValue([])
  vi.mocked(api.fetchCatalog).mockResolvedValue({
    groups: [
      { id: 1, nombre: 'Caballeros', alias: [], categoria: 'murga' },
      { id: 5, nombre: 'Zíngaros', alias: [], categoria: 'parodistas' },
    ],
    stages: [
      {
        id: 10,
        nombre: 'Julia Arévalo',
        alias: [],
        tipo: 'popular',
        itinerante: false,
        activo: true,
      },
      {
        id: 11,
        nombre: 'Velódromo Municipal',
        alias: [],
        tipo: 'popular',
        itinerante: false,
        activo: true,
      },
    ],
  })
  vi.mocked(api.updateAct).mockResolvedValue(undefined)
  vi.mocked(api.addAct).mockResolvedValue(undefined)
  vi.mocked(api.deleteAct).mockResolvedValue(undefined)
  vi.mocked(api.suspendNight).mockResolvedValue(3)
  vi.mocked(api.undoSuspension).mockResolvedValue(3)
  vi.mocked(api.sendChangeNotices).mockResolvedValue(true)
})

const open = async () => {
  const view = renderAdmin(`/grilla?noche=${NOCHE}`)
  await screen.findByText(/4 actuaciones en 2 escenarios; 1 suspendidas/)
  return { ...view, user: userEvent.setup() }
}

describe('toPatch', () => {
  const base = ACTS[0]!
  const draft = { hora: '20:00', escenarioId: 10, direccion: '', estado: 'programada' as const }

  it('sin cambios no manda nada', () => {
    expect(toPatch(base, draft, NOCHE)).toEqual({})
  })

  it('un cambio de hora deja la actuación «cambiada»', () => {
    expect(toPatch(base, { ...draft, hora: '21:30' }, NOCHE)).toEqual({
      inicio: '2026-03-01T00:30:00.000Z',
      estado: 'cambiada',
    })
  })

  it('una hora de madrugada es del día siguiente y sigue en esa noche', () => {
    expect(toPatch(base, { ...draft, hora: '00:50' }, NOCHE).inicio).toBe(
      '2026-03-01T03:50:00.000Z',
    )
  })

  it('el estado que elige el admin manda', () => {
    expect(toPatch(base, { ...draft, hora: '21:30', estado: 'suspendida' }, NOCHE)).toMatchObject({
      estado: 'suspendida',
    })
    expect(
      toPatch(
        { ...base, estado: 'suspendida' },
        { ...draft, hora: '21:30', estado: 'suspendida' },
        NOCHE,
      ),
    ).toEqual({ inicio: '2026-03-01T00:30:00.000Z' })
  })
})

describe('actuaciones de una noche', () => {
  it('lista la noche por escenario, con la hora de Montevideo', async () => {
    await open()
    expect(api.fetchNightActs).toHaveBeenCalledWith(NOCHE)
    const stage = screen.getByRole('heading', { name: 'Julia Arévalo' }).closest('article')!
    expect(within(stage).getByText('20:00')).toBeInTheDocument()
    expect(within(stage).getByText('20:50')).toBeInTheDocument()
    expect(within(stage).getByText('Doña Bastarda')).toBeInTheDocument()
  })

  it('guardar un cambio de hora la deja cambiada', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Editar Caballeros' }))
    fireEvent.change(screen.getByLabelText('Hora', { selector: 'input[value="20:00"]' }), {
      target: { value: '21:30' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(api.updateAct).toHaveBeenCalledWith(1, {
        inicio: '2026-03-01T00:30:00.000Z',
        estado: 'cambiada',
      }),
    )
    expect(await screen.findByText('Guardado.')).toBeInTheDocument()
  })

  it('borrar pide confirmar', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Borrar Caballeros' }))
    expect(api.deleteAct).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Sí, borrar Caballeros' }))
    await waitFor(() => expect(api.deleteAct).toHaveBeenCalledWith(1))
  })

  it('agrega una actuación con su fuente', async () => {
    const { user } = await open()
    const form = screen.getByRole('heading', { name: 'Agregar una actuación' }).closest('form')!
    await user.selectOptions(within(form).getByLabelText('Escenario'), 'Velódromo Municipal')
    await user.selectOptions(within(form).getByLabelText('Conjunto'), 'Zíngaros')
    fireEvent.change(within(form).getByLabelText('Hora'), { target: { value: '00:50' } })
    await user.type(within(form).getByLabelText('Fuente'), 'DAECPU')
    await user.click(within(form).getByRole('button', { name: 'Agregar' }))

    await waitFor(() =>
      expect(api.addAct).toHaveBeenCalledWith({
        escenario_id: 11,
        conjunto_id: 5,
        inicio: '2026-03-01T03:50:00.000Z',
        direccion_texto: null,
        fuente: 'DAECPU',
        fuente_url: null,
      }),
    )
  })

  it('si guardar falla, muestra el motivo', async () => {
    vi.mocked(api.updateAct).mockRejectedValue(new Error('No se guardó: no hay permiso.'))
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Editar Caballeros' }))
    fireEvent.change(screen.getByLabelText('Hora', { selector: 'input[value="20:00"]' }), {
      target: { value: '21:30' },
    })
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('No se guardó: no hay permiso.')
  })
})

describe('suspender', () => {
  it('la noche entera, en dos pasos, y pide el aviso enseguida', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Suspender la noche…' }))
    expect(api.suspendNight).not.toHaveBeenCalled()
    // Las tres que no están suspendidas; la que ya lo estaba no cuenta.
    expect(screen.getByText(/Se suspende la noche entera: 3 actuaciones/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('Motivo (opcional)'), 'Lluvia')
    await user.click(screen.getByRole('button', { name: 'Confirmar la suspensión' }))

    await waitFor(() => expect(api.suspendNight).toHaveBeenCalledWith(NOCHE, null, 'Lluvia'))
    expect(api.sendChangeNotices).toHaveBeenCalledTimes(1)
    expect(
      await screen.findByText(/3 actuaciones suspendidas\. Los avisos ya salieron\./),
    ).toBeInTheDocument()
  })

  it('sólo los escenarios que quedan marcados', async () => {
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Suspender la noche…' }))
    await user.click(screen.getByLabelText('Julia Arévalo (2 actuaciones)'))
    expect(screen.getByText(/Se suspende 1 actuación en 1 escenarios/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Confirmar la suspensión' }))
    await waitFor(() => expect(api.suspendNight).toHaveBeenCalledWith(NOCHE, [11], ''))
  })

  it('si no se pudo pedir el aviso, dice que sale solo', async () => {
    vi.mocked(api.sendChangeNotices).mockResolvedValue(false)
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Suspender la noche…' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar la suspensión' }))
    expect(await screen.findByText(/sale solo en el próximo minuto/)).toBeInTheDocument()
  })

  it('si la base la rechaza, lo dice y no pide avisos', async () => {
    vi.mocked(api.suspendNight).mockRejectedValue(
      new Error('Sólo un admin puede suspender una noche.'),
    )
    const { user } = await open()
    await user.click(screen.getByRole('button', { name: 'Suspender la noche…' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar la suspensión' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sólo un admin puede suspender una noche.',
    )
    expect(api.sendChangeNotices).not.toHaveBeenCalled()
  })

  it('lista las suspensiones de la noche y deshace una', async () => {
    vi.mocked(api.fetchSuspensions).mockResolvedValue([
      {
        id: 7,
        motivo: 'Lluvia',
        creado_email: 'ana@ejemplo.com',
        creado_en: '2026-02-28T21:00:00Z',
        deshecha_en: null,
        actuaciones: 3,
      },
    ])
    const { user } = await open()
    expect(
      await screen.findByText(
        /3 actuaciones suspendidas el 28\/02\/2026, 18:00 por ana@ejemplo.com · Lluvia/,
      ),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Deshacer' }))
    await waitFor(() => expect(api.undoSuspension).toHaveBeenCalledWith(7))
    expect(api.sendChangeNotices).toHaveBeenCalledTimes(1)
    expect(await screen.findByText(/3 actuaciones volvieron a como estaban/)).toBeInTheDocument()
  })

  it('una suspensión ya deshecha no se puede deshacer otra vez', async () => {
    vi.mocked(api.fetchSuspensions).mockResolvedValue([
      {
        id: 7,
        motivo: null,
        creado_email: null,
        creado_en: '2026-02-28T21:00:00Z',
        deshecha_en: '2026-02-28T21:30:00Z',
        actuaciones: 3,
      },
    ])
    await open()
    expect(await screen.findByText(/por el sistema · deshecha el/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Deshacer' })).not.toBeInTheDocument()
  })
})
