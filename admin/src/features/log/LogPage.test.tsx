import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import type { LogEntry } from '../../lib/api'
import { renderAdmin } from '../../test-utils'
import { changedFields, rowLabel, showValue } from './describe'

vi.mock('../../lib/api')

const entry = (over: Partial<LogEntry> & Pick<LogEntry, 'id'>): LogEntry => ({
  tabla: 'actuaciones',
  fila: String(over.id),
  operacion: 'cambio',
  antes: {
    id: over.id,
    estado: 'programada',
    inicio: '2027-02-01T23:00:00+00:00',
    noche: '2027-02-01',
  },
  despues: {
    id: over.id,
    estado: 'suspendida',
    inicio: '2027-02-01T23:00:00+00:00',
    noche: '2027-02-01',
  },
  usuario_email: 'ana@ejemplo.com',
  // 18:30 de Montevideo.
  hecho_en: '2027-02-01T21:30:00Z',
  ...over,
})

const ENTRIES: LogEntry[] = [
  entry({ id: 3 }),
  entry({
    id: 2,
    tabla: 'conjuntos',
    operacion: 'alta',
    antes: null,
    despues: { id: 9, nombre: 'Los Recién Llegados', slug: 'los-recien-llegados' },
    usuario_email: null,
  }),
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchChangeLog).mockResolvedValue(ENTRIES)
})

describe('describe', () => {
  it('lista sólo los campos que cambiaron, sin los calculados', () => {
    expect(
      changedFields(
        entry({
          id: 1,
          antes: { nombre: 'A', nombre_norm: 'a', alias: ['x'], barrio: null },
          despues: { nombre: 'B', nombre_norm: 'b', alias: ['x'], barrio: 'Palermo' },
        }),
      ),
    ).toEqual([
      { field: 'barrio', before: '—', after: 'Palermo' },
      { field: 'nombre', before: 'A', after: 'B' },
    ])
  })

  it('un alta o una baja no tienen campos cambiados', () => {
    expect(changedFields(ENTRIES[1]!)).toEqual([])
  })

  it('nombra la fila por su nombre o, si no tiene, por su clave', () => {
    expect(rowLabel(ENTRIES[1]!)).toBe('Los Recién Llegados')
    expect(rowLabel(ENTRIES[0]!)).toBe('#3')
  })

  it('acorta los valores largos', () => {
    expect(showValue('x'.repeat(200))).toHaveLength(121)
    expect(showValue(['a', 'b'])).toBe('["a","b"]')
  })
})

describe('registro de cambios', () => {
  it('muestra quién cambió qué y cuándo, con la hora de Montevideo', async () => {
    renderAdmin('/registro')
    expect(await screen.findByText('Actuación · #3')).toBeInTheDocument()
    expect(screen.getAllByText('01/02/2027, 18:30')).toHaveLength(2)
    expect(screen.getByText('ana@ejemplo.com')).toBeInTheDocument()
    expect(screen.getByText('suspendida')).toBeInTheDocument()
    expect(screen.getByText('Conjunto · Los Recién Llegados')).toBeInTheDocument()
    expect(screen.getByText('el sistema')).toBeInTheDocument()
  })

  it('filtra por tabla, por noche y por quién', async () => {
    renderAdmin('/registro')
    const user = userEvent.setup()
    await screen.findByText('Actuación · #3')

    await user.selectOptions(screen.getByLabelText('Qué'), 'Actuación')
    fireEvent.change(screen.getByLabelText(/^Noche/), { target: { value: '2027-02-01' } })
    await user.type(screen.getByLabelText('Quién (email)'), 'ana')

    await waitFor(() =>
      expect(api.fetchChangeLog).toHaveBeenLastCalledWith({
        tabla: 'actuaciones',
        noche: '2027-02-01',
        email: 'ana',
      }),
    )
  })

  it('sigue con los más antiguos cuando hay otra página', async () => {
    const page = Array.from({ length: api.LOG_PAGE_SIZE }, (_, i) => entry({ id: 1000 - i }))
    vi.mocked(api.fetchChangeLog)
      .mockResolvedValueOnce(page)
      .mockResolvedValueOnce([entry({ id: 7 })])
    renderAdmin('/registro')
    await userEvent.click(await screen.findByRole('button', { name: 'Ver más antiguos' }))

    await waitFor(() => expect(api.fetchChangeLog).toHaveBeenLastCalledWith({ beforeId: 951 }))
    expect(await screen.findByText('Actuación · #7')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ver más antiguos' })).not.toBeInTheDocument()
  })

  it('sin cambios lo dice', async () => {
    vi.mocked(api.fetchChangeLog).mockResolvedValue([])
    renderAdmin('/registro')
    expect(await screen.findByText('No hay cambios con ese filtro.')).toBeInTheDocument()
  })
})
