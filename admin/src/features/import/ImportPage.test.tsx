import { norm } from '@cuerda/shared'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../lib/api'
import type { CatalogGroup, CatalogStage, GridRow, PreviewRow, PublishSummary } from '../../lib/api'
import { renderAdmin } from '../../test-utils'

vi.mock('../../lib/api')

const GROUPS: CatalogGroup[] = [
  { id: 1, nombre: 'Caballeros', alias: [], categoria: 'murga' },
  { id: 2, nombre: 'Doña Bastarda', alias: [], categoria: 'murga' },
  { id: 3, nombre: 'Mi Vieja Mula', alias: [], categoria: 'murga' },
  { id: 4, nombre: 'La Sara del Cordón', alias: [], categoria: 'comparsa' },
]
const STAGES: CatalogStage[] = [
  { id: 10, nombre: 'Julia Arévalo', alias: [], tipo: 'popular', itinerante: false, activo: true },
  {
    id: 11,
    nombre: 'Escenario Móvil IM 1',
    alias: [],
    tipo: 'movil',
    itinerante: true,
    activo: true,
  },
  {
    id: 12,
    nombre: 'Escenario Móvil IM 2',
    alias: [],
    tipo: 'movil',
    itinerante: true,
    activo: true,
  },
]

/** Lo ya cargado esa noche, por «escenario|conjunto» → hora (HH:MM de Montevideo). */
let loaded: Record<string, string> = {}

/** Hace lo que hace la base: reconoce por nombre normalizado exacto, o por el id elegido. */
function fakePreview(_noche: string, rows: GridRow[]): PreviewRow[] {
  const out = rows.map((row) => {
    const stage = row.escenario_id
      ? STAGES.find((s) => s.id === row.escenario_id)
      : STAGES.find((s) => norm(s.nombre) === norm(row.escenario))
    const group = row.conjunto_id
      ? GROUPS.find((g) => g.id === row.conjunto_id)
      : GROUPS.find((g) => norm(g.nombre) === norm(row.conjunto))
    const before = stage && group ? loaded[`${stage.id}|${group.id}`] : undefined
    return {
      n: row.n,
      escenario_id: stage?.id ?? null,
      escenario_nombre: stage?.nombre ?? null,
      escenario_itinerante: stage?.itinerante ?? null,
      conjunto_id: group?.id ?? null,
      conjunto_nombre: group?.nombre ?? null,
      inicio: `2026-03-01T${row.hora}:00Z`,
      direccion: row.direccion ?? null,
      estado:
        !stage || !group
          ? 'sin_coincidencia'
          : !before
            ? 'nueva'
            : before === row.hora
              ? 'igual'
              : 'cambia',
      actuacion_id: before ? 99 : null,
      // 20:00 de Montevideo.
      inicio_actual: before ? '2026-02-28T23:00:00Z' : null,
      direccion_actual: null,
      estado_actual: before ? 'programada' : null,
    } satisfies PreviewRow
  })
  return out
}

const SUMMARY: PublishSummary = {
  nuevas: 2,
  cambiadas: 0,
  iguales: 0,
  suspendidas: 0,
  borradas: 0,
  conjuntos_creados: 0,
  escenarios_creados: 0,
  alias_agregados: 0,
}

const POSTER = ['JULIA ARÉVALO', '20:00 - CABALLEROS', '20:50 - DOÑA BASTARDA'].join('\n')

async function open(text: string, { fuente = 'El Observador' } = {}) {
  const view = renderAdmin('/grilla/importar')
  const user = userEvent.setup()
  fireEvent.change(await screen.findByLabelText(/^Noche/), { target: { value: '2026-02-28' } })
  if (fuente) await user.type(screen.getByLabelText(/^Fuente/), fuente)
  fireEvent.change(screen.getByLabelText(/^Cartelera/), { target: { value: text } })
  await user.click(screen.getByRole('button', { name: 'Leer la cartelera' }))
  return { ...view, user }
}

const publishButton = () => screen.getByRole('button', { name: 'Publicar la noche' })
const sentRequest = () => vi.mocked(api.publishGrid).mock.calls[0]![0]

