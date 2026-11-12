import { describe, expect, it } from 'vitest'
import { releaseEnvProblems } from './releaseEnv'

const remote = {
  VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'sb_publishable_de_prueba',
}

describe('releaseEnvProblems', () => {
  it('no controla nada fuera de los modos de tienda', () => {
    expect(
      releaseEnvProblems('production', { VITE_SUPABASE_URL: 'http://127.0.0.1:55321' }),
    ).toEqual([])
    expect(releaseEnvProblems('development', {})).toEqual([])
    expect(releaseEnvProblems('remoto', {})).toEqual([])
  })

  it.each(['beta', 'produccion'])('acepta el remoto en %s', (mode) => {
    expect(releaseEnvProblems(mode, remote)).toEqual([])
  })

  it.each([
    'http://127.0.0.1:55321',
    'http://localhost:55321',
    'http://10.0.2.2:55321',
    'https://localhost',
  ])('rechaza un Supabase local (%s)', (url) => {
    expect(releaseEnvProblems('produccion', { ...remote, VITE_SUPABASE_URL: url })).toEqual([
      'VITE_SUPABASE_URL apunta a un Supabase local',
    ])
    expect(releaseEnvProblems('beta', { ...remote, VITE_SUPABASE_URL: url })).toHaveLength(1)
  })

  it('rechaza una dirección sin https, una que no es dirección y una vacía', () => {
    const problems = (url: string | undefined) =>
      releaseEnvProblems('produccion', { ...remote, VITE_SUPABASE_URL: url })
    expect(problems('http://abc.supabase.co')).toEqual(['VITE_SUPABASE_URL tiene que ser https'])
    expect(problems('abc')).toEqual(['VITE_SUPABASE_URL no es una dirección'])
    expect(problems('  ')).toEqual(['falta VITE_SUPABASE_URL'])
    expect(problems(undefined)).toEqual(['falta VITE_SUPABASE_URL'])
  })

  it('rechaza un build sin la key pública', () => {
    expect(releaseEnvProblems('beta', { ...remote, VITE_SUPABASE_ANON_KEY: '' })).toEqual([
      'falta VITE_SUPABASE_ANON_KEY',
    ])
  })

  it('rechaza el reloj simulado en los dos modos', () => {
    for (const mode of ['beta', 'produccion']) {
      expect(releaseEnvProblems(mode, { ...remote, VITE_AHORA: '2027-02-05T21:00' })).toHaveLength(
        1,
      )
    }
  })

  it('el modo demostración vale en beta y no en producción', () => {
    expect(releaseEnvProblems('beta', { ...remote, VITE_DEMO: '1' })).toEqual([])
    expect(releaseEnvProblems('produccion', { ...remote, VITE_DEMO: '1' })).toHaveLength(1)
  })
})
