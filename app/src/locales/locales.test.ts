import { describe, expect, it } from 'vitest'
import { Constants } from '@cuerda/shared'
import en from './en.json'
import es from './es.json'

type Tree = { [key: string]: string | Tree }

function keys(tree: Tree, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === 'string' ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`),
  )
}

describe('traducciones', () => {
  it('es y en tienen las mismas claves', () => {
    expect(keys(en).sort()).toEqual(keys(es).sort())
  })

  it('cada valor de los enums de la base que se muestra tiene su texto', () => {
    const enums = Constants.public.Enums
    const expected = [
      ...enums.categoria_conjunto.map((v) => `category.${v}`),
      ...enums.tipo_escenario.map((v) => `stageType.${v}`),
      ...enums.estado_actuacion.map((v) => `status.${v}`),
      ...enums.rueda_concurso.map((v) => `round.${v}`),
      ...enums.tipo_evento.map((v) => `eventType.${v}`),
      ...enums.estado_evento.map((v) => `eventStatus.${v}`),
    ]
    expect(keys(es)).toEqual(expect.arrayContaining(expected))
  })
})
