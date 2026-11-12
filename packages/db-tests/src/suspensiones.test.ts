import { buildChangeNotices } from '@cuerda/shared'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { ctx, serviceClient, userClient, withSql } from './clients'
import { admin, intrusos, limpiar, ok } from './helpers'

// Suspender una noche o un escenario y deshacerlo (decisión 72).

const NOCHE = '2031-04-10'
const OTRA_NOCHE = '2031-04-11'
const TOKEN_A = 'zz-susp-a'
const TOKEN_A2 = 'zz-susp-a2'
const TOKEN_B = 'zz-susp-b'

let norte: number
let sur: number
const acts: Record<string, number> = {}

const states = async () => {
  const rows = ok(
    await serviceClient().from('actuaciones').select('id, estado').in('id', Object.values(acts)),
  )
  return Object.fromEntries(
    Object.entries(acts).map(([key, id]) => [key, rows.find((r) => r.id === id)!.estado]),
  )
}

/** Toma los avisos de cambio sin ventana de calma y los cierra, como una pasada que sale bien. */
const takeNotices = async () => {
  const service = serviceClient()
  const rows = ok(
    await service.rpc('tomar_avisos_de_cambios', {
      p_noche: NOCHE,
      p_hasta: new Date(Date.now() + 60_000).toISOString(),
    }),
  ).filter((r) => r.conjunto_slug.startsWith('zz-'))
  if (rows.length > 0) {
    const closed = await service.rpc('cerrar_avisos', { p_avisos: rows.map((r) => r.aviso_id) })
    expect(closed.error).toBeNull()
  }
  return rows
}

beforeEach(async () => {
  await limpiar()
  await withSql((sql) => sql.query(`delete from public.suspensiones where noche >= '2031-01-01'`))
  const service = serviceClient()

  const groups = ok(
    await service
      .from('conjuntos')
      .insert(
        ['uno', 'dos', 'tres'].map((k) => ({
          slug: `zz-susp-${k}`,
          nombre: `Zz Susp ${k}`,
          categoria: 'murga' as const,
        })),
      )
      .select('id, slug'),
  )
  const group = (k: string) => groups.find((g) => g.slug === `zz-susp-${k}`)!.id
  const stages = ok(
    await service
      .from('escenarios')
      .insert([
        { slug: 'zz-susp-norte', nombre: 'Zz Susp Norte' },
        { slug: 'zz-susp-sur', nombre: 'Zz Susp Sur' },
      ])
      .select('id, slug'),
  )
  norte = stages.find((s) => s.slug === 'zz-susp-norte')!.id
  sur = stages.find((s) => s.slug === 'zz-susp-sur')!.id

  const rows = ok(
    await service
      .from('actuaciones')
      .insert(
        [
          { key: 'unoNorte', escenario_id: norte, conjunto_id: group('uno'), hora: '23:00' },
          { key: 'dosNorte', escenario_id: norte, conjunto_id: group('dos'), hora: '23:50' },
          { key: 'unoSur', escenario_id: sur, conjunto_id: group('uno'), hora: '22:00' },
          { key: 'tresSur', escenario_id: sur, conjunto_id: group('tres'), hora: '22:50' },
        ].map(({ escenario_id, conjunto_id, hora }) => ({
          escenario_id,
          conjunto_id,
          inicio: `${NOCHE}T${hora}:00Z`,
          fuente: 'test',
        })),
      )
      .select('id, escenario_id, conjunto_id'),
  )
  const find = (escenario: number, conjunto: number) =>
    rows.find((r) => r.escenario_id === escenario && r.conjunto_id === conjunto)!.id
  acts.unoNorte = find(norte, group('uno'))
  acts.dosNorte = find(norte, group('dos'))
  acts.unoSur = find(sur, group('uno'))
  acts.tresSur = find(sur, group('tres'))

  // Otra noche, que no se tiene que tocar.
  acts.otraNoche = ok(
    await service
      .from('actuaciones')
      .insert({
        escenario_id: norte,
        conjunto_id: group('uno'),
        inicio: `${OTRA_NOCHE}T23:00:00Z`,
        fuente: 'test',
      })
      .select('id')
      .single(),
  ).id

  // «dosNorte» ya venía cambiada: al deshacer tiene que volver a «cambiada».
  ok(
    await service
      .from('actuaciones')
      .update({ estado: 'cambiada' })
      .eq('id', acts.dosNorte!)
      .select('id'),
  )

  // A sigue a uno y a dos, con dos teléfonos; B sigue a tres, con uno.
  const a = userClient(ctx().anonimoA)
  const b = userClient(ctx().anonimoB)
  await a.from('favoritos').delete().gt('conjunto_id', 0)
  await b.from('favoritos').delete().gt('conjunto_id', 0)
  ok(
    await a
      .from('favoritos')
      .insert([{ conjunto_id: group('uno') }, { conjunto_id: group('dos') }])
      .select('conjunto_id'),
  )
  ok(
    await b
      .from('favoritos')
      .insert({ conjunto_id: group('tres') })
      .select('conjunto_id'),
  )
  for (const [client, token] of [
    [a, TOKEN_A],
    [a, TOKEN_A2],
    [b, TOKEN_B],
  ] as const) {
    const res = await client.rpc('registrar_dispositivo_push', {
      p_token: token,
      p_plataforma: 'android',
      p_idioma: 'es',
    })
    expect(res.error).toBeNull()
  }

  // La cola arranca vacía: el cambio de estado de arriba no cuenta para estos tests.
  await takeNotices()
})

