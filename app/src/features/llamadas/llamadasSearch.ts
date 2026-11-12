import { useSearchParams } from 'react-router'

/**
 * Lo que viaja en la URL entre las vistas del modo Llamadas: la noche (`?noche=`) y la cuadra
 * elegida (`?cuadra=`). Así «Tu cuadra» vale también en el orden de desfile.
 */
export function useLlamadasSearch(): string {
  const [params] = useSearchParams()
  const kept = new URLSearchParams()
  for (const key of ['noche', 'cuadra']) {
    const value = params.get(key)
    if (value) kept.set(key, value)
  }
  const search = kept.toString()
  return search ? `?${search}` : ''
}
