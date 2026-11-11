import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient, withSql } from './clients'
import type { TablesUpdate } from '@cuerda/shared'
import { admin, limpiar, ok } from './helpers'

// Los avisos push: quién recibe qué (decisiones 47 a 49). Todo pasa por funciones que sólo
// ejecuta la service role; acá no se manda nada.

const NOCHE = '2031-03-10'
const OTRA_NOCHE = '2031-03-11'
const TOKEN_A = 'zz-aviso-a'
const TOKEN_B = 'zz-aviso-b'

const service = () => serviceClient()
const a = () => userClient(ctx().anonimoA)
const b = () => userClient(ctx().anonimoB)

const ids: Record<string, number> = {}
const acts: Record<string, number> = {}

const delDia = async (noche = NOCHE) =>
  ok(await service().rpc('tomar_avisos_del_dia', { p_noche: noche })).filter((f) =>
    f.conjunto_slug.startsWith('zz-'),
  )

/** Sin ventana de calma: toma todo lo encolado hasta dentro de un minuto. */
const deCambios = async (noche = NOCHE, hasta = new Date(Date.now() + 60_000)) =>
  ok(
    await service().rpc('tomar_avisos_de_cambios', {
      p_noche: noche,
      p_hasta: hasta.toISOString(),
    }),
  ).filter((f) => f.conjunto_slug.startsWith('zz-'))

const pendientes = async () =>
  (
    await withSql((sql) =>
      sql.query<{ actuacion_id: string }>(
        `select c.actuacion_id from public.cambios_actuacion c
           join public.actuaciones a on a.id = c.actuacion_id
           join public.conjuntos cj on cj.id = a.conjunto_id
          where cj.slug like 'zz-%' and c.procesado_en is null
          order by c.id`,
      ),
    )
  ).rows.map((r) => Number(r.actuacion_id))

const cambiar = async (clave: string, cambio: TablesUpdate<'actuaciones'>) =>
  ok(await service().from('actuaciones').update(cambio).eq('id', acts[clave]!).select('id'))

const cerrar = async (args: { p_avisos: number[] }) =>
  expect((await service().rpc('cerrar_avisos', args)).error).toBeNull()

/** Deja la cola de los tests vacía y sin avisos de cambio a medias. */
const vaciarCola = () => deCambios('1900-01-01')

const resumen = (filas: { token: string; conjunto_slug: string; escenario_nombre: string }[]) =>
  filas.map((f) => `${f.token} ${f.conjunto_slug} @ ${f.escenario_nombre}`).sort()

