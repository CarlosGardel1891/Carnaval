import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ctx, serviceClient, withSql } from './clients'
import { admin, intrusos, limpiar, ok } from './helpers'

interface Entry {
  tabla: string
  fila: string
  operacion: string
  antes: Record<string, unknown> | null
  despues: Record<string, unknown> | null
  usuario_id: string | null
  usuario_email: string | null
}

/** Lo registrado para una fila, en orden. Se lee por SQL para no depender de la RLS. */
async function entries(tabla: string, fila: string | number): Promise<Entry[]> {
  return withSql(async (sql) => {
    const res = await sql.query<Entry>(
      `select tabla, fila, operacion, antes, despues, usuario_id, usuario_email
         from public.registro_cambios
        where tabla = $1 and fila = $2
        order by id`,
      [tabla, String(fila)],
    )
    return res.rows
  })
}

beforeAll(limpiar)
afterAll(limpiar)

describe('registro_cambios', () => {
  it('registra el alta, el cambio y la baja de un admin, con quién lo hizo', async () => {
    const db = admin()
    const { id } = ok(
      await db
        .from('conjuntos')
        .insert({ slug: 'zz-registro', nombre: 'Zz Registro', categoria: 'murga' })
        .select('id')
        .single(),
    )
    ok(await db.from('conjuntos').update({ barrio: 'Palermo' }).eq('id', id).select('id'))
    ok(await db.from('conjuntos').delete().eq('id', id).select('id'))

    const log = await entries('conjuntos', id)
    expect(log.map((e) => e.operacion)).toEqual(['alta', 'cambio', 'baja'])
    for (const entry of log) expect(entry.usuario_id).toBe(ctx().admin.id)
    expect(log[0]!.usuario_email).toMatch(/@cuerda\.invalid$/)

    expect(log[0]!.antes).toBeNull()
    expect(log[0]!.despues).toMatchObject({ slug: 'zz-registro', barrio: null })
    expect(log[1]!.antes).toMatchObject({ barrio: null })
    expect(log[1]!.despues).toMatchObject({ barrio: 'Palermo' })
    expect(log[2]!.antes).toMatchObject({ barrio: 'Palermo' })
    expect(log[2]!.despues).toBeNull()
  })

  it('no registra un cambio que deja la fila igual', async () => {
    const db = admin()
    const { id } = ok(
      await db
        .from('escenarios')
        .insert({ slug: 'zz-registro-igual', nombre: 'Zz Registro Igual' })
        .select('id')
        .single(),
    )
    ok(
      await db.from('escenarios').update({ nombre: 'Zz Registro Igual' }).eq('id', id).select('id'),
    )
    expect((await entries('escenarios', id)).map((e) => e.operacion)).toEqual(['alta'])
  })

  it('no cuenta como cambio que sólo se mueva actualizado_en', async () => {
    const service = serviceClient()
    const conjunto = ok(
      await service
        .from('conjuntos')
        .insert({ slug: 'zz-registro-act', nombre: 'Zz Registro Act', categoria: 'murga' })
        .select('id')
        .single(),
    )
    const escenario = ok(
      await service
        .from('escenarios')
        .insert({ slug: 'zz-registro-esc', nombre: 'Zz Registro Esc' })
        .select('id')
        .single(),
    )
    const inicio = '2031-02-01T23:00:00Z'
    const act = ok(
      await service
        .from('actuaciones')
        .insert({ conjunto_id: conjunto.id, escenario_id: escenario.id, inicio, fuente: 'test' })
        .select('id, actualizado_en')
        .single(),
    )
    const again = ok(
      await service
        .from('actuaciones')
        .update({ inicio })
        .eq('id', act.id)
        .select('actualizado_en')
        .single(),
    )
    expect(again.actualizado_en).not.toBe(act.actualizado_en)

    const log = await entries('actuaciones', act.id)
    expect(log.map((e) => e.operacion)).toEqual(['alta'])
    expect(log[0]!.despues).not.toHaveProperty('actualizado_en')
  })

  it('lo que entra por la service role queda sin usuario', async () => {
    const { id } = ok(
      await serviceClient()
        .from('conjuntos')
        .insert({ slug: 'zz-registro-sistema', nombre: 'Zz Registro Sistema', categoria: 'murga' })
        .select('id')
        .single(),
    )
    const log = await entries('conjuntos', id)
    expect(log).toHaveLength(1)
    expect(log[0]!.usuario_id).toBeNull()
    expect(log[0]!.usuario_email).toBeNull()
  })

  it('arma la fila con todas las partes de una clave compuesta', async () => {
    const service = serviceClient()
    const conjunto = ok(
      await service
        .from('conjuntos')
        .insert({ slug: 'zz-registro-clave', nombre: 'Zz Registro Clave', categoria: 'comparsa' })
        .select('id')
        .single(),
    )
    const temporada = ok(await service.from('temporadas').select('id').eq('anio', 2027).single())
    ok(
      await service
        .from('conjunto_temporada')
        .insert({ conjunto_id: conjunto.id, temporada_id: temporada.id })
        .select('conjunto_id'),
    )
    const log = await entries('conjunto_temporada', `${conjunto.id},${temporada.id}`)
    expect(log.map((e) => e.operacion)).toEqual(['alta'])
  })

  it('un admin lo puede leer', async () => {
    const rows = ok(await admin().from('registro_cambios').select('id').limit(1))
    expect(rows).toHaveLength(1)
  })

  it.each(intrusos)('%s no lo puede leer', async (_nombre, cliente) => {
    const res = await cliente().from('registro_cambios').select('id').limit(1)
    if (res.error) expect(res.error.code).toBe('42501')
    else expect(res.data).toEqual([])
  })

  it('ni un admin lo puede escribir por la API', async () => {
    const db = admin()
    const alta = await db
      .from('registro_cambios')
      .insert({ tabla: 'conjuntos', fila: '1', operacion: 'alta', despues: {} })
      .select('id')
    expect(alta.error?.code).toBe('42501')
    const cambio = await db.from('registro_cambios').update({ tabla: 'x' }).gt('id', 0).select('id')
    expect(cambio.error?.code).toBe('42501')
    const baja = await db.from('registro_cambios').delete().gt('id', 0).select('id')
    expect(baja.error?.code).toBe('42501')
  })
})
