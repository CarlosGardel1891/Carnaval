import type { StyleSpecification } from 'maplibre-gl'

/**
 * Qué estilo usa un mapa. Con key de MapTiler y con red, las calles; si no, un fondo liso
 * donde igual se dibuja lo que importa (los marcadores, el recorrido). MapLibre va dentro
 * de la app: lo único que necesita la red son las calles.
 */

/** Sin calles: sólo el fondo. No pide nada a la red. */
export const BLANK_STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'fondo', type: 'background', paint: { 'background-color': '#e7edf7' } }],
}

export const streetsStyleUrl = (apiKey: string) =>
  `https://api.maptiler.com/maps/streets-v2/style.json?key=${apiKey}`

/** Por qué un mapa está sobre fondo liso: falta la key, o no se pudieron cargar las calles. */
export type BlankReason = 'no-key' | 'no-network'

/**
 * El estilo con el que arranca un mapa. Sin key, o si el teléfono ya sabe que no tiene red,
 * va directo al fondo liso: no se espera a que falle.
 */
export function initialStyle(
  apiKey: string | undefined,
  online: boolean,
): { style: StyleSpecification | string; blank: BlankReason | null } {
  if (!apiKey) return { style: BLANK_STYLE, blank: 'no-key' }
  if (!online) return { style: BLANK_STYLE, blank: 'no-network' }
  return { style: streetsStyleUrl(apiKey), blank: null }
}
