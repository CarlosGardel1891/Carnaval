/** Ruta de la ficha de un conjunto. */
export function groupPath(slug: string): string {
  return `/conjuntos/${encodeURIComponent(slug)}`
}
