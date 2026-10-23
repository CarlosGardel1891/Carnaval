import { describe, expect, it } from 'vitest'
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
})
