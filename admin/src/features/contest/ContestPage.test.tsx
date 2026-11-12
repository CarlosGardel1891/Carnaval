import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import type { ContestStage } from '../../lib/api'
import { renderAdmin } from '../../test-utils'

vi.mock('../../lib/api')

const STAGES: ContestStage[] = [
  {
    id: 7,
    temporada_id: 2,
    rueda: 'primera',
    numero: 1,
    fecha: '2027-01-25',
    fuente: 'DAECPU',
    fuente_url: 'https://example.com/fixture',
    actuaciones: [
      // 20:30 de Montevideo.
      {
        id: 70,
        inicio: '2027-01-25T23:30:00Z',
        estado: 'programada',
        conjunto: { nombre: 'Caballeros' },
      },
    ],
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchContest).mockResolvedValue(STAGES)
  vi.mocked(api.fetchSeasons).mockResolvedValue([
    { id: 2, anio: 2027, fecha_inicio: '2027-01-21', fecha_fin: '2027-03-07' },
  ])
  vi.mocked(api.fetchCatalog).mockResolvedValue({
    groups: [
      { id: 1, nombre: 'Caballeros', alias: [], categoria: 'murga' },
      { id: 5, nombre: 'Zíngaros', alias: [], categoria: 'parodistas' },
    ],
    stages: [
      {
        id: 30,
        nombre: 'Teatro de Verano',
        alias: [],
        tipo: 'teatro_verano',
        itinerante: false,
        activo: true,
      },
    ],
  })
  vi.mocked(api.saveContestStage).mockResolvedValue(7)
  vi.mocked(api.deleteContestStage).mockResolvedValue(undefined)
  vi.mocked(api.addAct).mockResolvedValue(undefined)
})

const open = async () => {
  renderAdmin('/concurso')
  await screen.findByRole('button', { name: /Etapa 1/ })
  return userEvent.setup()
}

describe('fixture del Concurso', () => {
  it('sin etapas dice que el fixture no se publicó', async () => {
    vi.mocked(api.fetchContest).mockResolvedValue([])
    renderAdmin('/concurso')
    expect(await screen.findByText(/Todavía no hay etapas cargadas/)).toBeInTheDocument()
  })

  it('muestra los conjuntos de la etapa con la hora de Montevideo', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Etapa 1/ }))
    const night = screen.getByRole('heading', {
      name: /Conjuntos del lunes, 25 de enero de 2027/,
    }).parentElement!
    const list = within(night).getByRole('list')
    expect(within(list).getByText('20:30')).toBeInTheDocument()
    expect(within(list).getByText('Caballeros')).toBeInTheDocument()
  })

  it('agrega un conjunto a la etapa: una actuación del Teatro de Verano con esa etapa y su fuente', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Etapa 1/ }))
    await user.selectOptions(screen.getByLabelText('Agregar un conjunto'), 'Zíngaros')
    fireEvent.change(screen.getByLabelText('Hora'), { target: { value: '00:15' } })
    await user.click(screen.getByRole('button', { name: 'Agregar' }))

    await waitFor(() =>
      expect(api.addAct).toHaveBeenCalledWith({
        escenario_id: 30,
        conjunto_id: 5,
        // La madrugada sigue siendo la noche de la etapa.
        inicio: '2027-01-26T03:15:00.000Z',
        direccion_texto: null,
        fuente: 'DAECPU',
        fuente_url: 'https://example.com/fixture',
        etapa_id: 7,
      }),
    )
  })

  it('crea una etapa nueva con su fuente', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Nueva etapa' }))
    const form = screen.getByRole('heading', { name: 'Etapa nueva' }).closest('form')!
    // Sin fuente no se puede guardar.
    await user.type(within(form).getByLabelText('Número de etapa'), '2')
    fireEvent.change(within(form).getByLabelText('Fecha de la noche'), {
      target: { value: '2027-01-26' },
    })
    expect(within(form).getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await user.type(within(form).getByLabelText('Fuente'), 'DAECPU')
    await user.click(within(form).getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(api.saveContestStage).toHaveBeenCalledWith(null, {
        temporada_id: 2,
        rueda: 'primera',
        numero: 2,
        fecha: '2027-01-26',
        fuente: 'DAECPU',
        fuente_url: null,
      }),
    )
  })

  it('borrar una etapa pide confirmar', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Etapa 1/ }))
    await user.click(screen.getByRole('button', { name: 'Borrar la etapa' }))
    expect(api.deleteContestStage).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Sí, borrar la etapa' }))
    await waitFor(() => expect(api.deleteContestStage).toHaveBeenCalledWith(7))
  })

  it('avisa que cambiar la fecha no mueve las actuaciones', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Etapa 1/ }))
    fireEvent.change(screen.getByLabelText('Fecha de la noche'), {
      target: { value: '2027-01-27' },
    })
    expect(screen.getByText(/no mueve sus actuaciones/)).toBeInTheDocument()
  })
})
