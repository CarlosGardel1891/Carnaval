import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient } from './clients'
import { admin, limpiar, ok } from './helpers'

let conjuntoId: number
let otroConjuntoId: number

const a = () => userClient(ctx().anonimoA)
const b = () => userClient(ctx().anonimoB)

const favoritosDe = async (usuarioId: string) =>
  ok(await serviceClient().from('favoritos').select('conjunto_id').eq('usuario_id', usuarioId))
    .map((f) => f.conjunto_id)
    .sort((x, y) => x - y)

beforeAll(async () => {
  await limpiar()
  const conjuntos = ok(
    await serviceClient()
      .from('conjuntos')
      .insert([
        { slug: 'zz-favorito', nombre: 'Zz Favorito', categoria: 'comparsa' },
        { slug: 'zz-favorito-dos', nombre: 'Zz Favorito Dos', categoria: 'murga' },
      ])
      .select('id, slug'),
  )
  conjuntoId = conjuntos.find((c) => c.slug === 'zz-favorito')!.id
  otroConjuntoId = conjuntos.find((c) => c.slug === 'zz-favorito-dos')!.id
})

afterAll(limpiar)

describe('favoritos: cada usuario anónimo ve y toca sólo los suyos', () => {
  it('A sigue un conjunto sin mandar su id: lo pone la base', async () => {
    const fila = ok(
      await a().from('favoritos').insert({ conjunto_id: conjuntoId }).select().single(),
    )
    expect(fila.usuario_id).toBe(ctx().anonimoA.id)
  })

  it('A lo ve; B no ve nada', async () => {
    expect(ok(await a().from('favoritos').select('conjunto_id'))).toEqual([
      { conjunto_id: conjuntoId },
    ])
    expect(ok(await b().from('favoritos').select('conjunto_id'))).toEqual([])
  })

  it('B no puede agregarle un favorito a A', async () => {
    const { error } = await b()
      .from('favoritos')
      .insert({ usuario_id: ctx().anonimoA.id, conjunto_id: otroConjuntoId })
    expect(error?.code).toBe('42501')
    expect(await favoritosDe(ctx().anonimoA.id)).toEqual([conjuntoId])
  })

  it('B no puede quitarle un favorito a A', async () => {
    const borradas = ok(
      await b().from('favoritos').delete().eq('usuario_id', ctx().anonimoA.id).select(),
    )
    expect(borradas).toEqual([])
    const todas = ok(await b().from('favoritos').delete().gte('conjunto_id', 0).select())
    expect(todas).toEqual([])
    expect(await favoritosDe(ctx().anonimoA.id)).toEqual([conjuntoId])
  })

  it('nadie puede pasarle un favorito a otro: no hay cambios, sólo altas y bajas', async () => {
    const { error } = await a()
      .from('favoritos')
      .update({ usuario_id: ctx().anonimoB.id })
      .eq('conjunto_id', conjuntoId)
    expect(error?.code).toBe('42501')
    expect(await favoritosDe(ctx().anonimoB.id)).toEqual([])
  })

  it('B sigue el mismo conjunto y otro más; cada uno ve sólo lo suyo', async () => {
    ok(
      await b()
        .from('favoritos')
        .insert([{ conjunto_id: conjuntoId }, { conjunto_id: otroConjuntoId }])
        .select(),
    )
    expect(ok(await a().from('favoritos').select('usuario_id'))).toEqual([
      { usuario_id: ctx().anonimoA.id },
    ])
    const deB = ok(await b().from('favoritos').select('usuario_id, conjunto_id'))
    expect(deB).toHaveLength(2)
    expect(deB.every((f) => f.usuario_id === ctx().anonimoB.id)).toBe(true)
  })

  it('no se puede seguir dos veces al mismo conjunto', async () => {
    const { error } = await a().from('favoritos').insert({ conjunto_id: conjuntoId })
    expect(error?.code).toBe('23505')
  })

  it('A deja de seguirlo, y los de B quedan', async () => {
    const borradas = ok(await a().from('favoritos').delete().eq('conjunto_id', conjuntoId).select())
    expect(borradas).toHaveLength(1)
    expect(await favoritosDe(ctx().anonimoA.id)).toEqual([])
    expect(await favoritosDe(ctx().anonimoB.id)).toEqual(
      [conjuntoId, otroConjuntoId].sort((x, y) => x - y),
    )
  })
})

describe('favoritos: nadie más los ve', () => {
  it('sin sesión no se leen ni se escriben', async () => {
    const lectura = await anonClient().from('favoritos').select('conjunto_id')
    expect(lectura.error?.code).toBe('42501')
    const alta = await anonClient()
      .from('favoritos')
      .insert({ usuario_id: ctx().anonimoA.id, conjunto_id: conjuntoId })
    expect(alta.error?.code).toBe('42501')
    const baja = await anonClient().from('favoritos').delete().gte('conjunto_id', 0)
    expect(baja.error?.code).toBe('42501')
  })

  it('un admin tampoco ve los favoritos ajenos ni los puede borrar', async () => {
    expect(ok(await admin().from('favoritos').select('conjunto_id'))).toEqual([])
    expect(ok(await admin().from('favoritos').delete().gte('conjunto_id', 0).select())).toEqual([])
    expect(await favoritosDe(ctx().anonimoB.id)).toHaveLength(2)
  })
})

describe('favoritos: limpieza', () => {
  it('al borrar un usuario se van sus favoritos', async () => {
    const service = serviceClient()
    const { data, error } = await service.auth.admin.createUser({
      email: `zz-efimero-${Date.now()}@cuerda.test`,
      email_confirm: true,
    })
    expect(error).toBeNull()
    const usuarioId = data.user!.id
    ok(
      await service
        .from('favoritos')
        .insert({ usuario_id: usuarioId, conjunto_id: conjuntoId })
        .select(),
    )
    expect(await favoritosDe(usuarioId)).toEqual([conjuntoId])
    const baja = await service.auth.admin.deleteUser(usuarioId)
    expect(baja.error).toBeNull()
    expect(await favoritosDe(usuarioId)).toEqual([])
  })

  it('al borrar un conjunto se van los favoritos que lo seguían', async () => {
    ok(await serviceClient().from('conjuntos').delete().eq('id', otroConjuntoId).select())
    expect(await favoritosDe(ctx().anonimoB.id)).toEqual([conjuntoId])
  })
})
