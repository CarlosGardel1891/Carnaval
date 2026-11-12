// Arma el sitio público de Carnavalero (decisión 83): páginas estáticas, sin JavaScript, en
// español y en inglés. `pnpm --filter sitio build` las deja en `sitio/dist/`, que es lo que se
// sube a Vercel. `renderSite()` devuelve las páginas en memoria, para los tests.

import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHROME, CONTENT, PAGES, VIGENCIA } from './content.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
export const config = JSON.parse(readFileSync(path.join(here, 'site.config.json'), 'utf8'))

const LANGS = ['es', 'en']

const escapeHtml = (text) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')

/** Texto a HTML: lo escapa y pone los enlaces de las marcas `{contacto}`, `{borrar}` y `{privacidad}`. */
function inline(text, lang) {
  const link = (href, label) => `<a href="${href}">${escapeHtml(label)}</a>`
  return escapeHtml(text)
    .replaceAll('{contacto}', link(`mailto:${config.contact}`, config.contact))
    .replaceAll('{borrar}', link(PAGES.deletion[lang], config.siteUrl + PAGES.deletion[lang]))
    .replaceAll('{privacidad}', link(PAGES.privacy[lang], config.siteUrl + PAGES.privacy[lang]))
}

function section(block, lang) {
  const parts = [`<h2>${escapeHtml(block.h)}</h2>`]
  for (const text of block.p ?? []) parts.push(`<p>${inline(text, lang)}</p>`)
  if (block.ul)
    parts.push(`<ul>${block.ul.map((item) => `<li>${inline(item, lang)}</li>`).join('')}</ul>`)
  if (block.ol)
    parts.push(`<ol>${block.ol.map((item) => `<li>${inline(item, lang)}</li>`).join('')}</ol>`)
  if (block.dl) {
    parts.push(
      `<dl>${block.dl.map(([term, text]) => `<dt>${inline(term, lang)}</dt><dd>${inline(text, lang)}</dd>`).join('')}</dl>`,
    )
  }
  for (const text of block.after ?? []) parts.push(`<p>${inline(text, lang)}</p>`)
  return `<section>${parts.join('')}</section>`
}

const STYLE = `
:root{color-scheme:dark;--ground:#0a0f1c;--surface:#141b2d;--line:#334155;--ink:#f8fafc;--soft:#cbd5e1;--accent:#fbbf24}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);font:1.0625rem/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:var(--accent)}
a:focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.wrap{max-width:42rem;margin:0 auto;padding:0 1rem}
header.top{border-bottom:1px solid var(--line);background:var(--surface)}
header.top .wrap{display:flex;flex-wrap:wrap;align-items:center;gap:.25rem 1rem;padding-top:.75rem;padding-bottom:.75rem}
.brand{display:flex;align-items:center;gap:.5rem;font-weight:700;color:var(--accent);text-decoration:none;letter-spacing:.04em;text-transform:uppercase;margin-right:auto}
.brand img{width:2rem;height:2rem;border-radius:.5rem}
nav ul{display:flex;flex-wrap:wrap;gap:.25rem 1rem;list-style:none;margin:0;padding:0}
nav a{display:inline-flex;align-items:center;min-height:3rem;color:var(--soft)}
nav a[aria-current=page]{color:var(--ink);font-weight:600}
main{padding-top:1.5rem;padding-bottom:2rem}
h1{font-size:2rem;line-height:1.2;margin:0 0 .75rem}
h2{font-size:1.25rem;margin:2rem 0 .5rem}
.lead{font-size:1.1875rem;color:var(--soft)}
p,li,dd{color:var(--soft)}
dt{color:var(--ink);font-weight:600;margin-top:1rem}
dd{margin:.25rem 0 0}
li{margin:.25rem 0}
footer{border-top:1px solid var(--line);padding:1.25rem 0 2rem;color:var(--soft);font-size:.9375rem}
`

function page(lang, key) {
  const chrome = CHROME[lang]
  const content = CONTENT[lang][key]
  const other = lang === 'es' ? 'en' : 'es'
  const title = key === 'home' ? content.title : `${content.title} · Carnavalero`
  const nav = Object.keys(PAGES)
    .map(
      (item) =>
        `<li><a href="${PAGES[item][lang]}"${item === key ? ' aria-current="page"' : ''}>${escapeHtml(chrome.nav[item])}</a></li>`,
    )
    .join('')
  const dated =
    key === 'privacy'
      ? `<p><small>${lang === 'es' ? 'Vigente desde el' : 'Effective'} ${VIGENCIA[lang]}.</small></p>`
      : ''
  return `<!doctype html>
<html lang="${chrome.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(content.description)}">
<link rel="canonical" href="${config.siteUrl}${PAGES[key][lang]}">
<link rel="alternate" hreflang="${other}" href="${config.siteUrl}${PAGES[key][other]}">
<link rel="icon" type="image/png" href="/favicon.png">
<style>${STYLE}</style>
</head>
<body>
<header class="top"><div class="wrap">
<a class="brand" href="${PAGES.home[lang]}"><img src="/favicon.png" alt="">Carnavalero</a>
<nav aria-label="${lang === 'es' ? 'Páginas' : 'Pages'}"><ul>${nav}<li><a href="${PAGES[key][other]}" lang="${other}" hreflang="${other}">${CHROME[lang].other}</a></li></ul></nav>
</div></header>
<main class="wrap">
<h1>${escapeHtml(content.title)}</h1>
<p class="lead">${inline(content.lead, lang)}</p>
${content.sections.map((block) => section(block, lang)).join('\n')}
${dated}
</main>
<footer><div class="wrap">${escapeHtml(chrome.footer)} · <a href="mailto:${config.contact}">${config.contact}</a></div></footer>
</body>
</html>
`
}

/** El archivo de una ruta: `/` es `index.html`; `/privacidad`, `privacidad.html`. */
const fileOf = (route) => (route === '/' ? 'index.html' : `${route.slice(1)}.html`)

/** Todas las páginas: `{ 'privacidad.html': '<!doctype html>…', … }`. */
export function renderSite() {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(config.contact ?? '')) {
    throw new Error('sitio: falta el mail de contacto en sitio/site.config.json.')
  }
  const files = {}
  for (const lang of LANGS) {
    for (const key of Object.keys(PAGES)) files[fileOf(PAGES[key][lang])] = page(lang, key)
  }
  return files
}

const VERCEL = {
  $schema: 'https://openapi.vercel.sh/vercel.json',
  cleanUrls: true,
  trailingSlash: false,
  headers: [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.join(here, 'dist')
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  const files = renderSite()
  for (const [name, html] of Object.entries(files)) writeFileSync(path.join(out, name), html)
  writeFileSync(path.join(out, 'vercel.json'), JSON.stringify(VERCEL, null, 2) + '\n')
  writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n')
  copyFileSync(path.join(here, '..', 'app', 'public', 'favicon.png'), path.join(out, 'favicon.png'))
  console.log(`sitio: ${Object.keys(files).length} páginas en ${out}`)
}
