import { describe, expect, it } from 'vitest'
import { buildCalendar, isMultiDay, isPastEvent, isPreseason } from './calendar'
import { calendarFixture, makeEvent, SEASON } from './calendar-fixtures'

const slugsByDay = (today: string) =>
  buildCalendar(calendarFixture(), today).flatMap(({ days }) =>
    days.map((day) => [day.date, day.events.map((event) => event.slug)] as const),
  )

describe('buildCalendar', () => {
  it('agrupa por mes y ordena por fecha, venga como venga', () => {
    const months = buildCalendar(calendarFixture(), '2027-01-21')
    expect(months.map((m) => m.month)).toEqual(['2026-11', '2027-01', '2027-02'])
    expect(months.map((m) => m.days.map((d) => d.date))).toEqual([
      ['2026-11-10'],
      ['2027-01-06', '2027-01-21', '2027-01-25'],
      ['2027-02-05', '2027-02-06'],
    ])
  })

  it('dos eventos el mismo día van en la misma fila, primero el que termina antes', () => {
    const day = slugsByDay('2027-01-21').find(([date]) => date === '2027-01-25')
    expect(day?.[1]).toEqual(['concurso-inicio-2027', 'concurso-completo-2027'])
  })

  it('las dos noches de Llamadas son dos filas, una por noche', () => {
    const llamadas = slugsByDay('2027-01-21').filter(([, slugs]) =>
      slugs.some((slug) => slug.startsWith('llamadas-noche')),
    )
    expect(llamadas).toEqual([
      ['2027-02-05', ['llamadas-noche-1-2027']],
      ['2027-02-06', ['llamadas-noche-2-2027']],
    ])
  })

  it('un evento de varios días aparece una sola vez, el día que empieza', () => {
    const rows = slugsByDay('2027-01-21').filter(([, slugs]) =>
      slugs.includes('concurso-prueba-admision-2027'),
    )
    expect(rows.map(([date]) => date)).toEqual(['2026-11-10'])
  })

  it('hoy tiene su fila aunque no empiece nada, en su lugar', () => {
    const months = buildCalendar(calendarFixture(), '2027-01-30')
    const january = months.find((m) => m.month === '2027-01')!
    expect(january.days.map((d) => [d.date, d.isToday])).toEqual([
      ['2027-01-06', false],
      ['2027-01-21', false],
      ['2027-01-25', false],
      ['2027-01-30', true],
    ])
    const today = january.days.at(-1)!
    expect(today.events).toEqual([])
    // El Concurso empezó el 25 y sigue: se repite en la fila de hoy.
    expect(today.ongoing.map((event) => event.slug)).toEqual(['concurso-completo-2027'])
  })

  it('hoy fuera del rango de los eventos abre su propio mes', () => {
    expect(buildCalendar(calendarFixture(), '2027-04-02').at(-1)).toMatchObject({
      month: '2027-04',
      days: [{ date: '2027-04-02', isToday: true, events: [], ongoing: [] }],
    })
    expect(buildCalendar(calendarFixture(), '2026-08-15')[0]).toMatchObject({ month: '2026-08' })
  })

  it('si hoy empieza un evento, no se duplica la fila ni figura como en curso', () => {
    const months = buildCalendar(calendarFixture(), '2027-01-25')
    const days = months.flatMap((m) => m.days).filter((d) => d.date === '2027-01-25')
    expect(days).toHaveLength(1)
    expect(days[0]).toMatchObject({ isToday: true, ongoing: [] })
    expect(days[0]!.events).toHaveLength(2)
  })

  it('el último día de un evento todavía está en curso; al día siguiente, no', () => {
    const ongoing = (today: string) =>
      buildCalendar(calendarFixture(), today)
        .flatMap((m) => m.days)
        .find((d) => d.isToday)!
        .ongoing.map((event) => event.slug)
    expect(ongoing('2026-11-16')).toEqual(['concurso-prueba-admision-2027'])
    expect(ongoing('2026-11-17')).toEqual([])
  })

  it('sin eventos queda sólo la fila de hoy', () => {
    expect(buildCalendar([], '2027-01-21')).toEqual([
      {
        month: '2027-01',
        days: [{ date: '2027-01-21', isToday: true, events: [], ongoing: [] }],
      },
    ])
  })
})

describe('estado de un evento', () => {
  const admision = makeEvent({
    slug: 'a',
    nombre: 'Admisión',
    fecha_inicio: '2026-11-10',
    fecha_fin: '2026-11-16',
  })

  it('uno de varios días no pasó hasta que pasa su último día', () => {
    expect(isPastEvent(admision, '2026-11-12')).toBe(false)
    expect(isPastEvent(admision, '2026-11-16')).toBe(false)
    expect(isPastEvent(admision, '2026-11-17')).toBe(true)
    expect(isMultiDay(admision)).toBe(true)
    expect(isMultiDay(makeEvent({ slug: 'b', nombre: 'B', fecha_inicio: '2027-01-21' }))).toBe(
      false,
    )
  })

  it('pretemporada es lo que empieza antes del primer día de la temporada', () => {
    expect(isPreseason(admision, SEASON.fecha_inicio)).toBe(true)
    const inaugural = makeEvent({ slug: 'i', nombre: 'Inaugural', fecha_inicio: '2027-01-21' })
    expect(isPreseason(inaugural, SEASON.fecha_inicio)).toBe(false)
  })
})
