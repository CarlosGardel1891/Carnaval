import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import type { SystemTask } from '../../lib/api'
import { renderAdmin } from '../../test-utils'

vi.mock('../../lib/api')

const task = (tarea: string, over: Partial<SystemTask> = {}): SystemTask => ({
  tarea,
  ultimo_ok: '2027-01-28T22:00:00Z',
  minutos: 1,
  limite_min: 10,
  al_dia: true,
  detalle: { simulacro: false },
  ...over,
})

const ALL_GOOD = [
  task('avisos-de-cambios'),
  task('avisos-del-dia', { minutos: 12 }),
  task('purga-anonimos', { minutos: 300 }),
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(api.fetchSystemStatus).mockResolvedValue(ALL_GOOD)
})

const statusBox = async () =>
  (await screen.findByRole('heading', { name: 'Estado del sistema' })).closest('section')!

describe('estado del sistema en la portada', () => {
  it('con todo al día lo dice, y muestra hace cuánto corrió cada tarea', async () => {
    renderAdmin('/')
    const box = within(await statusBox())
    expect(box.getByRole('status')).toHaveTextContent('Todo anda')
    expect(box.getByText('Avisos de cambios y suspensiones')).toBeVisible()
    expect(box.getByText('hace 1 minuto')).toBeVisible()
    expect(box.getByText('hace 12 minutos')).toBeVisible()
    expect(box.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('si una tarea no viene corriendo, avisa cuál y manda al manual', async () => {
    vi.mocked(api.fetchSystemStatus).mockResolvedValue([
      task('avisos-de-cambios', { al_dia: false, minutos: 47 }),
      task('avisos-del-dia'),
      task('purga-anonimos', { al_dia: false, minutos: null, ultimo_ok: null }),
    ])
    renderAdmin('/')
    const box = within(await statusBox())
    expect(box.getByRole('alert')).toHaveTextContent('Hay 2 tareas que no vienen corriendo.')
    expect(box.getByText('hace 47 minutos')).toBeVisible()
    expect(box.getByText('nunca corrió')).toBeVisible()
    expect(box.getByText(/manual de operación/)).toBeVisible()
  })

  it('dice si los avisos están en simulacro', async () => {
    vi.mocked(api.fetchSystemStatus).mockResolvedValue([
      task('avisos-de-cambios', { detalle: { simulacro: true } }),
      task('avisos-del-dia'),
      task('purga-anonimos', { detalle: null }),
    ])
    renderAdmin('/')
    expect(within(await statusBox()).getByText(/Los avisos están en simulacro/)).toBeVisible()
  })

  it('si no se puede leer el estado, lo dice y la portada sigue andando', async () => {
    vi.mocked(api.fetchSystemStatus).mockRejectedValue(new Error('sin permiso'))
    renderAdmin('/')
    expect(await screen.findByText('No se pudo leer el estado del sistema.')).toBeVisible()
    expect(screen.getAllByRole('link', { name: /Importar/ }).length).toBeGreaterThan(0)
  })
})
