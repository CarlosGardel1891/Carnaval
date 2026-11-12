import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { config } from './build.mjs'

// Las fichas de las dos tiendas (tiendas/fichas.json): los límites de cada campo son los que
// publican Google Play y App Store Connect, y los textos van en español y en inglés.

const fichas = JSON.parse(readFileSync(new URL('../tiendas/fichas.json', import.meta.url), 'utf8'))
const LANGS = ['es', 'en']
const bytes = (text) => new TextEncoder().encode(text).length

describe('la ficha de Google Play', () => {
  it.each(LANGS)('respeta los largos (%s)', (lang) => {
    const ficha = fichas.googlePlay[lang]
    expect(ficha.titulo.length).toBeLessThanOrEqual(30)
    expect(ficha.descripcionCorta.length).toBeLessThanOrEqual(80)
    expect(ficha.descripcion.length).toBeLessThanOrEqual(4000)
    expect(ficha.descripcion.length).toBeGreaterThan(500)
  })

  it('lleva el título pedido', () => {
    expect(fichas.googlePlay.es.titulo).toBe('Carnavalero: Carnaval Uruguay')
  })
})

describe('la ficha del App Store', () => {
  it.each(LANGS)('respeta los largos (%s)', (lang) => {
    const ficha = fichas.appStore[lang]
    expect(ficha.nombre.length).toBeGreaterThanOrEqual(2)
    expect(ficha.nombre.length).toBeLessThanOrEqual(30)
    expect(ficha.subtitulo.length).toBeLessThanOrEqual(30)
    expect(ficha.textoPromocional.length).toBeLessThanOrEqual(170)
    expect(bytes(ficha.palabrasClave)).toBeLessThanOrEqual(100)
    expect(ficha.descripcion.length).toBeLessThanOrEqual(4000)
  })

  it('lleva el nombre y el subtítulo pedidos', () => {
    expect(fichas.appStore.es.nombre).toBe('Carnavalero')
    expect(fichas.appStore.es.subtitulo).toBe('Carnaval de Montevideo')
  })

  it.each(LANGS)(
    'las palabras clave no repiten el nombre ni llevan espacios de más (%s)',
    (lang) => {
      const words = fichas.appStore[lang].palabrasClave.split(',')
      expect(words.every((word) => word === word.trim() && word.length > 0)).toBe(true)
      expect(new Set(words).size).toBe(words.length)
      expect(words).not.toContain('carnavalero')
    },
  )
})

describe('las dos fichas', () => {
  it('dicen lo mismo que la política sobre la ubicación y el registro', () => {
    for (const store of ['googlePlay', 'appStore']) {
      expect(fichas[store].es.descripcion).toContain('no se guarda ni se envía')
      expect(fichas[store].en.descripcion).toContain('never stored or sent')
      expect(fichas[store].es.descripcion).toContain('Sin registro')
      expect(fichas[store].en.descripcion).toContain('No sign-up')
    }
  })

  it('dicen que no es una app oficial', () => {
    for (const store of ['googlePlay', 'appStore']) {
      expect(fichas[store].es.descripcion).toContain('No es una app oficial')
      expect(fichas[store].en.descripcion).toContain('not an official app')
    }
  })

  it('usan el mismo contacto y el mismo sitio que la política', () => {
    expect(fichas.contacto).toBe(config.contact)
    expect(fichas.sitio).toBe(config.siteUrl)
  })
})
