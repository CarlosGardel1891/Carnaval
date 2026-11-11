import { readFileSync } from 'node:fs'
import { norm } from '@cuerda/shared'
import { describe, expect, it } from 'vitest'
import { anonClient, serviceClient, withSql } from './clients'
import { ok } from './helpers'
import { readResearchCsv, repoPath } from './research'

// El seed (supabase/seeds/02_research.sql) tiene que dejar en la base lo mismo que dicen los
// CSV de research/. Acá se leen los CSV por separado del generador, y se compara.

const TEMPORADA = 2027
const SEED = repoPath('supabase', 'seeds', '02_research.sql')

const conjuntosCsv = readResearchCsv('conjuntos.csv')
const escenariosCsv = readResearchCsv('escenarios.csv')
const eventosCsv = readResearchCsv(`calendario_${TEMPORADA}.csv`)

const list = (value: string, separator: string) =>
  value
    .split(separator)
    .map((s) => s.trim())
    .filter(Boolean)
const orNull = (value: string) => (value === '' ? null : value)
const bool = (value: string) => (value === '' ? null : value === 'true')
const bySlug = <T extends { slug: string }>(rows: T[]) =>
  [...rows].sort((a, b) => (a.slug < b.slug ? -1 : 1))

const participacion = async () =>
  withSql(async (sql) => {
    const { rows } = await sql.query<{
      slug: string
      en_concurso: boolean | null
      en_llamadas: boolean
    }>(
      `select c.slug, ct.en_concurso, ct.en_llamadas
         from public.conjunto_temporada ct
         join public.conjuntos c on c.id = ct.conjunto_id
         join public.temporadas t on t.id = ct.temporada_id
        where t.anio = $1 and c.slug not like 'zz-%'`,
      [TEMPORADA],
    )
    return bySlug(rows)
  })

const participacionEsperada = bySlug(
  conjuntosCsv
    .filter((c) => c.temporada_lista === String(TEMPORADA))
    .map((c) => ({
      slug: c.slug!,
      en_concurso: bool(c.en_concurso!),
      en_llamadas: c.en_llamadas === 'true',
    })),
)

