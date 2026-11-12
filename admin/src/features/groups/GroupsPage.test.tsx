import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import type { GroupRow } from '../../lib/api'
import { renderAdmin } from '../../test-utils'

vi.mock('../../lib/api')

const group = (over: Partial<GroupRow> & Pick<GroupRow, 'id' | 'nombre'>): GroupRow => ({
  slug: `conjunto-${over.id}`,
  alias: [],
  categoria: 'murga',
  barrio: null,
  instagram: null,
  facebook: null,
  verificado: false,
  fuente_url: [],
  conjunto_temporada: [],
  ...over,
})

const GROUPS: GroupRow[] = [
  group({
    id: 1,
    nombre: 'La Sara del Cordón',
    alias: ['LA SARA DEL CORDON'],
    categoria: 'comparsa',
    conjunto_temporada: [{ temporada_id: 2, en_concurso: null, en_llamadas: true }],
  }),
  group({ id: 2, nombre: 'Caballeros' }),
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchGroups).mockResolvedValue(GROUPS)
  vi.mocked(api.fetchSeasons).mockResolvedValue([
    { id: 2, anio: 2027, fecha_inicio: '2027-01-21', fecha_fin: '2027-03-07' },
  ])
  vi.mocked(api.saveGroup).mockResolvedValue(1)
  vi.mocked(api.setParticipation).mockResolvedValue(undefined)
})

const open = async () => {
  renderAdmin('/conjuntos')
  await screen.findByText('2 de 2 conjuntos')
  return userEvent.setup()
}

describe('conjuntos', () => {
  it('busca por nombre y por alias, sin tildes ni mayúsculas', async () => {
    const user = await open()
    await user.type(screen.getByLabelText('Buscar un conjunto'), 'cordon')
    expect(await screen.findByText('1 de 2 conjuntos')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /La Sara del Cordón/ })).toBeInTheDocument()
  })

  it('agrega un alias y guarda la participación en la temporada', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /La Sara del Cordón/ }))

    const alias = screen.getByLabelText(/^Alias/)
    expect(alias).toHaveValue('LA SARA DEL CORDON')
    await user.type(alias, '\nLA SARA')
    expect(screen.getByLabelText('Participa en el carnaval 2027')).toBeChecked()
    await user.selectOptions(screen.getByLabelText('En el Concurso Oficial'), 'No')
    await user.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(api.saveGroup).toHaveBeenCalled())
    expect(vi.mocked(api.saveGroup).mock.calls[0]).toEqual([
      1,
      expect.objectContaining({
        slug: 'conjunto-1',
        nombre: 'La Sara del Cordón',
        alias: ['LA SARA DEL CORDON', 'LA SARA'],
        categoria: 'comparsa',
      }),
    ])
    expect(api.setParticipation).toHaveBeenCalledWith(1, 2, {
      en_concurso: false,
      en_llamadas: true,
    })
    expect(await screen.findByText('Conjunto guardado.')).toBeInTheDocument()
  })

  it('sacarle la participación la borra', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /La Sara del Cordón/ }))
    await user.click(screen.getByLabelText('Participa en el carnaval 2027'))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.setParticipation).toHaveBeenCalledWith(1, 2, null))
  })

  it('uno que no participaba y sigue sin participar no toca la temporada', async () => {
    const user = await open()
    await user.click(screen.getByRole('button', { name: /Caballeros/ }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    await waitFor(() => expect(api.saveGroup).toHaveBeenCalled())
    expect(api.setParticipation).not.toHaveBeenCalled()
  })

  it('crea un conjunto nuevo con su slug', async () => {
    vi.mocked(api.saveGroup).mockResolvedValue(9)
    const user = await open()
    await user.click(screen.getByRole('button', { name: 'Nuevo' }))
    const form = screen.getByRole('heading', { name: 'Conjunto nuevo' }).closest('form')!
    await user.type(within(form).getByLabelText('Nombre'), 'Los Recién Llegados')
    await user.selectOptions(within(form).getByLabelText('Categoría'), 'Humoristas')
    await user.click(within(form).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(api.saveGroup).toHaveBeenCalled())
    expect(vi.mocked(api.saveGroup).mock.calls[0]).toEqual([
      null,
      {
        slug: 'los-recien-llegados',
        nombre: 'Los Recién Llegados',
        alias: [],
        categoria: 'humoristas',
        barrio: null,
        instagram: null,
        facebook: null,
        verificado: false,
        fuente_url: [],
      },
    ])
  })

  it('si la base lo rechaza, muestra el motivo', async () => {
    vi.mocked(api.saveGroup).mockRejectedValue(
      new Error('El nombre o alias «caballeros» ya es del conjunto «Caballeros».'),
    )
    const user = await open()
    await user.click(screen.getByRole('button', { name: /La Sara del Cordón/ }))
    await user.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('ya es del conjunto «Caballeros»')
  })
})
