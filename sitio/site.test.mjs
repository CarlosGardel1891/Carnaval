import { describe, expect, it } from 'vitest'
import { config, renderSite } from './build.mjs'
import { CONTENT, PAGES } from './content.mjs'

const files = renderSite()
const fileOf = (route) => (route === '/' ? 'index.html' : `${route.slice(1)}.html`)
const pageOf = (key, lang) => files[fileOf(PAGES[key][lang])]

/** El texto de una página, sin etiquetas ni estilos. */
const textOf = (html) =>
  html
    .replace(/<style>[\s\S]*?<\/style>/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

describe('el sitio público', () => {
  it('tiene cada página en español y en inglés', () => {
    expect(Object.keys(files).sort()).toEqual(
      [
        'index.html',
        'en.html',
        'privacidad.html',
        'privacy.html',
        'borrar-datos.html',
        'delete-data.html',
        'soporte.html',
        'support.html',
      ].sort(),
    )
    for (const key of Object.keys(PAGES)) {
      expect(pageOf(key, 'es')).toContain('<html lang="es">')
      expect(pageOf(key, 'en')).toContain('<html lang="en">')
    }
  })

  it('las dos versiones de cada página tienen las mismas secciones, con la misma forma', () => {
    const shape = (page) =>
      page.sections.map((block) => ({
        p: block.p?.length ?? 0,
        ul: block.ul?.length ?? 0,
        ol: block.ol?.length ?? 0,
        dl: block.dl?.length ?? 0,
        after: block.after?.length ?? 0,
      }))
    for (const key of Object.keys(PAGES)) {
      expect(shape(CONTENT.en[key]), key).toEqual(shape(CONTENT.es[key]))
    }
  })

  it('no deja marcas sin reemplazar y lleva el mail de contacto', () => {
    for (const [name, html] of Object.entries(files)) {
      expect(html, name).not.toMatch(/\{[a-z]+\}/)
      expect(html, name).toContain(`mailto:${config.contact}`)
    }
  })

  it('todos los enlaces internos llevan a una página que existe', () => {
    const routes = new Set(Object.values(PAGES).flatMap((page) => Object.values(page)))
    for (const [name, html] of Object.entries(files)) {
      for (const [, href] of html.matchAll(/href="(\/[^"]*)"/g)) {
        if (href === '/favicon.png') continue
        expect(routes.has(href), `${name} → ${href}`).toBe(true)
      }
    }
  })

  it('cada página enlaza su versión en el otro idioma', () => {
    for (const key of Object.keys(PAGES)) {
      expect(pageOf(key, 'es')).toContain(`href="${PAGES[key].en}" lang="en"`)
      expect(pageOf(key, 'en')).toContain(`href="${PAGES[key].es}" lang="es"`)
    }
  })
})

describe('la política de privacidad', () => {
  const es = textOf(pageOf('privacy', 'es'))
  const en = textOf(pageOf('privacy', 'en'))

  it('dice qué se guarda', () => {
    for (const fact of ['sesión anónima', 'conjuntos que seguís', 'notificaciones', 'idioma']) {
      expect(es).toContain(fact)
    }
    for (const fact of ['anonymous session', 'groups you follow', 'notifications', 'language']) {
      expect(en).toContain(fact)
    }
  })

  it('dice que la ubicación no se guarda ni se envía (decisión 90)', () => {
    expect(es).toContain('no se guarda ni se envía')
    expect(en).toContain('never stored or sent')
  })

  it('nombra a todos los proveedores', () => {
    for (const provider of ['Supabase', 'Firebase', 'MapTiler', 'Sentry', 'Vercel']) {
      expect(es).toContain(provider)
      expect(en).toContain(provider)
    }
  })

  it('dice cuánto se guardan los datos y cómo se borran (decisión 84)', () => {
    expect(es).toContain('13 meses')
    expect(es).toContain('Borrar mis datos')
    expect(en).toContain('13 months')
    expect(en).toContain('Delete my data')
    expect(pageOf('privacy', 'es')).toContain(`href="${PAGES.deletion.es}"`)
    expect(pageOf('privacy', 'en')).toContain(`href="${PAGES.deletion.en}"`)
  })

  it('lleva la fecha de vigencia', () => {
    expect(es).toMatch(/Vigente desde el \d+ de \w+ de \d{4}/)
    expect(en).toMatch(/Effective \w+ \d+, \d{4}/)
  })
})

describe('la página de borrar mis datos', () => {
  it('explica el camino dentro de la app en los dos idiomas', () => {
    expect(textOf(pageOf('deletion', 'es'))).toContain('Tocá «Borrar mis datos» y confirmá.')
    expect(textOf(pageOf('deletion', 'en'))).toContain('Tap “Delete my data” and confirm.')
  })
})
