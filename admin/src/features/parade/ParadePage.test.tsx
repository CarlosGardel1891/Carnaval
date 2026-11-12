import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import type { ParadeEvent } from '../../lib/api'
import { renderAdmin } from '../../test-utils'
import { readOrder } from './orderText'
import { readPoints } from './points'

vi.mock('../../lib/api')
vi.mock('../map/LocationMap', () => ({ default: () => null }))

const EVENTS: ParadeEvent[] = [
  {
    id: 21,
    nombre: 'Llamadas, noche 1',
    fecha_inicio: '2027-02-05',
    desfile_inicio: null,
    desfile_intervalo_min: null,
    desfile_separacion_m: null,
    desfile_atraso_min: 0,
    recorrido_estado: 'estimado',
    recorrido_fuente_url: ['https://example.com/2025'],
  },
  {
    id: 22,
    nombre: 'Llamadas, noche 2',
    fecha_inicio: '2027-02-06',
    desfile_inicio: '20:30:00',
    desfile_intervalo_min: 12,
    desfile_separacion_m: null,
    desfile_atraso_min: 15,
    recorrido_estado: null,
    recorrido_fuente_url: [],
  },
]

const GROUPS = [
  { id: 1, nombre: 'Cuareim 1080', alias: ['C 1080', 'C1080'], categoria: 'comparsa' as const },
  { id: 2, nombre: 'La Sara del Cordón', alias: [], categoria: 'comparsa' as const },
  { id: 3, nombre: 'Yambo Kenia', alias: [], categoria: 'comparsa' as const },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_MAPTILER_KEY', '')
  vi.mocked(api.fetchParadeEvents).mockResolvedValue(EVENTS)
  vi.mocked(api.fetchCatalog).mockResolvedValue({ groups: GROUPS, stages: [] })
  vi.mocked(api.fetchParadeOrder).mockResolvedValue([
    { posicion: 1, conjunto_id: 3, conjunto_nombre: 'Yambo Kenia', fuente: 'IM' },
    { posicion: 2, conjunto_id: 1, conjunto_nombre: 'Cuareim 1080', fuente: 'IM' },
  ])
  vi.mocked(api.fetchParadeRoute).mockResolvedValue([
    { calle: 'Isla de Flores', cruce: 'Zelmar Michelini', lat: -34.9101, lng: -56.1905 },
    { calle: 'Isla de Flores', cruce: 'Minas', lat: -34.9111, lng: -56.1795 },
  ])
  vi.mocked(api.fetchClosures).mockResolvedValue([
    {
      id: 5,
      slug: 'corte-isla-de-flores',
      tipo: 'corte',
      descripcion: 'Isla de Flores entre Ejido y Minas',
      // 18:00 del 5/2 a 02:00 del 6/2, en Montevideo.
      desde: '2027-02-05T21:00:00Z',
      hasta: '2027-02-06T05:00:00Z',
      estado: 'estimado',
      fuente_url: [],
      puntos: [
        { lat: -34.9104, lng: -56.1872 },
        { lat: -34.9111, lng: -56.1795 },
      ],
    },
  ])
  vi.mocked(api.saveParadeSchedule).mockResolvedValue(undefined)
  vi.mocked(api.replaceParadeOrder).mockResolvedValue(3)
  vi.mocked(api.replaceParadeRoute).mockResolvedValue(3)
  vi.mocked(api.saveClosure).mockResolvedValue(undefined)
  vi.mocked(api.deleteClosure).mockResolvedValue(undefined)
})

const open = async (path = '/llamadas') => {
  renderAdmin(path)
  await screen.findByRole('heading', { name: 'Horario y atraso' })
  await screen.findByText('2 comparsas; 0 sin coincidencia y 0 repetidas.')
  return userEvent.setup()
}

const section = (title: string) =>
  screen.getByRole('heading', { name: title }).closest<HTMLElement>('section, form')!

describe('readOrder', () => {
  it('ignora el número de adelante y reconoce por nombre o alias, exacto', () => {
    const lines = readOrder(
      '1. C 1080\n2 - la sara del cordon\n3) Yambo\n\n4º Cuareim 1080',
      GROUPS,
    )
    expect(lines.map((l) => [l.name, l.group?.id ?? null, l.repeated])).toEqual([
      ['C 1080', 1, false],
      ['la sara del cordon', 2, false],
      ['Yambo', null, false],
      ['Cuareim 1080', 1, true],
    ])
  })
})

