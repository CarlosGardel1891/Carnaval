import type { Json } from '@cuerda/shared'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { serviceClient, withSql } from './clients'
import { admin, intrusos, limpiar, ok } from './helpers'

const NOCHE = '2031-02-01'
const OTRA_NOCHE = '2031-02-02'
const FUENTE = 'Cartelera de prueba'
const FUENTE_URL = 'https://example.com/cartelera'

interface Line {
  n: number
  escenario?: string
  escenario_id?: number
  escenario_nuevo?: string
  conjunto?: string
  conjunto_id?: number
  conjunto_nuevo?: string
  hora: string
  direccion?: string
  lat?: number
  lng?: number
}

let uno: number
let dos: number
let fijo: number
let movil: number

const base = (): Line[] => [
  { n: 1, escenario: 'ZZ IMP FIJO', conjunto: 'zz imp uno', hora: '20:00' },
  { n: 2, escenario: 'Zz Imp Fijo', conjunto: 'ZZ IMP DÓS', hora: '00:30' },
]

const preview = async (lines: Line[], noche = NOCHE) =>
  ok(
    await admin().rpc('previsualizar_grilla', {
      p_noche: noche,
      p_filas: lines as unknown as Json,
    }),
  )

const publish = (
  lines: Line[],
  extra: { alias?: Json; nuevos?: Json; sobrantes?: Json; noche?: string; fuente?: string } = {},
) =>
  admin().rpc('publicar_grilla', {
    p_noche: extra.noche ?? NOCHE,
    p_fuente: extra.fuente ?? FUENTE,
    p_fuente_url: FUENTE_URL,
    p_filas: lines as unknown as Json,
    p_alias: extra.alias ?? [],
    p_nuevos: extra.nuevos ?? {},
    p_sobrantes: extra.sobrantes ?? [],
  })

const acts = async (noche = NOCHE) =>
  ok(
    await serviceClient()
      .from('actuaciones')
      .select(
        'id, escenario_id, conjunto_id, inicio, estado, direccion_texto, fuente, fuente_url, actualizado_en',
      )
      .eq('noche', noche)
      .in('escenario_id', [fijo, movil])
      .order('inicio'),
  )

const queued = async (ids: number[]) =>
  ok(await serviceClient().from('cambios_actuacion').select('id').in('actuacion_id', ids)).length

const logged = (ids: number[]) =>
  withSql(async (sql) => {
    const res = await sql.query(
      `select operacion from public.registro_cambios
        where tabla = 'actuaciones' and fila = any($1::text[]) order by id`,
      [ids.map(String)],
    )
    return res.rows.map((r: { operacion: string }) => r.operacion)
  })

async function seed() {
  await limpiar()
  const service = serviceClient()
  const conjuntos = ok(
    await service
      .from('conjuntos')
      .insert(
        [
          { slug: 'zz-imp-uno', nombre: 'Zz Imp Uno', categoria: 'murga', alias: ['ZZ IMP 1'] },
          { slug: 'zz-imp-dos', nombre: 'Zz Imp Dós', categoria: 'comparsa', alias: [] },
        ],
        { defaultToNull: false },
      )
      .select('id, slug'),
  )
  uno = conjuntos.find((c) => c.slug === 'zz-imp-uno')!.id
  dos = conjuntos.find((c) => c.slug === 'zz-imp-dos')!.id
  const escenarios = ok(
    await service
      .from('escenarios')
      .insert([
        { slug: 'zz-imp-fijo', nombre: 'Zz Imp Fijo', tipo: 'popular', itinerante: false },
        { slug: 'zz-imp-movil', nombre: 'Zz Imp Móvil', tipo: 'movil', itinerante: true },
      ])
      .select('id, slug'),
  )
  fijo = escenarios.find((e) => e.slug === 'zz-imp-fijo')!.id
  movil = escenarios.find((e) => e.slug === 'zz-imp-movil')!.id
}

beforeAll(seed)
afterAll(limpiar)