beforeAll(async () => {
  await limpiar()

  for (const slug of ['zz-av-uno', 'zz-av-dos', 'zz-av-tres', 'zz-av-cuatro']) {
    const fila = ok(
      await service()
        .from('conjuntos')
        .insert({ slug, nombre: `ZZ ${slug}`, categoria: 'murga' })
        .select('id')
        .single(),
    )
    ids[slug] = fila.id
  }
  for (const [slug, nombre, direccion] of [
    ['zz-av-norte', 'ZZ Tablado Norte', 'Calle Norte 1'],
    ['zz-av-sur', 'ZZ Tablado Sur', 'Calle Sur 2'],
  ] as const) {
    const fila = ok(
      await service().from('escenarios').insert({ slug, nombre, direccion }).select('id').single(),
    )
    ids[slug] = fila.id
  }

  const actuacion = async (clave: string, escenario: string, conjunto: string, inicio: string) => {
    const fila = ok(
      await service()
        .from('actuaciones')
        .insert({
          escenario_id: ids[escenario]!,
          conjunto_id: ids[conjunto]!,
          inicio,
          fuente: 'test',
        })
        .select('id')
        .single(),
    )
    acts[clave] = fila.id
  }
  // «uno» actúa en dos escenarios la misma noche, la segunda vez pasada la medianoche.
  await actuacion('uno-norte', 'zz-av-norte', 'zz-av-uno', '2031-03-10T21:00:00-03:00')
  await actuacion('uno-sur', 'zz-av-sur', 'zz-av-uno', '2031-03-11T00:30:00-03:00')
  await actuacion('dos-norte', 'zz-av-norte', 'zz-av-dos', '2031-03-10T22:00:00-03:00')
  await actuacion('tres-sur', 'zz-av-sur', 'zz-av-tres', '2031-03-10T22:30:00-03:00')
  // «cuatro» actúa recién la noche siguiente.
  await actuacion('cuatro-norte', 'zz-av-norte', 'zz-av-cuatro', '2031-03-11T21:00:00-03:00')
  // Cargada ya suspendida: no entra en el aviso del día.
  ok(
    await service()
      .from('actuaciones')
      .insert({
        escenario_id: ids['zz-av-sur']!,
        conjunto_id: ids['zz-av-dos']!,
        inicio: '2031-03-10T23:30:00-03:00',
        estado: 'suspendida',
        fuente: 'test',
      })
      .select('id'),
  )

  // A sigue a «uno» y a «tres» y tiene el teléfono en español; B sigue a «dos», en inglés.
  // El admin sigue a «uno» pero no registró ningún dispositivo: no recibe nada.
  ok(
    await a()
      .from('favoritos')
      .insert([{ conjunto_id: ids['zz-av-uno']! }, { conjunto_id: ids['zz-av-tres']! }])
      .select(),
  )
  ok(await b().from('favoritos').insert({ conjunto_id: ids['zz-av-dos']! }).select())
  ok(await admin().from('favoritos').insert({ conjunto_id: ids['zz-av-uno']! }).select())
  const registrar = (db: ReturnType<typeof a>, token: string, idioma: 'es' | 'en') =>
    db.rpc('registrar_dispositivo_push', {
      p_token: token,
      p_plataforma: 'android',
      p_idioma: idioma,
    })
  expect((await registrar(a(), TOKEN_A, 'es')).error).toBeNull()
  expect((await registrar(b(), TOKEN_B, 'en')).error).toBeNull()
})

afterAll(async () => {
  await withSql((sql) =>
    sql.query(
      `delete from public.favoritos
        where conjunto_id in (select id from public.conjuntos where slug like 'zz-%')`,
    ),
  )
  await limpiar()
})

describe('cola de cambios', () => {
  it('cargar una grilla entera de una vez no encola nada', async () => {
    // Las altas del beforeAll, más un lote entero en una sola sentencia.
    const lote = ok(
      await service()
        .from('actuaciones')
        .insert(
          ['zz-av-uno', 'zz-av-dos', 'zz-av-tres', 'zz-av-cuatro'].map((conjunto) => ({
            escenario_id: ids['zz-av-sur']!,
            conjunto_id: ids[conjunto]!,
            inicio: '2031-04-01T21:00:00-03:00',
            fuente: 'test',
          })),
        )
        .select('id'),
    )
    expect(lote).toHaveLength(4)
    expect(await pendientes()).toEqual([])
    ok(
      await service()
        .from('actuaciones')
        .delete()
        .in(
          'id',
          lote.map((f) => f.id),
        )
        .select('id'),
    )
  })

  it('un cambio que no toca hora, lugar ni estado no encola nada', async () => {
    await cambiar('dos-norte', { fuente_url: 'https://example.org/grilla' })
    await cambiar('dos-norte', { estado: 'programada' })
    expect(await pendientes()).toEqual([])
  })

  it('nadie más que la service role ve la cola ni el registro', async () => {
    for (const db of [anonClient(), a(), admin()]) {
      for (const tabla of ['cambios_actuacion', 'avisos_enviados'] as const) {
        const { data, error } = await db.from(tabla).select('id')
        expect(data).toBeNull()
        expect(error?.code).toBe('42501')
      }
    }
  })

  it('nadie más que la service role ejecuta las funciones de avisos', async () => {
    for (const db of [anonClient(), a(), admin()]) {
      const dia = await db.rpc('tomar_avisos_del_dia', { p_noche: NOCHE })
      const cambios = await db.rpc('tomar_avisos_de_cambios', {
        p_noche: NOCHE,
        p_hasta: new Date().toISOString(),
      })
      const cierre = await db.rpc('cerrar_avisos', { p_avisos: [1] })
      expect([dia.error?.code, cambios.error?.code, cierre.error?.code]).toEqual([
        '42501',
        '42501',
        '42501',
      ])
    }
  })
})

