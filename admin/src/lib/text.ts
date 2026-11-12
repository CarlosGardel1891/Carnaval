import { norm } from '@cuerda/shared'

/** Un valor por línea: sin vacíos y sin espacios de más. */
export const toLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/** Un texto opcional: vacío es null. */
export const orNull = (text: string): string | null => text.trim() || null

/** El slug de un nombre, igual que `public.slug_de` en la base. */
export const slugOf = (name: string): string =>
  norm(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Si un nombre o alguno de sus alias contiene lo buscado, sin mayúsculas ni tildes. */
export function matchesSearch(search: string, nombre: string, alias: string[]): boolean {
  const wanted = norm(search)
  return !wanted || [nombre, ...alias].some((name) => norm(name).includes(wanted))
}