describe('seed: lo que hay en la base es lo que dicen los CSV', () => {
  it('conjuntos', async () => {
    const filas = ok(
      await anonClient()
        .from('conjuntos')
        .select(
          'slug, nombre, alias, categoria, barrio, instagram, facebook, verificado, fuente_url, bio, foto_url',
        )
        .not('slug', 'like', 'zz-%'),
    )
    expect(conjuntosCsv.length).toBeGreaterThan(100)
    expect(bySlug(filas)).toEqual(
      bySlug(
        conjuntosCsv.map((c) => ({
          slug: c.slug!,
          nombre: c.nombre,
          alias: list(c.alias!, '|'),
          categoria: c.categoria,
          barrio: orNull(c.barrio!),
          instagram: orNull(c.instagram_url!),
          facebook: orNull(c.facebook_url!),
          verificado: c.verificado === 'true',
          fuente_url: list(c.fuente_url!, ' | '),
          bio: null,
          foto_url: null,
        })),
      ),
    )
  })

  it(`participación ${TEMPORADA}: sólo los respaldados por una lista ${TEMPORADA}; en_concurso vacío es null`, async () => {
    expect(participacionEsperada.length).toBeGreaterThan(0)
    expect(await participacion()).toEqual(participacionEsperada)
  })

  it('escenarios', async () => {
    const filas = ok(
      await anonClient()
        .from('escenarios')
        .select(
          'slug, nombre, alias, tipo, direccion, barrio, precio_texto, gratis, activo, itinerante, fuente_url',
        )
        .not('slug', 'like', 'zz-%')
        .not('slug', 'like', 'ficticio-%'),
    )
    expect(escenariosCsv.length).toBeGreaterThan(30)
    expect(bySlug(filas)).toEqual(
      bySlug(
        escenariosCsv.map((e) => ({
          slug: e.slug!,
          nombre: e.nombre,
          alias: list(e.alias!, '|'),
          tipo: orNull(e.tipo!),
          direccion: orNull(e.direccion!),
          barrio: orNull(e.barrio!),
          precio_texto: orNull(e.precio_texto!),
          gratis: bool(e.gratis!),
          activo: e.activo === 'true',
          itinerante: bool(e.itinerante!),
          fuente_url: list(e.fuente_url!, ' | '),
        })),
      ),
    )
  })

  it(`eventos, todos de la temporada ${TEMPORADA}`, async () => {
    const service = serviceClient()
    const temporada = ok(
      await service.from('temporadas').select('id').eq('anio', TEMPORADA).single(),
    )
    const filas = ok(
      await anonClient()
        .from('eventos')
        .select(
          'slug, temporada_id, tipo, nombre, fecha_inicio, fecha_fin, lugar, estado, fuente_url, recorrido, info',
        )
        .not('slug', 'like', 'zz-%'),
    )
    expect(eventosCsv.length).toBeGreaterThan(10)
    expect(bySlug(filas)).toEqual(
      bySlug(
        eventosCsv.map((e) => ({
          slug: e.slug!,
          temporada_id: temporada.id,
          tipo: e.tipo,
          nombre: e.evento,
          fecha_inicio: e.fecha_inicio,
          fecha_fin: e.fecha_fin,
          lugar: orNull(e.lugar!),
          estado: e.estado,
          fuente_url: list(e.fuente_url!, ' | '),
          recorrido: null,
          info: orNull(e.info!),
        })),
      ),
    )
  })

  it('las Llamadas son un evento por noche', async () => {
    const llamadas = ok(
      await anonClient()
        .from('eventos')
        .select('slug, fecha_inicio, fecha_fin')
        .eq('tipo', 'llamadas')
        .not('slug', 'like', 'zz-%')
        .order('fecha_inicio'),
    )
    expect(llamadas).toHaveLength(2)
    expect(llamadas.every((e) => e.fecha_inicio === e.fecha_fin)).toBe(true)
    expect(llamadas[0]!.fecha_inicio).not.toBe(llamadas[1]!.fecha_inicio)
  })
})

describe('seed: nombres y alias', () => {
  it('cada nombre o alias de un conjunto, normalizado, lleva a ese conjunto', async () => {
    const claves = await withSql(async (sql) => {
      const { rows } = await sql.query<{ nombre_norm: string; slug: string }>(
        `select n.nombre_norm, c.slug
           from public.conjunto_nombres n join public.conjuntos c on c.id = n.conjunto_id`,
      )
      return new Map(rows.map((r) => [r.nombre_norm, r.slug]))
    })
    for (const c of conjuntosCsv) {
      for (const nombre of [c.nombre!, ...list(c.alias!, '|')]) {
        expect(claves.get(norm(nombre)), nombre).toBe(c.slug)
      }
    }
  })

  it('cada nombre o alias de un escenario, normalizado, lleva a ese escenario', async () => {
    const claves = await withSql(async (sql) => {
      const { rows } = await sql.query<{ nombre_norm: string; slug: string }>(
        `select n.nombre_norm, e.slug
           from public.escenario_nombres n join public.escenarios e on e.id = n.escenario_id`,
      )
      return new Map(rows.map((r) => [r.nombre_norm, r.slug]))
    })
    for (const e of escenariosCsv) {
      for (const nombre of [e.nombre!, ...list(e.alias!, '|')]) {
        expect(claves.get(norm(nombre)), nombre).toBe(e.slug)
      }
    }
  })

  it('buscar_por_nombre reconoce un alias tal como lo publica la prensa', async () => {
    const conAlias = escenariosCsv.find((e) => e.alias !== '')!
    const alias = list(conAlias.alias!, '|')[0]!
    const filas = ok(await anonClient().rpc('buscar_por_nombre', { p_texto: alias }))
    expect(filas.map((f) => [f.tipo, f.slug])).toEqual([['escenario', conAlias.slug]])
  })
})