describe('previsualizar_grilla', () => {
  beforeEach(seed)

  it('reconoce por nombre y por alias, sin mayúsculas ni tildes, y nada más', async () => {
    const rows = await preview([
      { n: 1, escenario: 'zz imp fijo', conjunto: 'ZZ IMP UNO', hora: '20:00' },
      { n: 2, escenario: 'ZZ IMP FIJO', conjunto: 'zz imp 1', hora: '21:00' },
      { n: 3, escenario: 'Zz Imp Fijo', conjunto: 'Zz Imp Un', hora: '22:00' },
      { n: 4, escenario: 'Zz Imp Fij', conjunto: 'Zz Imp Dós', hora: '22:30' },
    ])
    expect(rows.map((r) => [r.n, r.escenario_id, r.conjunto_id, r.estado])).toEqual([
      [1, fijo, uno, 'duplicada'],
      [2, fijo, uno, 'duplicada'],
      [3, fijo, null, 'sin_coincidencia'],
      [4, null, dos, 'sin_coincidencia'],
    ])
  })

  it('las horas son de Montevideo y la madrugada es de esa noche', async () => {
    const rows = await preview(base())
    expect(rows.map((r) => [r.estado, new Date(r.inicio).toISOString()])).toEqual([
      ['nueva', '2031-02-01T23:00:00.000Z'],
      ['nueva', '2031-02-02T03:30:00.000Z'],
    ])
  })

  it('un encabezado que no dice cuál móvil es queda sin coincidencia hasta que el admin elige', async () => {
    const line: Line = {
      n: 1,
      escenario: 'ESCENARIOS MÓVILES',
      conjunto: 'Zz Imp Uno',
      hora: '20:00',
      direccion: 'Plaza Zz, Ingavi y Canstatt',
    }
    const [before] = await preview([line])
    expect(before).toMatchObject({ estado: 'sin_coincidencia', escenario_id: null })

    const [after] = await preview([{ ...line, escenario_id: movil }])
    expect(after).toMatchObject({
      estado: 'nueva',
      escenario_id: movil,
      escenario_itinerante: true,
      direccion: 'Plaza Zz, Ingavi y Canstatt',
    })
  })

  it('no escribe nada', async () => {
    await preview(base())
    expect(await acts()).toEqual([])
  })
})

