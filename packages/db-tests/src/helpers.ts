import { expect } from 'vitest'
import { anonClient, ctx, userClient, withSql, type Db } from './clients'

export type Quien = [nombre: string, cliente: () => Db]

/** Los que pueden leer lo publicado pero no escribir nada en los datos públicos. */
export const intrusos: Quien[] = [
  ['sin sesión', () => anonClient()],
  ['un usuario anónimo', () => userClient(ctx().anonimoA)],
  ['un usuario con rol admin en user_metadata', () => userClient(ctx().falsoAdmin)],
]

export const lectores: Quien[] = [
  ['sin sesión', () => anonClient()],
  ['un usuario anónimo', () => userClient(ctx().anonimoA)],
]

export const admin = (): Db => userClient(ctx().admin)

/** Falla el test si la operación de preparación o verificación dio error. */
export function ok<T>(res: { data: T; error: unknown }): NonNullable<T> {
  expect(res.error).toBeNull()
  expect(res.data).not.toBeNull()
  return res.data as NonNullable<T>
}

/**
 * Un rechazo de escritura: error de permisos (sin privilegio de tabla o RLS en un alta)
 * o ninguna fila afectada (RLS en un cambio o una baja).
 */
export function expectRechazo(res: { data: unknown; error: { code: string } | null }) {
  if (res.error) expect(res.error.code).toBe('42501')
  else expect(res.data).toEqual([])
}

/**
 * Borra los datos de prueba. Los conjuntos y escenarios de los tests llevan nombres inventados
 * con el prefijo «zz», para no chocar con los del seed (los eventos también); las etapas,
 * números de 90 para arriba.
 */
export async function limpiar(): Promise<void> {
  await withSql(async (sql) => {
    await sql.query(
      `delete from public.actuaciones
        where conjunto_id in (select id from public.conjuntos where slug like 'zz-%')
           or escenario_id in (select id from public.escenarios where slug like 'zz-%')`,
    )
    await sql.query(
      `delete from public.orden_desfile
        where conjunto_id in (select id from public.conjuntos where slug like 'zz-%')`,
    )
    await sql.query(`delete from public.eventos where slug like 'zz-%'`)
    await sql.query(`delete from public.conjuntos where slug like 'zz-%'`)
    await sql.query(`delete from public.escenarios where slug like 'zz-%'`)
    await sql.query(`delete from public.etapas_concurso where numero >= 90`)
  })
}
