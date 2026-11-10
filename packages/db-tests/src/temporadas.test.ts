import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { anonClient, ctx, serviceClient, userClient, type Db } from './clients'

// Años que el seed no usa, para no pisar la temporada real.
const ANIO_ADMIN = 2098
const ANIO_INTRUSO = 2099
const fila = (anio: number) => ({
  anio,
  fecha_inicio: `${anio}-01-20`,
  fecha_fin: `${anio}-03-05`,
})

const limpiar = async () => {
  const { error } = await serviceClient().from('temporadas').delete().gte('anio', 2090)
  expect(error).toBeNull()
}

beforeAll(limpiar)
afterAll(limpiar)

describe('temporadas: lectura pública', () => {
  const lectores: [string, () => Db][] = [
    ['sin sesión', () => anonClient()],
    ['un usuario anónimo', () => userClient(ctx().anonimoA)],
  ]

  it.each(lectores)('%s lee la temporada del seed', async (_quien, cliente) => {
    const { data, error } = await cliente().from('temporadas').select('anio').eq('anio', 2027)
    expect(error).toBeNull()
    expect(data).toEqual([{ anio: 2027 }])
  })
})

describe('temporadas: sólo un admin escribe', () => {
  const intrusos: [string, () => Db][] = [
    ['sin sesión', () => anonClient()],
    ['un usuario anónimo', () => userClient(ctx().anonimoA)],
    ['un usuario con rol admin en user_metadata', () => userClient(ctx().falsoAdmin)],
  ]

  it.each(intrusos)('%s no puede insertar', async (_quien, cliente) => {
    const { error } = await cliente().from('temporadas').insert(fila(ANIO_INTRUSO))
    expect(error?.code).toBe('42501')
    const { data } = await serviceClient().from('temporadas').select('id').eq('anio', ANIO_INTRUSO)
    expect(data).toEqual([])
  })

  it.each(intrusos)('%s no puede modificar ni borrar', async (_quien, cliente) => {
    const antes = await serviceClient().from('temporadas').select('*').eq('anio', 2027).single()
    expect(antes.error).toBeNull()

    // Sin permiso de tabla (anon) da error; con RLS (authenticated) no afecta ninguna fila.
    const cambio = await cliente()
      .from('temporadas')
      .update({ fecha_fin: '2027-12-31' })
      .eq('anio', 2027)
      .select()
    expect(cambio.data ?? []).toEqual([])
    const baja = await cliente().from('temporadas').delete().eq('anio', 2027).select()
    expect(baja.data ?? []).toEqual([])

    const despues = await serviceClient().from('temporadas').select('*').eq('anio', 2027).single()
    expect(despues.data).toEqual(antes.data)
  })

  it('un admin, con su propio JWT, inserta, modifica y borra', async () => {
    const admin = userClient(ctx().admin)

    const alta = await admin.from('temporadas').insert(fila(ANIO_ADMIN)).select().single()
    expect(alta.error).toBeNull()
    expect(alta.data?.anio).toBe(ANIO_ADMIN)

    const cambio = await admin
      .from('temporadas')
      .update({ fecha_fin: `${ANIO_ADMIN}-03-10` })
      .eq('anio', ANIO_ADMIN)
      .select()
      .single()
    expect(cambio.error).toBeNull()
    expect(cambio.data?.fecha_fin).toBe(`${ANIO_ADMIN}-03-10`)

    const baja = await admin.from('temporadas').delete().eq('anio', ANIO_ADMIN).select()
    expect(baja.error).toBeNull()
    expect(baja.data).toHaveLength(1)

    const { data } = await serviceClient().from('temporadas').select('id').eq('anio', ANIO_ADMIN)
    expect(data).toEqual([])
  })
})