describe('readPoints', () => {
  it('lee «latitud, longitud» por línea', () => {
    expect(readPoints('-34.9104, -56.1872\n-34.9111;-56.1795')).toEqual([
      { lat: -34.9104, lng: -56.1872 },
      { lat: -34.9111, lng: -56.1795 },
    ])
    expect(readPoints('')).toEqual([])
  })

  it('una línea mal escrita o fuera de rango anula todo', () => {
    expect(readPoints('-34.9104 -56.1872')).toBeNull()
    expect(readPoints('-134.9, -56.1')).toBeNull()
  })
})

describe('Llamadas: horario y atraso', () => {
  it('carga el atraso de la noche y deja la regla general en lo vacío', async () => {
    const user = await open()
    const form = section('Horario y atraso')
    const delay = within(form).getByLabelText(/^Atraso/)
    await user.clear(delay)
    await user.type(delay, '40')
    await user.click(within(form).getByRole('button', { name: 'Guardar el horario' }))

    await waitFor(() =>
      expect(api.saveParadeSchedule).toHaveBeenCalledWith(21, {
        desfile_inicio: null,
        desfile_intervalo_min: null,
        desfile_separacion_m: null,
        desfile_atraso_min: 40,
      }),
    )
    expect(await screen.findByText(/Horario guardado/)).toBeInTheDocument()
  })

  it('elige la noche por la dirección y muestra su horario', async () => {
    await open('/llamadas?evento=22')
    const form = section('Horario y atraso')
    expect(within(form).getByLabelText(/^Atraso/)).toHaveValue(15)
    expect(within(form).getByLabelText(/^Sale la primera/)).toHaveValue('20:30')
    expect(within(form).getByLabelText(/^Minutos entre comparsas/)).toHaveValue(12)
    expect(api.fetchParadeOrder).toHaveBeenCalledWith(22)
  })

  it('no guarda un atraso fuera de rango', async () => {
    const user = await open()
    const form = section('Horario y atraso')
    const delay = within(form).getByLabelText(/^Atraso/)
    await user.clear(delay)
    await user.type(delay, '900')
    expect(within(form).getByRole('alert')).toHaveTextContent('Revisá los números')
    expect(within(form).getByRole('button', { name: 'Guardar el horario' })).toBeDisabled()
  })
})

describe('Llamadas: orden de desfile', () => {
  it('pega un orden nuevo y lo guarda entero, con su fuente', async () => {
    const user = await open()
    const box = section('Orden de desfile')
    fireEvent.change(within(box).getByLabelText(/^Una comparsa por línea/), {
      target: { value: '1. C1080\n2. La Sara del Cordón\n3. Yambo Kenia' },
    })
    expect(
      within(box).getByText('3 comparsas; 0 sin coincidencia y 0 repetidas.'),
    ).toBeInTheDocument()
    await user.click(within(box).getByRole('button', { name: 'Guardar el orden' }))

    await waitFor(() =>
      expect(api.replaceParadeOrder).toHaveBeenCalledWith(21, [1, 2, 3], 'IM', null),
    )
    expect(await screen.findByText('Orden guardado: 3 comparsas.')).toBeInTheDocument()
  })

  it('un nombre sin coincidencia o repetido no deja guardar', async () => {
    await open()
    const box = section('Orden de desfile')
    const text = within(box).getByLabelText(/^Una comparsa por línea/)
    fireEvent.change(text, { target: { value: 'Yambo Kenia\nLa Sara' } })
    expect(within(box).getByText('sin coincidencia')).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: 'Guardar el orden' })).toBeDisabled()

    fireEvent.change(text, { target: { value: 'Yambo Kenia\nYambo Kenia' } })
    expect(within(box).getByText('repetida')).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: 'Guardar el orden' })).toBeDisabled()
  })

  it('sin fuente no deja guardar', async () => {
    const user = await open()
    const box = section('Orden de desfile')
    await user.clear(within(box).getByLabelText('Fuente'))
    expect(within(box).getByText(/Falta la fuente/)).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: 'Guardar el orden' })).toBeDisabled()
  })
})