describe('tomar_avisos_del_dia', () => {
  let primera: Awaited<ReturnType<typeof delDia>>

  it('le toca a quien sigue al conjunto y tiene un dispositivo, y a nadie más', async () => {
    primera = await delDia()
    expect(resumen(primera)).toEqual([
      `${TOKEN_A} zz-av-tres @ ZZ Tablado Sur`,
      `${TOKEN_A} zz-av-uno @ ZZ Tablado Norte`,
      `${TOKEN_A} zz-av-uno @ ZZ Tablado Sur`,
      `${TOKEN_B} zz-av-dos @ ZZ Tablado Norte`,
    ])
    expect(new Set(primera.map((f) => f.usuario_id))).toEqual(
      new Set([ctx().anonimoA.id, ctx().anonimoB.id]),
    )
  })

  it('cada fila lleva el idioma del dispositivo, la hora y la dirección', () => {
    const deB = primera.find((f) => f.token === TOKEN_B)!
    expect(deB).toMatchObject({
      idioma: 'en',
      plataforma: 'android',
      conjunto_nombre: 'ZZ zz-av-dos',
      noche: NOCHE,
      direccion: 'Calle Norte 1',
    })
    expect(new Date(deB.inicio).toISOString()).toBe('2031-03-11T01:00:00.000Z')
    expect(primera.filter((f) => f.token === TOKEN_A).every((f) => f.idioma === 'es')).toBe(true)
  })

  it('un conjunto en dos escenarios la misma noche es un solo aviso con dos actuaciones', () => {
    const deUno = primera.filter((f) => f.conjunto_slug === 'zz-av-uno')
    expect(deUno).toHaveLength(2)
    expect(new Set(deUno.map((f) => f.aviso_id)).size).toBe(1)
    // Por hora: primero la de las 21:00 y después la de pasada la medianoche.
    expect(deUno.map((f) => f.escenario_nombre)).toEqual(['ZZ Tablado Norte', 'ZZ Tablado Sur'])
    expect(deUno.every((f) => f.noche === NOCHE)).toBe(true)
  })

  it('una actuación suspendida no entra', () => {
    expect(
      primera.some((f) => f.escenario_nombre === 'ZZ Tablado Sur' && f.token === TOKEN_B),
    ).toBe(false)
  })

  it('el mismo aviso no sale dos veces', async () => {
    expect(await delDia()).toEqual([])
    await cerrar({ p_avisos: primera.map((f) => f.aviso_id) })
    expect(await delDia()).toEqual([])
  })

  it('seguir otro conjunto más tarde trae sólo el aviso nuevo', async () => {
    ok(await b().from('favoritos').insert({ conjunto_id: ids['zz-av-tres']! }).select())
    expect(resumen(await delDia())).toEqual([`${TOKEN_B} zz-av-tres @ ZZ Tablado Sur`])
  })

  it('lo reclamado que no salió se vuelve a tomar pasados 5 minutos, hasta tres veces', async () => {
    const atrasar = () =>
      withSql((sql) =>
        sql.query(
          `update public.avisos_enviados
              set reclamado_en = now() - interval '6 minutes'
            where usuario_id = $1 and enviado_en is null`,
          [ctx().anonimoB.id],
        ),
      )
    // El de «tres» para B quedó reclamado y sin cerrar: enseguida no vuelve…
    expect(await delDia()).toEqual([])
    // …a los 6 minutos sí (segundo intento), y otra vez más (tercero)…
    await atrasar()
    expect(resumen(await delDia())).toEqual([`${TOKEN_B} zz-av-tres @ ZZ Tablado Sur`])
    await atrasar()
    expect(resumen(await delDia())).toEqual([`${TOKEN_B} zz-av-tres @ ZZ Tablado Sur`])
    // …y después del tercero no se insiste más.
    await atrasar()
    expect(await delDia()).toEqual([])
  })

  it('cada noche tiene sus avisos', async () => {
    expect(await delDia(OTRA_NOCHE)).toEqual([])
    ok(await a().from('favoritos').insert({ conjunto_id: ids['zz-av-cuatro']! }).select())
    expect(resumen(await delDia(OTRA_NOCHE))).toEqual([
      `${TOKEN_A} zz-av-cuatro @ ZZ Tablado Norte`,
    ])
  })
})

