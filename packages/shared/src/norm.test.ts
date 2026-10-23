import { describe, expect, it } from 'vitest'
import { norm } from './norm'

describe('norm', () => {
  it('pasa a minúsculas y saca tildes', () => {
    expect(norm('Samburú Morán')).toBe('samburu moran')
    expect(norm('ESCENARIOS MÓVILES IM')).toBe('escenarios moviles im')
  })

  it('convierte ñ en n como validate.py', () => {
    expect(norm('DoÑa Bastarda')).toBe('dona bastarda')
  })

  it('colapsa espacios, tabs y saltos de línea, y recorta', () => {
    expect(norm('  La   Sara\tdel\nCordón  ')).toBe('la sara del cordon')
  })

  it('da lo mismo que validate.py con acento suelto y ß', () => {
    // NFKD descompone «´» en espacio + tilde combinante, igual que en Python.
    expect(norm('LOS BUBY´S')).toBe('los buby s')
    expect(norm('Straße')).toBe('strasse')
  })

  it('deja los signos que no son tildes', () => {
    expect(norm("Ay Q'darle")).toBe("ay q'darle")
    expect(norm('Centro Cultural Alba Roballo - Eduardo Lladó')).toBe(
      'centro cultural alba roballo - eduardo llado',
    )
  })

  it('iguala variantes de la prensa y del widget de DAECPU', () => {
    expect(norm('LA LINEA MAGINOT')).toBe(norm('La Línea Maginot'))
    expect(norm('BAFO DA ONCA')).toBe(norm('Bafo da Onça'))
  })
})
