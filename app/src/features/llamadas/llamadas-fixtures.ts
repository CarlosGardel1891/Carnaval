import type { Group, ParadeEvent, ParadeSlot, RouteCorner, StreetClosure } from '../../lib/api'

/** La temporada 2027, como en el seed: el modo Llamadas va del 5 al 6 de febrero. */
export const SEASON = {
  id: 1,
  anio: 2027,
  fecha_inicio: '2027-01-21',
  fecha_fin: '2027-03-07',
  modo_llamadas_desde: '2027-02-05',
  modo_llamadas_hasta: '2027-02-06',
}

function night(id: number, fecha: string, overrides: Partial<ParadeEvent> = {}): ParadeEvent {
  return {
    id,
    temporada_id: 1,
    slug: `llamadas-noche-${id}-2027`,
    nombre: `Desfile Oficial de Llamadas - noche ${id}`,
    fecha_inicio: fecha,
    lugar: 'Carlos Gardel e Isla de Flores, de Zelmar Michelini a Minas',
    desfile_inicio: null,
    desfile_intervalo_min: null,
    desfile_separacion_m: null,
    desfile_atraso_min: 0,
    recorrido_estado: 'estimado',
    recorrido_fuente_url: ['https://example.org/recorrido'],
    ...overrides,
  }
}

export const NIGHT_1 = night(1, '2027-02-05')
export const NIGHT_2 = night(2, '2027-02-06')
export const nights = (): ParadeEvent[] => [NIGHT_1, NIGHT_2]

const slot = (posicion: number, id: number, nombre: string, barrio: string | null): ParadeSlot => ({
  posicion,
  conjunto_id: id,
  conjunto_slug: nombre.toLowerCase().replace(/ /g, '-'),
  conjunto_nombre: nombre,
  conjunto_barrio: barrio,
  fuente: 'im',
})

/** Un orden corto para la noche 1: tres comparsas. */
export const order1 = (fuente = 'im'): ParadeSlot[] =>
  [
    slot(1, 201, 'C 1080', 'Barrio Sur'),
    slot(2, 202, 'Valores de Ansina', 'Palermo'),
    slot(3, 203, 'La Dominguera', null),
  ].map((s) => ({ ...s, fuente }))

/** Y uno largo para la noche 2: 26 comparsas, para que la última salga pasada la medianoche. */
export const order2 = (): ParadeSlot[] =>
  Array.from({ length: 26 }, (_unused, i) => slot(i + 1, 300 + i, `Comparsa ${i + 1}`, null))

/**
 * Un recorrido de tres cuadras de 150 metros, recto hacia el este, donde la primera cuadra
 * va por Carlos Gardel y las otras por Isla de Flores. No son las coordenadas reales.
 */
const LNG_150M = 150 / (111_320 * Math.cos((-34.911 * Math.PI) / 180))
export const route = (): RouteCorner[] =>
  [
    ['Carlos Gardel', 'Zelmar Michelini'],
    ['Isla de Flores', 'Carlos Quijano'],
    ['Isla de Flores', 'Aquiles Lanza'],
    ['Isla de Flores', 'Ejido'],
  ].map(([calle, cruce], i) => ({
    orden: i + 1,
    calle: calle!,
    cruce: cruce!,
    lat: -34.911,
    lng: -56.19 + i * LNG_150M,
    distancia_m: i * 150,
  }))

export const closures = (): StreetClosure[] => [
  {
    corte_id: 1,
    slug: 'recorrido',
    tipo: 'corte',
    descripcion: 'Carlos Gardel e Isla de Flores, de Zelmar Michelini a Minas',
    desde: '2027-02-05T12:00:00-03:00',
    hasta: null,
    estado: 'estimado',
    fuente_url: ['https://example.org/cortes'],
    puntos: [
      [-56.19, -34.911],
      [-56.185, -34.911],
    ],
  },
  {
    corte_id: 2,
    slug: 'sin-estacionar-ejido',
    tipo: 'estacionamiento',
    descripcion: 'Ejido, entre Isla de Flores y Durazno',
    desde: '2027-02-05T08:00:00-03:00',
    hasta: null,
    estado: 'estimado',
    fuente_url: ['https://example.org/cortes'],
    puntos: null,
  },
]

const comparsa = (id: number, nombre: string, enLlamadas: boolean): Group => ({
  id,
  slug: nombre.toLowerCase().replace(/ /g, '-'),
  nombre,
  categoria: 'comparsa',
  barrio: id === 201 ? 'Barrio Sur' : null,
  foto_url: null,
  claves: [nombre.toLowerCase()],
  temporadas: [{ temporada_id: 1, en_concurso: false, en_llamadas: enLlamadas }],
})

/** El catálogo: tres comparsas clasificadas a las Llamadas y una que no. */
export const groups = (): Group[] => [
  comparsa(201, 'C 1080', true),
  comparsa(202, 'Valores de Ansina', true),
  comparsa(203, 'La Dominguera', true),
  comparsa(204, 'Sin Clasificar', false),
]
