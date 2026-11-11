import type { CalendarEvent } from '../../lib/api'

/** La temporada 2027, como en el seed. */
export const SEASON = {
  id: 1,
  anio: 2027,
  fecha_inicio: '2027-01-21',
  fecha_fin: '2027-03-07',
  modo_llamadas_desde: '2027-02-05',
  modo_llamadas_hasta: '2027-02-06',
}

let nextId = 1

export function makeEvent(
  overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'slug' | 'nombre' | 'fecha_inicio'>,
): CalendarEvent {
  return {
    id: nextId++,
    tipo: 'otro',
    fecha_fin: overrides.fecha_inicio,
    lugar: null,
    estado: 'confirmado',
    info: null,
    fuente_url: [],
    entradas_url: null,
    entradas_texto: null,
    ...overrides,
  }
}

/**
 * Un calendario chico con lo que hay que cubrir, como en `research/calendario_2027.csv`:
 * pretemporada, un evento de varios días, uno estimado, dos el mismo día y las dos noches
 * de Llamadas. Viene desordenado a propósito.
 */
export function calendarFixture(): CalendarEvent[] {
  return [
    makeEvent({
      slug: 'llamadas-noche-2-2027',
      nombre: 'Desfile Oficial de Llamadas - noche 2',
      tipo: 'llamadas',
      fecha_inicio: '2027-02-06',
      lugar: 'Carlos Gardel e Isla de Flores',
    }),
    makeEvent({
      slug: 'concurso-completo-2027',
      nombre: 'Concurso Oficial completo',
      tipo: 'concurso',
      fecha_inicio: '2027-01-25',
      fecha_fin: '2027-03-03',
      estado: 'estimado',
      lugar: 'Teatro de Verano Ramón Collazo',
    }),
    makeEvent({
      slug: 'desfile-inaugural-2027',
      nombre: 'Desfile Inaugural del Carnaval',
      tipo: 'inaugural',
      fecha_inicio: '2027-01-21',
      lugar: 'Av. 18 de Julio',
      fuente_url: ['https://montevideo.gub.uy/carnaval', 'https://www.elobservador.com.uy/nota'],
    }),
    makeEvent({
      slug: 'concurso-prueba-admision-2027',
      nombre: 'Prueba de Admisión al Concurso Oficial 2027',
      tipo: 'admision',
      fecha_inicio: '2026-11-10',
      fecha_fin: '2026-11-16',
      lugar: 'Teatro de Verano Ramón Collazo',
    }),
    makeEvent({
      slug: 'llamadas-noche-1-2027',
      nombre: 'Desfile Oficial de Llamadas - noche 1',
      tipo: 'llamadas',
      fecha_inicio: '2027-02-05',
      lugar: 'Carlos Gardel e Isla de Flores',
    }),
    makeEvent({
      slug: 'concurso-inicio-2027',
      nombre: 'Inicio del Concurso Oficial',
      tipo: 'concurso',
      fecha_inicio: '2027-01-25',
      lugar: 'Teatro de Verano Ramón Collazo',
    }),
    makeEvent({
      slug: 'llamadas-san-baltasar-2027',
      nombre: 'Llamadas de San Baltasar',
      fecha_inicio: '2027-01-06',
      estado: 'estimado',
    }),
  ]
}
