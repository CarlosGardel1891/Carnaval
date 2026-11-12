/**
 * Los términos del glosario, en el orden en que se muestran: primero qué es, después los
 * tambores, después quién va en una comparsa. Los textos están en `es.json` y `en.json`
 * (`glossary.terms.<clave>`); un test controla que cada clave tenga los suyos.
 */
export const GLOSSARY_TERMS = [
  'candombe',
  'llamada',
  'comparsa',
  'cuerda',
  'tamborilero',
  'chico',
  'repique',
  'piano',
  'lonja',
  'templar',
  'madera',
  'toque',
  'cuerpoDeBaile',
  'mamaVieja',
  'gramillero',
  'escobero',
  'vedette',
  'estandarte',
  'banderas',
  'medialunaYEstrella',
] as const

export type GlossaryTerm = (typeof GLOSSARY_TERMS)[number]
export type GlossaryGroup = 'basics' | 'drums' | 'characters' | 'symbols'

/** A qué grupo pertenece cada término. Los grupos van seguidos, en el orden de la lista. */
export const GLOSSARY_GROUP: Record<GlossaryTerm, GlossaryGroup> = {
  candombe: 'basics',
  llamada: 'basics',
  comparsa: 'basics',
  cuerda: 'drums',
  tamborilero: 'drums',
  chico: 'drums',
  repique: 'drums',
  piano: 'drums',
  lonja: 'drums',
  templar: 'drums',
  madera: 'drums',
  toque: 'drums',
  cuerpoDeBaile: 'characters',
  mamaVieja: 'characters',
  gramillero: 'characters',
  escobero: 'characters',
  vedette: 'characters',
  estandarte: 'symbols',
  banderas: 'symbols',
  medialunaYEstrella: 'symbols',
}

/** Los términos agrupados, cada grupo con los suyos en el orden de la lista. */
export function glossaryGroups(): { group: GlossaryGroup; terms: GlossaryTerm[] }[] {
  const groups: { group: GlossaryGroup; terms: GlossaryTerm[] }[] = []
  for (const term of GLOSSARY_TERMS) {
    const group = GLOSSARY_GROUP[term]
    const last = groups[groups.length - 1]
    if (last && last.group === group) last.terms.push(term)
    else groups.push({ group, terms: [term] })
  }
  return groups
}

/** Los que se muestran en la portada del modo, como adelanto del glosario. */
export const GLOSSARY_TEASER: GlossaryTerm[] = [
  'cuerda',
  'mamaVieja',
  'gramillero',
  'escobero',
  'chico',
  'repique',
  'piano',
]