describe('tomar_avisos_de_cambios', () => {
  beforeAll(vaciarCola)

  it('una suspensión avisa a quien sigue al conjunto, una sola vez', async () => {
    await cambiar('dos-norte', { estado: 'suspendida' })
    expect(await pendientes()).toEqual([acts['dos-norte']])

    const filas = await deCambios()
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({
      token: TOKEN_B,
      idioma: 'en',
      usuario_id: ctx().anonimoB.id,
      conjunto_slug: 'zz-av-dos',
      actuacion_id: acts['dos-norte'],
      noche: NOCHE,
      estado: 'suspendida',
      estado_anterior: 'programada',
      escenario_nombre: 'ZZ Tablado Norte',
    })
    // Tomado y cerrado: no vuelve a salir.
    expect(await pendientes()).toEqual([])
    expect(await deCambios()).toEqual([])
  })

  it('un cambio de hora trae la hora nueva y la de antes', async () => {
    await cambiar('tres-sur', { inicio: '2031-03-10T23:10:00-03:00', estado: 'cambiada' })
    const filas = await deCambios()
    // A «tres» lo siguen A y B.
    expect(filas.map((f) => f.token).sort()).toEqual([TOKEN_A, TOKEN_B])
    for (const fila of filas) {
      expect(fila).toMatchObject({ estado: 'cambiada', estado_anterior: 'programada' })
      expect(new Date(fila.inicio).toISOString()).toBe('2031-03-11T02:10:00.000Z')
      expect(new Date(fila.inicio_anterior).toISOString()).toBe('2031-03-11T01:30:00.000Z')
    }
  })

  it('una suspendida que vuelve a estar programada se avisa como cambio', async () => {
    await cambiar('dos-norte', { estado: 'programada' })
    const filas = await deCambios()
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({
      token: TOKEN_B,
      estado: 'programada',
      estado_anterior: 'suspendida',
    })
  })

  it('un cambio de escenario o de parada también avisa, con el lugar nuevo', async () => {
    await cambiar('tres-sur', { escenario_id: ids['zz-av-norte']! })
    const mudanza = await deCambios()
    expect(mudanza.map((f) => f.token).sort()).toEqual([TOKEN_A, TOKEN_B])
    expect(mudanza[0]).toMatchObject({
      escenario_nombre: 'ZZ Tablado Norte',
      direccion: 'Calle Norte 1',
    })

    // La parada de esa noche (itinerantes) va en la actuación.
    await cambiar('tres-sur', { direccion_texto: 'Plaza Nueva' })
    const parada = await deCambios()
    expect(parada).toHaveLength(2)
    expect(parada[0]).toMatchObject({
      escenario_nombre: 'ZZ Tablado Norte',
      direccion: 'Plaza Nueva',
    })

    await cambiar('tres-sur', { escenario_id: ids['zz-av-sur']!, direccion_texto: null })
    await vaciarCola()
  })

  it('mientras se sigue tocando una actuación, espera (ventana de calma)', async () => {
    await cambiar('uno-norte', { inicio: '2031-03-10T21:15:00-03:00' })
    // Con el corte un minuto atrás, el cambio todavía está «caliente»: no se toma ni se cierra.
    expect(await deCambios(NOCHE, new Date(Date.now() - 60_000))).toEqual([])
    expect(await pendientes()).toEqual([acts['uno-norte']])

    // Otro cambio sobre la misma actuación: sigue siendo un solo aviso, con cómo quedó.
    await cambiar('uno-norte', { inicio: '2031-03-10T21:30:00-03:00' })
    expect(await pendientes()).toEqual([acts['uno-norte'], acts['uno-norte']])
    const filas = await deCambios()
    expect(filas).toHaveLength(1)
    expect(filas[0]!.token).toBe(TOKEN_A)
    expect(new Date(filas[0]!.inicio).toISOString()).toBe('2031-03-11T00:30:00.000Z')
    // La hora «de antes» es la de antes del primer cambio, no la intermedia.
    expect(new Date(filas[0]!.inicio_anterior).toISOString()).toBe('2031-03-11T00:00:00.000Z')
    expect(await pendientes()).toEqual([])
  })

  it('si la actuación quedó como estaba, no se avisa', async () => {
    await cambiar('uno-norte', { estado: 'suspendida' })
    await cambiar('uno-norte', { estado: 'programada' })
    expect(await pendientes()).toHaveLength(2)
    expect(await deCambios()).toEqual([])
    expect(await pendientes()).toEqual([])
  })

  it('correr toda la noche de una vez da las filas en una sola toma, no una por cambio', async () => {
    // Una sola sentencia que mueve todas las actuaciones de la noche media hora.
    await withSql((sql) =>
      sql.query(
        `update public.actuaciones
            set inicio = inicio + interval '30 minutes'
          where noche = $1
            and conjunto_id in (select id from public.conjuntos where slug like 'zz-av-%')
            and estado <> 'suspendida'`,
        [NOCHE],
      ),
    )
    expect(await pendientes()).toHaveLength(4)

    const filas = await deCambios()
    // A sigue a «uno» (dos actuaciones) y a «tres»; B, a «dos» y a «tres».
    expect(resumen(filas)).toEqual([
      `${TOKEN_A} zz-av-tres @ ZZ Tablado Sur`,
      `${TOKEN_A} zz-av-uno @ ZZ Tablado Norte`,
      `${TOKEN_A} zz-av-uno @ ZZ Tablado Sur`,
      `${TOKEN_B} zz-av-dos @ ZZ Tablado Norte`,
      `${TOKEN_B} zz-av-tres @ ZZ Tablado Sur`,
    ])
    // Todo lo de un dispositivo llega junto: el módulo de avisos arma una sola notificación.
    expect(new Set(filas.map((f) => f.token)).size).toBe(2)
    expect(await deCambios()).toEqual([])
  })

  it('los cambios de noches que ya pasaron se descartan', async () => {
    await cambiar('tres-sur', { estado: 'suspendida' })
    expect(await deCambios(OTRA_NOCHE)).toEqual([])
    expect(await pendientes()).toEqual([])
    // Y no reaparecen al pedir la noche correcta: ya se cerraron.
    expect(await deCambios()).toEqual([])
  })

  it('los de noches futuras sí se avisan', async () => {
    await cambiar('cuatro-norte', { inicio: '2031-03-11T22:00:00-03:00' })
    const filas = await deCambios()
    expect(filas).toHaveLength(1)
    expect(filas[0]).toMatchObject({ token: TOKEN_A, noche: OTRA_NOCHE })
  })

  it('sin dispositivo registrado no hay aviso, aunque siga al conjunto', async () => {
    ok(await service().from('dispositivos_push').delete().eq('token', TOKEN_A).select())
    await cambiar('cuatro-norte', { estado: 'suspendida' })
    expect(await deCambios()).toEqual([])
    expect(await pendientes()).toEqual([])
  })
})

