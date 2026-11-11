import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, within } from '@testing-library/react'
import i18n from '../../i18n'
import {
  fetchContestFixture,
  fetchCurrentSeason,
  fetchEvent,
  fetchEvents,
  type CalendarEvent,
} from '../../lib/api'
import { renderApp } from '../../test-utils'
import { fixtureRows } from '../contest/contest-fixtures'
import { calendarFixture, SEASON } from './calendar-fixtures'

vi.mock('../../lib/api')

// Como se vendió en 2026: un texto y la dirección de la venta. Acá son datos de prueba.
const SALE = {
  entradas_url: 'https://example.org/entradas',
  entradas_texto: 'En locales de la red de cobranzas y en la boletería del teatro.',
}

/** El calendario de prueba, con la venta cargada en los eventos que se indiquen. */
const withSale = (slugs: string[], sale: Partial<CalendarEvent> = SALE) =>
  calendarFixture().map((event) => (slugs.includes(event.slug) ? { ...event, ...sale } : event))

function useEvents(events: CalendarEvent[]) {
  vi.mocked(fetchEvents).mockResolvedValue(events)
  vi.mocked(fetchEvent).mockImplementation((slug) =>
    Promise.resolve(events.find((event) => event.slug === slug) ?? null),
  )
}

describe('entradas', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-01-20T19:00:00-03:00'))
    vi.mocked(fetchCurrentSeason).mockResolvedValue(SEASON)
    vi.mocked(fetchContestFixture).mockResolvedValue(fixtureRows())
    useEvents(calendarFixture())
    await i18n.changeLanguage('es')
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('mientras no haya venta cargada, la ficha del evento no muestra nada de entradas', async () => {
    renderApp('/calendario/desfile-inaugural-2027')
    await screen.findByRole('region', { name: 'Fuente' })
    expect(screen.queryByRole('region', { name: 'Entradas' })).not.toBeInTheDocument()
    expect(screen.queryByText(/venta oficial/)).not.toBeInTheDocument()
  })

  it('con la venta cargada, la ficha dice dónde se compra y lleva a la venta oficial', async () => {
    useEvents(withSale(['desfile-inaugural-2027']))
    renderApp('/calendario/desfile-inaugural-2027')
    const tickets = await screen.findByRole('region', { name: 'Entradas' })
    expect(within(tickets).getByText(SALE.entradas_texto)).toBeInTheDocument()
    const link = within(tickets).getByRole('link', { name: 'Ir a la venta oficial' })
    expect(link).toHaveAttribute('href', 'https://example.org/entradas')
    expect(link).toHaveAttribute('target', '_blank')
    expect(within(tickets).getByText(/Carnavalero no vende entradas/)).toBeInTheDocument()
  })

  it('con sólo el texto cargado lo muestra, sin botón', async () => {
    useEvents(withSale(['desfile-inaugural-2027'], { entradas_texto: 'Entrada libre.' }))
    renderApp('/calendario/desfile-inaugural-2027')
    const tickets = await screen.findByRole('region', { name: 'Entradas' })
    expect(within(tickets).getByText('Entrada libre.')).toBeInTheDocument()
    expect(within(tickets).queryByRole('link')).not.toBeInTheDocument()
  })

  it('no enlaza algo que no sea una dirección web', async () => {
    useEvents(withSale(['desfile-inaugural-2027'], { entradas_url: 'javascript:alert(1)' }))
    renderApp('/calendario/desfile-inaugural-2027')
    await screen.findByRole('region', { name: 'Fuente' })
    expect(screen.queryByRole('region', { name: 'Entradas' })).not.toBeInTheDocument()
  })

  it('el Concurso no muestra entradas hasta que su evento las tenga', async () => {
    renderApp('/calendario/concurso')
    await screen.findByRole('heading', { level: 2, name: 'Primera rueda' })
    expect(screen.queryByRole('region', { name: 'Entradas' })).not.toBeInTheDocument()
  })

  it('el Concurso muestra las entradas de su evento, con y sin fixture', async () => {
    useEvents(withSale(['concurso-inicio-2027']))
    renderApp('/calendario/concurso')
    const tickets = await screen.findByRole('region', { name: 'Entradas' })
    expect(within(tickets).getByRole('link', { name: 'Ir a la venta oficial' })).toHaveAttribute(
      'href',
      'https://example.org/entradas',
    )

    cleanup()
    vi.mocked(fetchContestFixture).mockResolvedValue([])
    renderApp('/calendario/concurso')
    expect(await screen.findByRole('region', { name: 'Entradas' })).toBeInTheDocument()
    expect(
      screen.getByText('El fixture del Concurso 2027 todavía no se publicó.'),
    ).toBeInTheDocument()
  })

  it('las entradas de otro evento no aparecen en el Concurso', async () => {
    useEvents(withSale(['desfile-inaugural-2027']))
    renderApp('/calendario/concurso')
    await screen.findByRole('heading', { level: 2, name: 'Primera rueda' })
    expect(screen.queryByRole('region', { name: 'Entradas' })).not.toBeInTheDocument()
  })

  it('está en inglés con el idioma en inglés', async () => {
    await i18n.changeLanguage('en')
    useEvents(withSale(['desfile-inaugural-2027']))
    renderApp('/calendario/desfile-inaugural-2027')
    const tickets = await screen.findByRole('region', { name: 'Tickets' })
    expect(
      within(tickets).getByRole('link', { name: 'Go to the official ticket sale' }),
    ).toBeInTheDocument()
  })
})
