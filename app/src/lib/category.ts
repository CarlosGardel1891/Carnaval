import type { CSSProperties } from 'react'
import type { CategoriaConjunto } from '@cuerda/shared'

/**
 * El color de cada categoría (decisión 92). Los cuatro tonos de cada una están en `index.css`
 * (`--cat-…`): el color, uno más oscuro para texto chico, uno suave para fondos y uno más claro
 * para el final del degradé. El color nunca va solo: lo acompaña siempre el nombre de la
 * categoría.
 */
export const categoryColor = (category: CategoriaConjunto): string => `var(--cat-${category})`

/** Texto en el color de la categoría, sobre su versión suave. */
export const categoryPillStyle = (category: CategoriaConjunto): CSSProperties => ({
  color: `var(--cat-${category}-ink)`,
  backgroundColor: `var(--cat-${category}-soft)`,
})

/** Lo mismo para el avatar de iniciales. */
export const categoryAvatarStyle = categoryPillStyle

/** El degradé de la tarjeta grande de la ficha de un conjunto, en el color de su categoría. */
export const categoryGradientStyle = (category: CategoriaConjunto): CSSProperties => ({
  backgroundImage: `linear-gradient(150deg, var(--cat-${category}-ink) 0%, var(--cat-${category}) 52%, var(--cat-${category}-light) 118%)`,
})

/** Palabras que no cuentan para las iniciales, salvo que sean la primera. */
const CONNECTORS = new Set(['la', 'las', 'el', 'los', 'de', 'del', 'y', 'e', 'a', 'en', 'con'])

/**
 * Las iniciales de un conjunto para su avatar: las de sus dos primeras palabras que cuentan
 * («Cayó la Cabra» → CC, «Los Muchachos» → LM). Con una sola palabra, sus dos primeras letras.
 */
export function initials(name: string): string {
  const words = name
    .trim()
    .split(/[\s\-–·.]+/)
    .filter(Boolean)
  const significant = words.filter(
    (word, index) => index === 0 || !CONNECTORS.has(word.toLocaleLowerCase('es')),
  )
  const letters =
    significant.length >= 2
      ? [significant[0]!, significant[1]!].map((word) => [...word][0] ?? '')
      : [...(significant[0] ?? '')].slice(0, 2)
  return letters.join('').toLocaleUpperCase('es')
}