describe('seed: se puede volver a correr', () => {
  const correrSeed = () => withSql((sql) => sql.query(readFileSync(SEED, 'utf8')))
  const ids = () =>
    withSql(async (sql) => {
      const { rows } = await sql.query(
        `select 'conjunto' as tabla, slug, id from public.conjuntos where slug not like 'zz-%'
         union all
         select 'escenario', slug, id from public.escenarios
          where slug not like 'zz-%' and slug not like 'ficticio-%'
         union all
         select 'evento', slug, id from public.eventos where slug not like 'zz-%'
         order by 1, 2`,
      )
      return rows
    })

  it('no duplica ni cambia ids, corrige lo que sale de los CSV y no pisa lo demás', async () => {
    const service = serviceClient()
    const conLista = conjuntosCsv.find((c) => c.temporada_lista === String(TEMPORADA))!
    const sinLista = conjuntosCsv.find((c) => c.temporada_lista !== String(TEMPORADA))!
    const escenario = escenariosCsv[0]!
    // Un evento sin `info` en el calendario (ahí el seed no pisa la de la base) y otro con.
    const evento = eventosCsv.find((e) => !e.info)!
    const eventoConInfo = eventosCsv.find((e) => e.info)!
    const antes = await ids()

    try {
      // Lo que se carga después, a mano o desde el admin: el seed no lo tiene que pisar.
      ok(
        await service
          .from('conjuntos')
          .update({ bio: 'Zz bio de prueba', foto_url: 'https://example.org/zz.jpg' })
          .eq('slug', conLista.slug!)
          .select(),
      )
      ok(
        await service
          .from('escenarios')
          .update({ ubicacion: 'SRID=4326;POINT(-56.2 -34.9)' })
          .eq('slug', escenario.slug!)
          .select(),
      )
      ok(
        await service
          .from('eventos')
          .update({ info: 'Zz info de prueba' })
          .eq('slug', evento.slug!)
          .select(),
      )
      ok(
        await service
          .from('eventos')
          .update({ info: 'Zz info que el calendario corrige' })
          .eq('slug', eventoConInfo.slug!)
          .select(),
      )
      // Lo que sí sale de los CSV: el seed lo vuelve a dejar como estaba.
      ok(
        await service
          .from('conjuntos')
          .update({ nombre: 'Zz Nombre Cambiado', alias: ['Zz Alias Cambiado'] })
          .eq('slug', sinLista.slug!)
          .select(),
      )
      await withSql(async (sql) => {
        await sql.query(
          `delete from public.conjunto_temporada
            where conjunto_id = (select id from public.conjuntos where slug = $1)`,
          [conLista.slug],
        )
        await sql.query(
          `insert into public.conjunto_temporada (conjunto_id, temporada_id, en_concurso, en_llamadas)
           select c.id, t.id, true, true
             from public.conjuntos c, public.temporadas t
            where c.slug = $1 and t.anio = $2`,
          [sinLista.slug, TEMPORADA],
        )
      })

      await correrSeed()

      expect(await ids()).toEqual(antes)
      expect(await participacion()).toEqual(participacionEsperada)
      expect(
        ok(
          await service
            .from('conjuntos')
            .select('nombre, alias')
            .eq('slug', sinLista.slug!)
            .single(),
        ),
      ).toEqual({ nombre: sinLista.nombre, alias: list(sinLista.alias!, '|') })
      expect(
        ok(await anonClient().rpc('buscar_por_nombre', { p_texto: 'Zz Nombre Cambiado' })),
      ).toEqual([])
      expect(
        ok(
          await service
            .from('conjuntos')
            .select('bio, foto_url')
            .eq('slug', conLista.slug!)
            .single(),
        ),
      ).toEqual({ bio: 'Zz bio de prueba', foto_url: 'https://example.org/zz.jpg' })
      expect(
        ok(
          await service.from('escenarios').select('ubicacion').eq('slug', escenario.slug!).single(),
        ).ubicacion,
      ).not.toBeNull()
      expect(
        ok(await service.from('eventos').select('info').eq('slug', evento.slug!).single()),
      ).toEqual({ info: 'Zz info de prueba' })
      // La info que trae el calendario sí manda sobre la de la base.
      expect(
        ok(await service.from('eventos').select('info').eq('slug', eventoConInfo.slug!).single()),
      ).toEqual({ info: eventoConInfo.info })
    } finally {
      await service
        .from('conjuntos')
        .update({ bio: null, foto_url: null })
        .eq('slug', conLista.slug!)
      await service.from('escenarios').update({ ubicacion: null }).eq('slug', escenario.slug!)
      await service.from('eventos').update({ info: null }).eq('slug', evento.slug!)
      await correrSeed()
    }
  })
})