describe('Llamadas: recorrido', () => {
  it('agrega una esquina, lo marca confirmado y lo guarda entero', async () => {
    const user = await open()
    const box = section('Recorrido')
    await within(box).findByDisplayValue('Zelmar Michelini')
    await user.click(within(box).getByRole('button', { name: 'Agregar una esquina' }))
    // A la esquina nueva le falta todo menos la calle, que copia de la anterior.
    expect(within(box).getByText(/A 1 esquina le falta/)).toBeInTheDocument()
    expect(within(box).getByRole('button', { name: 'Guardar el recorrido' })).toBeDisabled()

    await user.type(within(box).getByLabelText('Cruce de la esquina 3'), 'Lorenzo Carnelli')
    await user.type(within(box).getByLabelText('Latitud de la esquina 3'), '-34.9115')
    await user.type(within(box).getByLabelText('Longitud de la esquina 3'), '-56.1760')
    await user.selectOptions(within(box).getByLabelText(/^El recorrido es/), 'Confirmado')
    await user.click(within(box).getByRole('button', { name: 'Guardar el recorrido' }))

    await waitFor(() =>
      expect(api.replaceParadeRoute).toHaveBeenCalledWith(
        21,
        [
          { calle: 'Isla de Flores', cruce: 'Zelmar Michelini', lat: -34.9101, lng: -56.1905 },
          { calle: 'Isla de Flores', cruce: 'Minas', lat: -34.9111, lng: -56.1795 },
          { calle: 'Isla de Flores', cruce: 'Lorenzo Carnelli', lat: -34.9115, lng: -56.176 },
        ],
        'confirmado',
        ['https://example.com/2025'],
      ),
    )
  })

  it('cambia el orden de las esquinas', async () => {
    const user = await open()
    const box = section('Recorrido')
    await within(box).findByDisplayValue('Zelmar Michelini')
    await user.click(within(box).getByRole('button', { name: 'Bajar la esquina 1' }))
    await user.click(within(box).getByRole('button', { name: 'Guardar el recorrido' }))
    await waitFor(() => expect(api.replaceParadeRoute).toHaveBeenCalled())
    expect(vi.mocked(api.replaceParadeRoute).mock.calls[0]![1].map((c) => c.cruce)).toEqual([
      'Minas',
      'Zelmar Michelini',
    ])
  })
})

describe('Llamadas: cortes de calle', () => {
  it('muestra el horario del corte en Montevideo y lo confirma', async () => {
    const user = await open()
    const box = section('Cortes de calle')
    await user.click(
      await within(box).findByRole('button', { name: /Isla de Flores entre Ejido y Minas/ }),
    )
    expect(within(box).getByLabelText(/^Desde/)).toHaveValue('2027-02-05T18:00')
    expect(within(box).getByLabelText('Hasta')).toHaveValue('2027-02-06T02:00')

    await user.selectOptions(within(box).getByLabelText('Es'), 'Confirmado')
    await user.click(within(box).getByRole('button', { name: 'Guardar' }))
    await waitFor(() =>
      expect(api.saveClosure).toHaveBeenCalledWith(21, 5, {
        slug: 'corte-isla-de-flores',
        tipo: 'corte',
        descripcion: 'Isla de Flores entre Ejido y Minas',
        desde: '2027-02-05T21:00:00.000Z',
        hasta: '2027-02-06T05:00:00.000Z',
        estado: 'confirmado',
        fuente_url: [],
        puntos: [
          { lat: -34.9104, lng: -56.1872 },
          { lat: -34.9111, lng: -56.1795 },
        ],
      }),
    )
  })

  it('crea un corte sin tramo, sólo con la descripción', async () => {
    const user = await open()
    const box = section('Cortes de calle')
    await user.click(await within(box).findByRole('button', { name: 'Agregar un corte' }))
    await user.type(within(box).getByLabelText('Descripción'), 'Carlos Gardel, de Ejido a Minas')
    await user.selectOptions(within(box).getByLabelText('Tipo'), 'Prohibido estacionar')
    await user.click(within(box).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(api.saveClosure).toHaveBeenCalled())
    expect(vi.mocked(api.saveClosure).mock.calls[0]).toEqual([
      21,
      null,
      expect.objectContaining({
        slug: 'estacionamiento-carlos-gardel-de-ejido-a-minas',
        tipo: 'estacionamiento',
        desde: null,
        hasta: null,
        estado: 'estimado',
        puntos: [],
      }),
    ])
  })

  it('un tramo mal escrito no deja guardar', async () => {
    const user = await open()
    const box = section('Cortes de calle')
    await user.click(
      await within(box).findByRole('button', { name: /Isla de Flores entre Ejido y Minas/ }),
    )
    fireEvent.change(within(box).getByLabelText(/^Tramo/), {
      target: { value: '-34.9104, -56.1872' },
    })
    expect(within(box).getByRole('alert')).toHaveTextContent('por lo menos dos puntos')
    expect(within(box).getByRole('button', { name: 'Guardar' })).toBeDisabled()
  })

  it('borrar un corte pide confirmar', async () => {
    const user = await open()
    const box = section('Cortes de calle')
    await user.click(
      await within(box).findByRole('button', { name: /Isla de Flores entre Ejido y Minas/ }),
    )
    await user.click(within(box).getByRole('button', { name: 'Borrar el corte' }))
    expect(api.deleteClosure).not.toHaveBeenCalled()
    await user.click(within(box).getByRole('button', { name: 'Sí, borrar el corte' }))
    await waitFor(() => expect(api.deleteClosure).toHaveBeenCalledWith(5))
  })
})
