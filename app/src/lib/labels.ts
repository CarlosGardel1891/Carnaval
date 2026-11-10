import type { TFunction } from 'i18next'

/** «Gratis», el precio cargado o «Con entrada»; nada si no se sabe. */
export function priceLabel(
  t: TFunction,
  gratis: boolean | null,
  precioTexto: string | null,
): string | null {
  if (gratis === true) return t('price.free')
  if (precioTexto) return precioTexto
  return gratis === false ? t('price.paid') : null
}

/** Une con « · » las partes que haya. */
export function joinParts(parts: (string | null | undefined | false)[]): string {
  return parts.filter(Boolean).join(' · ')
}
