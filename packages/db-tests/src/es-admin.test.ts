import { describe, expect, it } from 'vitest'
import { anonClient, ctx, userClient } from './clients'

describe('es_admin()', () => {
  it('es false sin sesión', async () => {
    const { data, error } = await anonClient().rpc('es_admin')
    expect(error).toBeNull()
    expect(data).toBe(false)
  })

  it('es false para un usuario anónimo', async () => {
    const { data, error } = await userClient(ctx().anonimoA).rpc('es_admin')
    expect(error).toBeNull()
    expect(data).toBe(false)
  })

  it('es false si el rol está en user_metadata, que el usuario puede editar', async () => {
    const { data, error } = await userClient(ctx().falsoAdmin).rpc('es_admin')
    expect(error).toBeNull()
    expect(data).toBe(false)
  })

  it('es true con app_metadata.rol = admin', async () => {
    const { data, error } = await userClient(ctx().admin).rpc('es_admin')
    expect(error).toBeNull()
    expect(data).toBe(true)
  })
})
