/**
 * Normaliza nombres para el matching exacto de nombre + alias: minúsculas, sin tildes,
 * espacios simples. Port de `norm` en research/validate.py.
 */
export function norm(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}
