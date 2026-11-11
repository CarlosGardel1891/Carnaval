import { useTranslation } from 'react-i18next'
import type { CalendarEvent } from '../../lib/api'
import { hasTickets, ticketsUrl } from './ticketSale'

/**
 * Dónde se compran las entradas de un evento (decisión 60). La app no vende: lleva a la
 * venta oficial. Mientras no haya nada cargado no se muestra nada: la venta suele
 * anunciarse pocos días antes.
 */
export function Tickets({
  event,
}: {
  event: Pick<CalendarEvent, 'entradas_url' | 'entradas_texto'>
}) {
  const { t } = useTranslation()
  const url = ticketsUrl(event)
  if (!hasTickets(event)) return null

  return (
    <section aria-labelledby="entradas" className="space-y-2">
      <h2 id="entradas" className="text-xl font-bold">
        {t('tickets.title')}
      </h2>
      {event.entradas_texto && (
        <p className="text-lg whitespace-pre-line">{event.entradas_texto}</p>
      )}
      {url && (
        <>
          <p>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="bg-raised text-ink border-line inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold"
            >
              {t('tickets.buy')}
            </a>
          </p>
          <p className="text-soft">{t('tickets.note')}</p>
        </>
      )}
    </section>
  )
}