beforeEach(() => {
  vi.clearAllMocks()
  loaded = {}
  vi.mocked(api.fetchCatalog).mockResolvedValue({ groups: GROUPS, stages: STAGES })
  vi.mocked(api.fetchSeasons).mockResolvedValue([
    { anio: 2026, fecha_inicio: '2026-01-22', fecha_fin: '2026-03-08' },
  ])
  vi.mocked(api.previewGrid).mockImplementation((noche, rows) =>
    Promise.resolve(fakePreview(noche, rows)),
  )
  vi.mocked(api.fetchLeftovers).mockResolvedValue([])
  vi.mocked(api.publishGrid).mockResolvedValue(SUMMARY)
})

describe('importar una grilla', () => {
  it('muestra la vista previa y publica la noche con su fuente', async () => {
    const { user } = await open(POSTER)

    expect(await screen.findByText(/2 líneas: 2 nuevas, 0 que cambian/)).toBeInTheDocument()
    expect(screen.getAllByText('Nueva')).toHaveLength(2)
    expect(api.publishGrid).not.toHaveBeenCalled()

    await waitFor(() => expect(publishButton()).toBeEnabled())
    await user.click(publishButton())

    expect(
      await screen.findByText(/Publicado el sábado, 28 de febrero de 2026: 2 nuevas/),
    ).toBeInTheDocument()
    expect(sentRequest()).toEqual({
      noche: '2026-02-28',
      fuente: 'El Observador',
      fuenteUrl: '',
      leftovers: [],
      aliases: [],
      created: { conjuntos: [], escenarios: [] },
      rows: [
        { n: 1, escenario: 'JULIA ARÉVALO', conjunto: 'CABALLEROS', hora: '20:00' },
        { n: 2, escenario: 'JULIA ARÉVALO', conjunto: 'DOÑA BASTARDA', hora: '20:50' },
      ],
    })
  })

  it('sin fuente no deja publicar', async () => {
    await open(POSTER, { fuente: '' })
    expect(await screen.findByText(/Falta la fuente/)).toBeInTheDocument()
    await screen.findByText(/2 líneas: 2 nuevas/)
    expect(publishButton()).toBeDisabled()
  })

  it('marca lo que cambia y avisa que se va a notificar', async () => {
    loaded = { '10|1': '20:00', '10|2': '20:00' }
    await open(POSTER)
    expect(
      await screen.findByText(/2 líneas: 0 nuevas, 1 que cambian, 1 iguales/),
    ).toBeInTheDocument()
    expect(screen.getByText('estaba a las 20:00')).toBeInTheDocument()
    expect(screen.getByText(/1 actuación ya publicada cambia/)).toBeInTheDocument()
  })

  it('un nombre sin coincidencia frena la publicación hasta que el admin dice cuál es', async () => {
    const { user } = await open(['JULIA ARÉVALO', '20:00 - LA SARA'].join('\n'))

    const box = await screen.findByRole('group', { name: /LA SARA/ })
    expect(
      screen.getByText(/No se puede publicar todavía: hay 1 líneas sin coincidencia/),
    ).toBeInTheDocument()
    expect(publishButton()).toBeDisabled()

    await user.click(within(box).getByLabelText('Es un conjunto que ya está cargado'))
    // Elegir «ya está cargado» sin decir cuál no alcanza.
    expect(publishButton()).toBeDisabled()
    await user.selectOptions(
      within(box).getByLabelText('Qué conjunto es «LA SARA»'),
      'La Sara del Cordón',
    )
    await user.click(within(box).getByLabelText(/Guardar «LA SARA» como alias/))

    await waitFor(() => expect(publishButton()).toBeEnabled())
    expect(screen.getByText('→ La Sara del Cordón')).toBeInTheDocument()
    await user.click(publishButton())
    await screen.findByText(/Publicado el/)

    expect(sentRequest().aliases).toEqual([{ tipo: 'conjunto', id: 4, alias: 'LA SARA' }])
    expect(sentRequest().rows).toEqual([
      { n: 1, escenario: 'JULIA ARÉVALO', conjunto: 'LA SARA', conjunto_id: 4, hora: '20:00' },
    ])
  })

  it('no propone nada por parecido: la lista arranca sin elegir', async () => {
    await open(['JULIA ARÉVALO', '20:00 - CABALLERO'].join('\n'))
    const box = await screen.findByRole('group', { name: /CABALLERO/ })
    for (const radio of within(box).getAllByRole('radio')) expect(radio).not.toBeChecked()
  })

  it('«ESCENARIOS MÓVILES»: el admin elige el móvil y la parada va en la actuación, sin alias', async () => {
    const { user } = await open(
      [
        'ESCENARIOS MÓVILES - ENTRADA GRATUITA - PLAZA BOB MARLEY INGAVI Y CANSTATT',
        '20:00 - MI VIEJA MULA',
      ].join('\n'),
    )

    const box = await screen.findByRole('group', { name: /ESCENARIOS MÓVILES/ })
    await user.click(within(box).getByLabelText('Es un escenario que ya está cargado'))
    await user.selectOptions(
      within(box).getByLabelText('Qué escenario es «ESCENARIOS MÓVILES»'),
      'Escenario Móvil IM 2',
    )

    const stop = await screen.findByLabelText(/Parada de «ESCENARIOS MÓVILES» esa noche/)
    expect(stop).toHaveValue('PLAZA BOB MARLEY INGAVI Y CANSTATT')
    await user.clear(stop)
    await user.type(stop, 'Plaza Bob Marley, Ingavi y Canstatt')

    await waitFor(() => expect(publishButton()).toBeEnabled())
    await user.click(publishButton())
    await screen.findByText(/Publicado el/)

    expect(sentRequest().aliases).toEqual([])
    expect(sentRequest().created).toEqual({ conjuntos: [], escenarios: [] })
    expect(sentRequest().rows).toEqual([
      {
        n: 1,
        escenario: 'ESCENARIOS MÓVILES',
        escenario_id: 12,
        conjunto: 'MI VIEJA MULA',
        hora: '20:00',
        direccion: 'Plaza Bob Marley, Ingavi y Canstatt',
      },
    ])
  })

  it('crea un conjunto nuevo sólo si el admin lo confirma, con su categoría', async () => {
    const { user } = await open(['JULIA ARÉVALO', '20:00 - LOS RECIÉN LLEGADOS'].join('\n'))

    const box = await screen.findByRole('group', { name: /LOS RECIÉN LLEGADOS/ })
    await user.click(within(box).getByLabelText('Es un conjunto nuevo'))
    const name = within(box).getByLabelText('Nombre con el que se crea «LOS RECIÉN LLEGADOS»')
    await user.clear(name)
    expect(publishButton()).toBeDisabled()
    await user.type(name, 'Los Recién Llegados')
    await user.selectOptions(
      within(box).getByLabelText('Categoría de «LOS RECIÉN LLEGADOS»'),
      'Humoristas',
    )

    await waitFor(() => expect(publishButton()).toBeEnabled())
    expect(screen.getByText('Nueva')).toBeInTheDocument()
    await user.click(publishButton())
    await screen.findByText(/Publicado el/)

    expect(sentRequest().created).toEqual({
      conjuntos: [
        { clave: 'c:los recien llegados', nombre: 'Los Recién Llegados', categoria: 'humoristas' },
      ],
      escenarios: [],
    })
    expect(sentRequest().rows[0]).toMatchObject({ conjunto_nuevo: 'c:los recien llegados' })
  })

  it('crea un escenario nuevo; si el título traía parada lo propone itinerante', async () => {
    const { user } = await open(
      ['TABLADO NUEVO - ENTRADA GRATUITA - PLAZA TAL', '20:00 - CABALLEROS'].join('\n'),
    )
    const box = await screen.findByRole('group', { name: /TABLADO NUEVO/ })
    await user.click(within(box).getByLabelText('Es un escenario nuevo'))
    expect(within(box).getByLabelText(/Es itinerante/)).toBeChecked()

    await waitFor(() => expect(publishButton()).toBeEnabled())
    await user.click(publishButton())
    await screen.findByText(/Publicado el/)
    expect(sentRequest().created.escenarios).toEqual([
      { clave: 'e:tablado nuevo', nombre: 'TABLADO NUEVO', tipo: 'gratuito', itinerante: true },
    ])
    expect(sentRequest().rows[0]).toMatchObject({
      escenario_nuevo: 'e:tablado nuevo',
      direccion: 'PLAZA TAL',
    })
  })

  it('un conjunto repetido en el mismo escenario frena la publicación; quitando una línea sigue', async () => {
    const { user } = await open(
      ['JULIA ARÉVALO', '20:00 - CABALLEROS', '22:00 - Caballeros'].join('\n'),
    )
    // La base es la que marca los repetidos entre lo que ya existe.
    vi.mocked(api.previewGrid).mockImplementation((noche, rows) =>
      Promise.resolve(
        fakePreview(noche, rows).map((row) =>
          rows.length > 1 ? { ...row, estado: 'duplicada' } : row,
        ),
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Leer la cartelera' }))

    expect(await screen.findAllByText('Repetida')).toHaveLength(2)
    expect(publishButton()).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Quitar 22:00 Caballeros' }))
    await waitFor(() => expect(publishButton()).toBeEnabled())
    expect(screen.getByRole('heading', { name: 'Líneas que no se cargan' })).toBeInTheDocument()

    await user.click(publishButton())
    await screen.findByText(/Publicado el/)
    expect(sentRequest().rows.map((row) => row.n)).toEqual([1])
  })

  it('lista lo que no pudo leer, con su línea y su motivo', async () => {
    await open(
      [
        'Los tablados del sábado 28',
        '',
        'JULIA ARÉVALO',
        '20:00 - CABALLEROS',
        '25:00 - NADIE',
      ].join('\n'),
    )
    expect(await screen.findByText(/Hay 2 líneas que no se pudieron leer/)).toBeInTheDocument()
    expect(screen.getByText('Los tablados del sábado 28')).toBeInTheDocument()
    expect(screen.getByText(/no tiene actuaciones debajo/)).toBeInTheDocument()
    expect(screen.getByText('25:00 - NADIE')).toBeInTheDocument()
    expect(screen.getByText(/la hora no existe/)).toBeInTheDocument()
  })

  it('lo cargado que no viene se deja, salvo que el admin elija suspenderlo o borrarlo', async () => {
    vi.mocked(api.fetchLeftovers).mockResolvedValue([
      {
        actuacion_id: 501,
        escenario_nombre: 'Julia Arévalo',
        conjunto_nombre: 'Mi Vieja Mula',
        inicio: '2026-03-01T01:50:00Z',
        estado: 'programada',
      },
    ])
    const { user } = await open(POSTER)

    expect(await screen.findByText(/Julia Arévalo · 22:50 · Mi Vieja Mula/)).toBeInTheDocument()
    const action = screen.getByLabelText('Qué hacer con Mi Vieja Mula en Julia Arévalo')
    expect(action).toHaveValue('dejar')
    await user.selectOptions(action, 'Suspenderla (avisa)')

    await waitFor(() => expect(publishButton()).toBeEnabled())
    await user.click(publishButton())
    await screen.findByText(/Publicado el/)
    expect(sentRequest().leftovers).toEqual([{ id: 501, accion: 'suspender' }])
  })

  it('si la base rechaza la publicación, lo dice y no da nada por publicado', async () => {
    vi.mocked(api.publishGrid).mockRejectedValue(
      new Error('El nombre o alias «X» ya es del conjunto «Y».'),
    )
    const { user } = await open(POSTER)
    await waitFor(() => expect(publishButton()).toBeEnabled())
    await user.click(publishButton())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se publicó nada. El nombre o alias «X» ya es del conjunto «Y».',
    )
    expect(screen.queryByText(/Publicado el/)).not.toBeInTheDocument()
    expect(publishButton()).toBeEnabled()
  })

  it('avisa si la noche está fuera de la temporada, sin bloquear', async () => {
    vi.mocked(api.fetchSeasons).mockResolvedValue([
      { anio: 2027, fecha_inicio: '2027-01-21', fecha_fin: '2027-03-07' },
    ])
    await open(POSTER)
    expect(await screen.findByText(/está fuera de la temporada/)).toBeInTheDocument()
    await waitFor(() => expect(publishButton()).toBeEnabled())
  })

  it('un CSV sin el encabezado de la plantilla no se lee', async () => {
    renderAdmin('/grilla/importar')
    const file = new File(['Velódromo,20:00,Falta y Resto\n'], 'grilla.csv', { type: 'text/csv' })
    await userEvent.upload(await screen.findByLabelText(/O subí un CSV/), file)
    expect(await screen.findByRole('alert')).toHaveTextContent('encabezado de la plantilla')
    expect(api.previewGrid).not.toHaveBeenCalled()
  })

  it('lee un CSV con la plantilla', async () => {
    renderAdmin('/grilla/importar')
    const file = new File(
      ['escenario,hora,conjunto,direccion\nJulia Arévalo,20:00,Caballeros,\n'],
      'grilla.csv',
      { type: 'text/csv' },
    )
    await userEvent.upload(await screen.findByLabelText(/O subí un CSV/), file)
    expect(await screen.findByText(/1 líneas: 1 nuevas/)).toBeInTheDocument()
  })
})
