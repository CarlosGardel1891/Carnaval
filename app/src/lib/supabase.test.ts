import { describe, expect, it } from 'vitest'
import { resolveSupabaseUrl } from './supabase'

describe('resolveSupabaseUrl', () => {
  it('en Android cambia 127.0.0.1 y localhost por 10.0.2.2', () => {
    expect(resolveSupabaseUrl('http://127.0.0.1:55321', 'android')).toBe('http://10.0.2.2:55321')
    expect(resolveSupabaseUrl('http://localhost:55321', 'android')).toBe('http://10.0.2.2:55321')
  })

  it('no toca el remoto ni otras plataformas', () => {
    const remote = 'https://abcd.supabase.co'
    expect(resolveSupabaseUrl(remote, 'android')).toBe(remote)
    expect(resolveSupabaseUrl('http://127.0.0.1:55321', 'web')).toBe('http://127.0.0.1:55321')
    expect(resolveSupabaseUrl('http://127.0.0.1:55321', 'ios')).toBe('http://127.0.0.1:55321')
  })
})