describe('registro de avisos', () => {
  it('cerrar_avisos marca cuándo salió y no toca lo ya cerrado', async () => {
    const { rows } = await withSql((sql) =>
      sql.query<{ id: string; enviado_en: Date | null }>(
        `select id, enviado_en from public.avisos_enviados
          where usuario_id = $1 and tipo = 'cambio' order by id limit 1`,
        [ctx().anonimoB.id],
      ),
    )
    const aviso = rows[0]!
    expect(aviso.enviado_en).toBeNull()
    await cerrar({ p_avisos: [Number(aviso.id)] })
    const leer = async () =>
      (
        await withSql((sql) =>
          sql.query<{ enviado_en: Date }>(
            `select enviado_en from public.avisos_enviados where id = $1`,
            [aviso.id],
          ),
        )
      ).rows[0]!.enviado_en
    const cerrado = await leer()
    expect(cerrado).not.toBeNull()
    await cerrar({ p_avisos: [Number(aviso.id)] })
    expect((await leer()).getTime()).toBe(cerrado.getTime())
  })

  it('al borrar al usuario se van sus avisos', async () => {
    const { rows } = await withSql((sql) =>
      sql.query<{ confdeltype: string }>(
        `select confdeltype from pg_constraint
          where conrelid = 'public.avisos_enviados'::regclass and contype = 'f'`,
      ),
    )
    expect(rows.map((r) => r.confdeltype)).toEqual(['c'])
  })
})
