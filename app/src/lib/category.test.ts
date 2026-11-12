import { describe, expect, it } from 'vitest'
import { Constants } from '@cuerda/shared'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { categoryPillStyle, initials } from './category'

describe('initials', () => {
  it.each([
    ['Cayó la Cabra', 'CC'],
    ['Los Muchachos', 'LM'],
    ['A la Bartola', 'AB'],
    ['Agarrate Catalina', 'AC'],
    ['La Gran Muñeca', 'LG'],
    ['Nimba', 'NI'],
    ['C 1080', 'C1'],
    ['Ñandú del Sur', 'ÑS'],
    ['  Doña   Bastarda ', 'DB'],
    ['', ''],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

describe('los colores de las categorías', () => {
  // Los tests corren con `app/` como carpeta de trabajo.
  const css = readFileSync(path.resolve(process.cwd(), 'src/index.css'), 'utf8')

  it('cada categoría de la base tiene sus cuatro tonos en index.css', () => {
    for (const category of Constants.public.Enums.categoria_conjunto) {
      for (const tone of ['', '-ink', '-soft', '-light']) {
        expect(css, `--cat-${category}${tone}`).toMatch(
          new RegExp(`--cat-${category}${tone}: #[0-9a-f]{6};`),
        )
      }
    }
  })

  it('la píldora usa el tono oscuro sobre el suave', () => {
    expect(categoryPillStyle('murga')).toEqual({
      color: 'var(--cat-murga-ink)',
      backgroundColor: 'var(--cat-murga-soft)',
    })
  })

  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
  }
  const read = (name: string) => css.match(new RegExp(`${name}: (#[0-9a-f]{6});`))![1]!
  const contrast = (a: string, b: string) => {
    const [la, lb] = [luminance(read(a)), luminance(read(b))]
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
  }

  it('el texto secundario tiene contraste AA sobre el fondo, las tarjetas y lo realzado', () => {
    for (const background of ['--color-ground', '--color-surface', '--color-raised']) {
      expect(contrast('--color-soft', background), background).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('el texto de cada píldora tiene contraste AA (4,5:1) sobre su fondo', () => {
    for (const category of Constants.public.Enums.categoria_conjunto) {
      const ratio = contrast(`--cat-${category}-ink`, `--cat-${category}-soft`)
      expect(ratio, category).toBeGreaterThanOrEqual(4.5)
    }
  })
})