describe('publicar_grilla', () => {
  beforeEach(seed)

  it('carga una noche nueva con su fuente y sin encolar avisos', async () => {
    const [res] = ok(await publish(base()))
    expect(res).toMatchObject({ nuevas: 2, cambiadas: 0, iguales: 0 })

    const rows = await acts()
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row).toMatchObject({ estado: 'programada', fuente: FUENTE, fuente_url: FUENTE_URL })
    }
    expect(await queued(rows.map((r) => r.id))).toBe(0)
  })

  it('reimportar la misma noche no duplica ni toca nada', async () => {
    ok(await publish(base()))
    const before = await acts()

    const [res] = ok(await publish(base(), { fuente: 'Otra fuente' }))
    expect(res).toMatchObject({ nuevas: 0, cambiadas: 0, iguales: 2 })

    const after = await acts()
    expect(after).toEqual(before)
    const ids = after.map((r) => r.id)
    expect(await queued(ids)).toBe(0)
    expect(await logged(ids)).toEqual(['alta', 'alta'])
  })

  it('un cambio de hora deja la actuación cambiada y encola su aviso', async () => {
    ok(await publish(base()))
    const lines = base()
    lines[0]!.hora = '21:15'

    expect((await preview(lines)).map((r) => r.estado)).toEqual(['cambia', 'igual'])
    const [res] = ok(await publish(lines))
    expect(res).toMatchObject({ nuevas: 0, cambiadas: 1, iguales: 1 })

    const rows = await acts()
    const changed = rows.find((r) => r.conjunto_id === uno)!
    const same = rows.find((r) => r.conjunto_id === dos)!
    expect(new Date(changed.inicio).toISOString()).toBe('2031-02-02T00:15:00.000Z')
    expect(changed.estado).toBe('cambiada')
    expect(same.estado).toBe('programada')
    expect(await queued([changed.id])).toBe(1)
    expect(await queued([same.id])).toBe(0)
  })

  it('una suspendida sigue suspendida aunque la importación le cambie la hora', async () => {
    ok(await publish(base()))
    const [first] = await acts()
    ok(
      await serviceClient()
        .from('actuaciones')
        .update({ estado: 'suspendida' })
        .eq('id', first!.id)
        .select('id'),
    )
    const lines = base()
    lines[0]!.hora = '21:15'
    ok(await publish(lines))
    const row = (await acts()).find((r) => r.id === first!.id)!
    expect(row.estado).toBe('suspendida')
  })

  it('el móvil que eligió el admin lleva la parada en la actuación, no en el escenario', async () => {
    const [res] = ok(
      await publish([
        {
          n: 1,
          escenario: 'ESCENARIOS MÓVILES',
          escenario_id: movil,
          conjunto: 'Zz Imp Uno',
          hora: '20:00',
          direccion: 'Plaza Zz, Ingavi y Canstatt',
          lat: -34.9101,
          lng: -56.1802,
        },
      ]),
    )
    expect(res).toMatchObject({ nuevas: 1, alias_agregados: 0 })

    const [row] = await acts()
    expect(row).toMatchObject({
      escenario_id: movil,
      direccion_texto: 'Plaza Zz, Ingavi y Canstatt',
    })
    const stage = ok(
      await serviceClient()
        .from('escenarios')
        .select('alias, direccion, ubicacion')
        .eq('id', movil)
        .single(),
    )
    expect(stage).toEqual({ alias: [], direccion: null, ubicacion: null })

    const night = ok(await serviceClient().rpc('actuaciones_de_la_noche', { p_noche: NOCHE }))
    const shown = night.find((a) => a.actuacion_id === row!.id)!
    expect(shown.lat).toBeCloseTo(-34.9101, 4)
    expect(shown.lng).toBeCloseTo(-56.1802, 4)
  })

  it('agrega un alias y desde ahí ese nombre coincide', async () => {
    const lines: Line[] = [
      { n: 1, escenario: 'Zz Imp Fijo', conjunto: 'LOS ZZ IMP', conjunto_id: uno, hora: '20:00' },
    ]
    const [res] = ok(
      await publish(lines, { alias: [{ tipo: 'conjunto', id: uno, alias: 'LOS ZZ IMP' }] }),
    )
    expect(res).toMatchObject({ nuevas: 1, alias_agregados: 1 })

    const [again] = await preview(
      [{ n: 1, escenario: 'Zz Imp Fijo', conjunto: 'los zz imp', hora: '20:00' }],
      OTRA_NOCHE,
    )
    expect(again).toMatchObject({ conjunto_id: uno, estado: 'nueva' })

    // Publicarlo otra vez con el mismo alias no lo repite.
    const [repeat] = ok(
      await publish(lines, { alias: [{ tipo: 'conjunto', id: uno, alias: 'los zz imp' }] }),
    )
    expect(repeat).toMatchObject({ iguales: 1, alias_agregados: 0 })
  })

  it('crea el conjunto y el escenario que el admin confirmó', async () => {
    const [res] = ok(
      await publish(
        [
          {
            n: 1,
            escenario: 'Zz Imp Tablado Nuevo',
            escenario_nuevo: 'e1',
            conjunto: 'Zz Imp Nuevo',
            conjunto_nuevo: 'c1',
            hora: '22:00',
          },
        ],
        {
          nuevos: {
            conjuntos: [{ clave: 'c1', nombre: 'Zz Imp Nuevo', categoria: 'humoristas' }],
            escenarios: [
              { clave: 'e1', nombre: 'Zz Imp Tablado Nuevo', tipo: 'popular', itinerante: false },
            ],
          },
        },
      ),
    )
    expect(res).toMatchObject({ nuevas: 1, conjuntos_creados: 1, escenarios_creados: 1 })

    const service = serviceClient()
    const group = ok(
      await service
        .from('conjuntos')
        .select('id, categoria, fuente_url')
        .eq('slug', 'zz-imp-nuevo')
        .single(),
    )
    expect(group).toMatchObject({ categoria: 'humoristas', fuente_url: [FUENTE_URL] })
    const stage = ok(
      await service
        .from('escenarios')
        .select('id, tipo')
        .eq('slug', 'zz-imp-tablado-nuevo')
        .single(),
    )
    const rows = ok(
      await service.from('actuaciones').select('conjunto_id').eq('escenario_id', stage.id),
    )
    expect(rows).toEqual([{ conjunto_id: group.id }])
  })

  it('es todo o nada: una línea sin coincidencia no deja nada cargado', async () => {
    const lines = [
      ...base(),
      { n: 3, escenario: 'Zz Imp Fijo', conjunto: 'Zz No Existe', hora: '23:00' },
    ]
    const res = await publish(lines)
    expect(res.error?.message).toMatch(/sin conjunto o sin escenario reconocido: 3/)
    expect(await acts()).toEqual([])
  })

  it('es todo o nada: un alias que choca deshace también lo que se había creado', async () => {
    const res = await publish(
      [
        {
          n: 1,
          escenario: 'Zz Imp Fijo',
          conjunto: 'Zz Imp Nuevo',
          conjunto_nuevo: 'c1',
          hora: '20:00',
        },
        { n: 2, escenario: 'Zz Imp Fijo', conjunto: 'Zz Imp Uno', hora: '21:00' },
      ],
      {
        nuevos: { conjuntos: [{ clave: 'c1', nombre: 'Zz Imp Nuevo', categoria: 'murga' }] },
        // «ZZ IMP 1» ya es alias del conjunto uno: no puede ser también del dos.
        alias: [{ tipo: 'conjunto', id: dos, alias: 'zz imp 1' }],
      },
    )
    expect(res.error?.code).toBe('23505')
    expect(await acts()).toEqual([])
    const created = ok(
      await serviceClient().from('conjuntos').select('id').eq('slug', 'zz-imp-nuevo'),
    )
    expect(created).toEqual([])
  })

  it('rechaza un conjunto repetido en el mismo escenario', async () => {
    const res = await publish([
      { n: 1, escenario: 'Zz Imp Fijo', conjunto: 'Zz Imp Uno', hora: '20:00' },
      { n: 2, escenario: 'Zz Imp Fijo', conjunto: 'ZZ IMP 1', hora: '23:00' },
    ])
    expect(res.error?.message).toMatch(/dos veces en el mismo escenario/)
    expect(await acts()).toEqual([])
  })

  it('rechaza una hora mal escrita, una fuente vacía y las fuentes de prueba', async () => {
    const badHour = await publish([
      { n: 7, escenario: 'Zz Imp Fijo', conjunto: 'Zz Imp Uno', hora: '25:00' },
    ])
    expect(badHour.error?.message).toMatch(/hora válida.*7/)

    const noSource = await publish(base(), { fuente: '  ' })
    expect(noSource.error?.message).toMatch(/Falta la fuente/)

    for (const fuente of ['ficticia', 'Fixture-Ficticio', 'orden-ficticio']) {
      const res = await publish(base(), { fuente })
      expect(res.error?.message).toMatch(/reservada para los datos de prueba/)
    }
    expect(await acts()).toEqual([])
  })

  it('lo cargado que no viene se deja, salvo que el admin lo marque', async () => {
    ok(await publish(base()))
    const onlyFirst = base().slice(0, 1)

    const extra = ok(
      await admin().rpc('grilla_sobrante', {
        p_noche: NOCHE,
        p_filas: onlyFirst as unknown as Json,
      }),
    )
    expect(extra.map((s) => s.conjunto_id)).toEqual([dos])

    const [kept] = ok(await publish(onlyFirst))
    expect(kept).toMatchObject({ iguales: 1, suspendidas: 0, borradas: 0 })
    expect(await acts()).toHaveLength(2)

    const id = extra[0]!.actuacion_id
    const [suspended] = ok(await publish(onlyFirst, { sobrantes: [{ id, accion: 'suspender' }] }))
    expect(suspended).toMatchObject({ suspendidas: 1 })
    expect((await acts()).find((r) => r.id === id)!.estado).toBe('suspendida')
    expect(await queued([id])).toBe(1)

    const [removed] = ok(await publish(onlyFirst, { sobrantes: [{ id, accion: 'borrar' }] }))
    expect(removed).toMatchObject({ borradas: 1 })
    expect((await acts()).map((r) => r.conjunto_id)).toEqual([uno])
  })

  it('no toca lo marcado como sobrante si es de otra noche', async () => {
    ok(await publish(base()))
    const [first] = await acts()
    const [res] = ok(
      await publish(base(), {
        noche: OTRA_NOCHE,
        sobrantes: [{ id: first!.id, accion: 'borrar' }],
      }),
    )
    expect(res).toMatchObject({ nuevas: 2, borradas: 0 })
    expect(await acts()).toHaveLength(2)
  })

  it.each(intrusos)('%s no puede publicar', async (_nombre, cliente) => {
    const res = await cliente().rpc('publicar_grilla', {
      p_noche: NOCHE,
      p_fuente: FUENTE,
      p_fuente_url: FUENTE_URL,
      p_filas: base() as unknown as Json,
    })
    expect(res.error?.code).toBe('42501')
    expect(await acts()).toEqual([])
  })

  it('la service role tampoco: publicar es de un admin con sesión', async () => {
    const res = await serviceClient().rpc('publicar_grilla', {
      p_noche: NOCHE,
      p_fuente: FUENTE,
      p_fuente_url: FUENTE_URL,
      p_filas: base() as unknown as Json,
    })
    expect(res.error?.code).toBe('42501')
  })
})