describe('seed: recorrido y cortes de las Llamadas', () => {
  const correrSeed = () => withSql((sql) => sql.query(readFileSync(SEED, 'utf8')))
  const esquinasCsv = readResearchCsv(`llamadas_recorrido_${TEMPORADA}.csv`)
  const cortesCsv = readResearchCsv(`llamadas_cortes_${TEMPORADA}.csv`)
  const NOCHES = [`llamadas-noche-1-${TEMPORADA}`, `llamadas-noche-2-${TEMPORADA}`]

  const evento = async (slug: string) =>
    ok(
      await anonClient()
        .from('eventos')
        .select('id, recorrido_estado, recorrido_fuente_url')
        .eq('slug', slug)
        .single(),
    )
  const recorrido = async (slug: string) =>
    ok(await anonClient().rpc('recorrido_del_desfile', { p_evento_id: (await evento(slug)).id }))
  const cortes = async (slug: string) =>
    ok(await anonClient().rpc('cortes_del_desfile', { p_evento_id: (await evento(slug)).id }))

  it('las dos noches tienen el recorrido del CSV, marcado como estimado y con su fuente', async () => {
    expect(esquinasCsv.length).toBeGreaterThanOrEqual(2)
    for (const slug of NOCHES) {
      const filas = await recorrido(slug)
      expect(filas.map((f) => [f.orden, f.calle, f.cruce, f.lat, f.lng])).toEqual(
        esquinasCsv.map((e) => [Number(e.orden), e.calle, e.cruce, Number(e.lat), Number(e.lng)]),
      )
      const ev = await evento(slug)
      expect(ev.recorrido_estado).toBe('estimado')
      expect(ev.recorrido_fuente_url).toEqual(list(esquinasCsv[0]!.fuente_url!, ' | '))
    }
  })

  it('va de Zelmar Michelini a Minas: nueve cuadras, poco menos de un kilómetro (decisión 7)', async () => {
    const filas = await recorrido(NOCHES[0]!)
    expect(filas).toHaveLength(10)
    expect([filas[0]!.calle, filas[0]!.cruce]).toEqual(['Carlos Gardel', 'Zelmar Michelini'])
    expect([filas.at(-1)!.calle, filas.at(-1)!.cruce]).toEqual(['Isla de Flores', 'Minas'])
    expect(filas[0]!.distancia_m).toBe(0)
    // A 15 metros por minuto son unos 63 minutos: entra en los 66 del reglamento.
    expect(filas.at(-1)!.distancia_m).toBeGreaterThan(900)
    expect(filas.at(-1)!.distancia_m).toBeLessThan(1000)
    // Ninguna cuadra mide menos de 50 metros ni más de 200: no hay esquinas repetidas ni saltos.
    const cuadras = filas.slice(1).map((f, i) => f.distancia_m - filas[i]!.distancia_m)
    expect(Math.min(...cuadras)).toBeGreaterThan(50)
    expect(Math.max(...cuadras)).toBeLessThan(200)
  })

  it('cada noche tiene sus cortes, todos estimados, con el horario en hora de Montevideo', async () => {
    for (const [i, slug] of NOCHES.entries()) {
      const delCsv = cortesCsv.filter((c) => c.noche === String(i + 1))
      const filas = await cortes(slug)
      expect(filas.map((c) => c.slug).sort()).toEqual(delCsv.map((c) => c.slug!).sort())
      expect(filas.every((c) => c.estado === 'estimado')).toBe(true)
      expect(filas.every((c) => c.fuente_url.length > 0)).toBe(true)
    }
    const noche1 = await cortes(NOCHES[0]!)
    const delRecorrido = noche1.find((c) => c.slug === 'recorrido')!
    // «2027-02-05T12:00» en el CSV son las 12:00 de Montevideo: 15:00 UTC.
    expect(new Date(delRecorrido.desde).toISOString()).toBe('2027-02-05T15:00:00.000Z')
    expect(delRecorrido.puntos).toHaveLength(10)
    // Un tramo sin dibujo queda con la descripción sola.
    const sinTramo = cortesCsv.find((c) => c.noche === '1' && c.puntos === '')!
    expect(noche1.find((c) => c.slug === sinTramo.slug)).toMatchObject({
      descripcion: sinTramo.descripcion,
      puntos: null,
    })
  })

  it('volver a correr el seed no duplica esquinas ni cortes', async () => {
    const antes = [await recorrido(NOCHES[0]!), await cortes(NOCHES[0]!)]
    await correrSeed()
    expect([await recorrido(NOCHES[0]!), await cortes(NOCHES[0]!)]).toEqual(antes)
  })

  it('no toca un recorrido ni un corte que ya están confirmados', async () => {
    const service = serviceClient()
    const { id } = await evento(NOCHES[0]!)
    try {
      // La IM publicó el recorrido oficial de la noche 1 y un corte: se cargan como confirmados.
      ok(
        await service
          .from('eventos')
          .update({
            recorrido_estado: 'confirmado',
            recorrido_fuente_url: ['https://example.org/im'],
          })
          .eq('id', id)
          .select('id'),
      )
      ok(
        await service
          .from('desfile_esquinas')
          .update({ cruce: 'Zz Esquina Oficial' })
          .eq('evento_id', id)
          .eq('orden', 1)
          .select('orden'),
      )
      ok(
        await service
          .from('cortes_calle')
          .update({ estado: 'confirmado', descripcion: 'Zz Corte oficial' })
          .eq('evento_id', id)
          .eq('slug', 'recorrido')
          .select('id'),
      )
      await correrSeed()

      expect((await recorrido(NOCHES[0]!))[0]!.cruce).toBe('Zz Esquina Oficial')
      expect(await evento(NOCHES[0]!)).toMatchObject({
        recorrido_estado: 'confirmado',
        recorrido_fuente_url: ['https://example.org/im'],
      })
      expect((await cortes(NOCHES[0]!)).find((c) => c.slug === 'recorrido')).toMatchObject({
        estado: 'confirmado',
        descripcion: 'Zz Corte oficial',
      })
      // La otra noche sigue con el estimado del CSV.
      expect((await recorrido(NOCHES[1]!))[0]!.cruce).toBe(esquinasCsv[0]!.cruce)
    } finally {
      await service.from('eventos').update({ recorrido_estado: 'estimado' }).eq('id', id)
      await service
        .from('cortes_calle')
        .update({ estado: 'estimado' })
        .eq('evento_id', id)
        .eq('slug', 'recorrido')
      await correrSeed()
    }
    expect((await recorrido(NOCHES[0]!))[0]!.cruce).toBe(esquinasCsv[0]!.cruce)
  })
})
