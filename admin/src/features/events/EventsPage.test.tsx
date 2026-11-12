import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import type { EventRow } from '../../lib/api'
import { renderAdmin } from '../../test-utils'

vi.mock('../../lib/api')

const EVENTS: EventRow[] = [
  {
    id: 1,
    temporada_id: 2,
    slug: 'concurso-inicio-2027',
    tipo: 'concurso',
    nombre: 'Concurso Oficial',
    fecha_inicio: '2027-01-25',
    fecha_fin: '2027-03-05',
    lugar: 'Teatro de Verano',
    estado: 'estimado',
    info: null,
    fuente_url: ['https://example.com/concurso'],
    entradas_url: null,
    entradas_texto: null,
  },
  {
    id: 2,
    temporada_id: 2,
    slug: 'llamadas-noche-1-2027',
    tipo: 'llamadas',
    nombre: 'Llamadas, noche 1',
    fecha_inicio: '2027-02-05',
    fecha_fin: '2027-02-05',
    lugar: 'Isla de Flores',
    estado: 'confirmado',
    info: null,
    fuente_url: [],
    entradas_url: null,
    entradas_texto: null,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchEvents).mockResolvedValue(EVENTS)
  vi.mocked(api.fetchSeasons).mockResolvedValue([
    { id: 2, anio: 2027, fecha_inicio: '2027-01-21', fecha_fin: '2027-03-07' },
  ])
  vi.mocked(api.saveEvent).mockResolvedValue(1)
})

const open = async () => {
  renderAdmin('/eventos')
  await screen.findByRole('button', { name: /Concurso Oficial/ })
  return userEvent.setup()
}

describe('eventos', () => {
  it('carga el enlace de entradas del Concurso sin tocar lo demás', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Concurso Oficial/ }))
    await user.type(
      screen.getByLabelText('Dirección de la venta oficial'),
      'https://entradas.example.com/concurso',
    )
    await user.type(
      screen.getByLabelText(/^Dónde y desde cuándo/),
      'Desde el 22/1, web y boletería.',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(api.saveEvent).toHaveBeenCalled())
    expect(vi.mocked(api.saveEvent).mock.calls[0]).toEqual([
      1,
      {
        temporada_id: 2,
        slug: 'concurso-inicio-2027',
        tipo: 'concurso',
        nombre: 'Concurso Oficial',
        fecha_inicio: '2027-01-25',
        fecha_fin: '2027-03-05',
        lugar: 'Teatro de Verano',
        estado: 'estimado',
        info: null,
        fuente_url: ['https://example.com/concurso'],
        entradas_url: 'https://entradas.example.com/concurso',
        entradas_texto: 'Desde el 22/1, web y boletería.',
      },
    ])
    expect(await screen.findByText('Evento guardado.')).toBeInTheDocument()
  })

  it('no guarda una dirección de entradas que no es http(s)', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Concurso Oficial/ }))
    await user.type(screen.getByLabelText('Dirección de la venta oficial'), 'abitab.com.uy')
    expect(screen.getByRole('alert')).toHaveTextContent('tiene que empezar con http')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(api.saveEvent).not.toHaveBeenCalled()
  })

  it('una fecha estimada se ve marcada en la lista', async () => {
    await open()
    expect(screen.getByRole('button', { name: /Concurso Oficial/ })).toHaveTextContent(
      'Fecha estimada',
    )
    expect(screen.getByRole('button', { name: /Llamadas, noche 1/ })).not.toHaveTextContent(
      'Fecha estimada',
    )
  })

  it('crea un evento nuevo en la temporada vigente, de un día si no lleva fecha de fin', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Nuevo evento' }))
    const form = screen.getByRole('heading', { name: 'Evento nuevo' }).closest('form')!
    await user.type(within(form).getByLabelText('Nombre'), 'Corso de Malvín')
    await user.selectOptions(within(form).getByLabelText('Tipo'), 'Corso')
    fireEvent.change(within(form).getByLabelText('Fecha de inicio'), {
      target: { value: '2027-02-13' },
    })
    await user.click(within(form).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(api.saveEvent).toHaveBeenCalled())
    expect(vi.mocked(api.saveEvent).mock.calls[0]).toEqual([
      null,
      expect.objectContaining({
        temporada_id: 2,
        slug: 'corso-de-malvin-2027',
        tipo: 'corso',
        fecha_inicio: '2027-02-13',
        fecha_fin: '2027-02-13',
        estado: 'estimado',
        entradas_url: null,
      }),
    ])
  })

  it('no deja una fecha de fin anterior a la de inicio', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Llamadas, noche 1/ }))
    fireEvent.change(screen.getByLabelText(/^Fecha de fin/), { target: { value: '2027-02-01' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Revisá las fechas')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(api.saveEvent).not.toHaveBeenCalled()
  })
})