afterAll(async () => {
  await limpiar()
  await withSql((sql) => sql.query(`delete from public.suspensiones where noche >= '2031-01-01'`))
})

describe('suspender_noche', () => {
  it('suspende toda la noche y sólo esa noche', async () => {
    const [res] = ok(await admin().rpc('suspender_noche', { p_noche: NOCHE, p_motivo: 'Lluvia' }))
    expect(res!.actuaciones).toBe(4)
    expect(await states()).toEqual({
      unoNorte: 'suspendida',
      dosNorte: 'suspendida',
      unoSur: 'suspendida',
      tresSur: 'suspendida',
      otraNoche: 'programada',
    })

    const saved = ok(
      await admin()
        .from('suspensiones')
        .select('noche, motivo, creado_por, creado_email, deshecha_en')
        .eq('id', res!.suspension_id)
        .single(),
    )
    expect(saved).toMatchObject({
      noche: NOCHE,
      motivo: 'Lluvia',
      creado_por: ctx().admin.id,
      deshecha_en: null,
    })
    expect(saved.creado_email).toMatch(/@cuerda\.invalid$/)
  })

  it('suspende sólo los escenarios elegidos', async () => {
    const [res] = ok(await admin().rpc('suspender_noche', { p_noche: NOCHE, p_escenarios: [sur] }))
    expect(res!.actuaciones).toBe(2)
    expect(await states()).toMatchObject({
      unoNorte: 'programada',
      dosNorte: 'cambiada',
      unoSur: 'suspendida',
      tresSur: 'suspendida',
    })
  })

  it('manda un solo aviso por dispositivo, con todo lo suyo', async () => {
    ok(await admin().rpc('suspender_noche', { p_noche: NOCHE }))

    const rows = await takeNotices()
    // A sigue a uno (dos escenarios) y a dos: tres actuaciones, en dos teléfonos. B, una.
    expect(rows).toHaveLength(7)

    const notices = buildChangeNotices(rows, NOCHE)
    expect(notices.map((n) => n.token).sort()).toEqual([TOKEN_A, TOKEN_A2, TOKEN_B])
    const forA = notices.find((n) => n.token === TOKEN_A)!
    expect(forA.noticeIds).toHaveLength(3)

    // Ya avisado: una segunda pasada no manda nada.
    expect(await takeNotices()).toEqual([])
  })

  it('sin nada para suspender no crea una suspensión', async () => {
    ok(await admin().rpc('suspender_noche', { p_noche: NOCHE }))
    const [again] = ok(await admin().rpc('suspender_noche', { p_noche: NOCHE }))
    expect(again).toEqual({ suspension_id: null, actuaciones: 0 })
    const all = ok(await admin().from('suspensiones').select('id').eq('noche', NOCHE))
    expect(all).toHaveLength(1)
  })

  it.each(intrusos)('%s no puede suspender', async (_nombre, cliente) => {
    const res = await cliente().rpc('suspender_noche', { p_noche: NOCHE })
    expect(res.error?.code).toBe('42501')
    expect(await states()).toMatchObject({ unoNorte: 'programada', tresSur: 'programada' })
  })

  it.each(intrusos)('%s no puede leer las suspensiones', async (_nombre, cliente) => {
    ok(await admin().rpc('suspender_noche', { p_noche: NOCHE }))
    for (const table of ['suspensiones', 'suspension_actuaciones'] as const) {
      const res = await cliente().from(table).select('*').limit(1)
      if (res.error) expect(res.error.code).toBe('42501')
      else expect(res.data).toEqual([])
    }
  })
})

