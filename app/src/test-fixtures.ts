import type { Act } from './lib/api'

/** Hora de Montevideo (UTC-3) de la noche del 2027-01-28 como instante ISO. */
export function at(time: string, nextDay = false): string {
  return `${nextDay ? '2027-01-29' : '2027-01-28'}T${time}:00-03:00`
}

let nextId = 1

/** Una actuación de prueba: Tablado Centro, pago, con ubicación, salvo lo que se pise. */
export function makeAct(overrides: Partial<Act> = {}): Act {
  const id = overrides.actuacion_id ?? nextId++
  return {
    actuacion_id: id,
    inicio: at('20:30'),
    estado: 'programada',
    etapa_rueda: null,
    etapa_numero: null,
    conjunto_id: 100 + id,
    conjunto_slug: `conjunto-${id}`,
    conjunto_nombre: `Conjunto ${id}`,
    conjunto_categoria: 'murga',
    conjunto_foto_url: null,
    escenario_id: 1,
    escenario_slug: 'ficticio-centro',
    escenario_nombre: 'Tablado Centro',
    escenario_tipo: 'privado',
    escenario_barrio: 'Centro',
    direccion: 'Av. 18 de Julio 1234',
    gratis: false,
    precio_texto: '$ 300',
    itinerante: false,
    lat: -34.9058,
    lng: -56.1913,
    distancia_m: null,
    es_favorito: false,
    ...overrides,
  }
}

const centro = {}
const prado: Partial<Act> = {
  escenario_id: 2,
  escenario_slug: 'ficticio-prado',
  escenario_nombre: 'Escenario Prado',
  escenario_tipo: 'popular',
  escenario_barrio: 'Prado',
  direccion: 'Av. Agraciada 3000',
  gratis: true,
  precio_texto: null,
  lat: -34.86,
  lng: -56.2,
}
const movil: Partial<Act> = {
  escenario_id: 3,
  escenario_slug: 'ficticio-movil',
  escenario_nombre: 'Escenario Móvil',
  escenario_tipo: 'movil',
  escenario_barrio: null,
  gratis: true,
  precio_texto: null,
  itinerante: true,
}
const sinUbicacion: Partial<Act> = {
  escenario_id: 4,
  escenario_slug: 'ficticio-union',
  escenario_nombre: 'Club Unión',
  escenario_tipo: 'popular',
  escenario_barrio: 'Unión',
  direccion: null,
  gratis: false,
  precio_texto: '$ 150',
  lat: null,
  lng: null,
}

/**
 * Una noche chica (2027-01-28) con lo que hay que cubrir: una suspendida, una cambiada,
 * un itinerante con dos paradas, un escenario sin ubicación y una actuación pasada la
 * medianoche. Viene ordenada como la devuelve la base: por hora y nombre de escenario.
 */
export function nightFixture(): Act[] {
  return [
    makeAct({
      ...centro,
      actuacion_id: 1,
      inicio: at('20:30'),
      conjunto_nombre: 'Agarrate Catalina',
    }),
    makeAct({
      ...prado,
      actuacion_id: 2,
      inicio: at('20:30'),
      conjunto_nombre: 'C 1080',
      conjunto_categoria: 'comparsa',
    }),
    makeAct({
      ...movil,
      actuacion_id: 3,
      inicio: at('21:00'),
      conjunto_nombre: 'Los Patos Cabreros',
      direccion: 'Esquina ficticia 1',
      lat: -34.89,
      lng: -56.17,
    }),
    makeAct({
      ...sinUbicacion,
      actuacion_id: 4,
      inicio: at('21:30'),
      conjunto_nombre: 'Zíngaros',
      conjunto_categoria: 'parodistas',
    }),
    makeAct({
      ...prado,
      actuacion_id: 5,
      inicio: at('21:30'),
      conjunto_nombre: 'La Nueva Milonga',
      estado: 'suspendida',
    }),
    makeAct({
      ...movil,
      actuacion_id: 6,
      inicio: at('22:15'),
      conjunto_nombre: 'Queso Magro',
      direccion: 'Esquina ficticia 2',
      lat: -34.89,
      lng: -56.16,
    }),
    makeAct({
      ...prado,
      actuacion_id: 7,
      inicio: at('22:30'),
      conjunto_nombre: 'Cayó la Cabra',
    }),
    makeAct({
      ...centro,
      actuacion_id: 8,
      inicio: at('23:45'),
      conjunto_nombre: 'Doña Bastarda',
      estado: 'cambiada',
    }),
    makeAct({
      ...centro,
      actuacion_id: 9,
      inicio: at('00:40', true),
      conjunto_nombre: 'Valores de Ansina',
      conjunto_categoria: 'comparsa',
    }),
  ]
}