describe('deshacer_suspension', () => {
  it('devuelve cada actuación a como estaba y avisa que vuelven', async () => {
    const [res] = ok(await admin().rpc('suspender_noche', { p_noche: NOCHE }))
    await takeNotices()

    const undone = ok(
      await admin().rpc('deshacer_suspension', { p_suspension_id: res!.suspension_id }),
    )
    expect(undone).toBe(4)
    expect(await states()).toMatchObject({
      unoNorte: 'programada',
      dosNorte: 'cambiada',
      unoSur: 'programada',
      tresSur: 'programada',
    })

    const notices = buildChangeNotices(await takeNotices(), NOCHE)
    expect(notices.map((n) => n.token).sort()).toEqual([TOKEN_A, TOKEN_A2, TOKEN_B])
  })

  it('deshecha antes de que salga el aviso, no avisa nada', async () => {
    const [res] = ok(await admin().rpc('suspender_noche', { p_noche: NOCHE }))
    ok(await admin().rpc('deshacer_suspension', { p_suspension_id: res!.suspension_id }))
    expect(await takeNotices()).toEqual([])
  })

  it('no pisa una actuación que alguien reprogramó a mano', async () => {
    const [res] = ok(await admin().rpc('suspender_noche', { p_noche: NOCHE }))
    ok(
      await serviceClient()
        .from('actuaciones')
        .update({ estado: 'cambiada' })
        .eq('id', acts.unoSur!)
        .select('id'),
    )
    const undone = ok(
      await admin().rpc('deshacer_suspension', { p_suspension_id: res!.suspension_id }),
    )
    expect(undone).toBe(3)
    expect((await states()).unoSur).toBe('cambiada')
  })

  it('no se puede deshacer dos veces', async () => {
    const [res] = ok(await admin().rpc('suspender_noche', { p_noche: NOCHE }))
    ok(await admin().rpc('deshacer_suspension', { p_suspension_id: res!.suspension_id }))
    const again = await admin().rpc('deshacer_suspension', {
      p_suspension_id: res!.suspension_id,
    })
    expect(again.error?.message).toMatch(/ya se deshizo/)
  })

  it.each(intrusos)('%s no puede deshacer', async (_nombre, cliente) => {
    const [res] = ok(await admin().rpc('suspender_noche', { p_noche: NOCHE }))
    const undone = await cliente().rpc('deshacer_suspension', {
      p_suspension_id: res!.suspension_id,
    })
    expect(undone.error?.code).toBe('42501')
    expect((await states()).unoNorte).toBe('suspendida')
  })
})
