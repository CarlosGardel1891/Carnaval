import { useTranslation } from 'react-i18next'
import { TicketIcon } from '../../components/ui/icons'
import { Card, PrimaryLink, SectionHeader } from '../../components/ui/primitives'
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
    <section aria-labelledby="entradas">
      <SectionHeader id="entradas" title={t('tickets.title')} />
      <Card className="space-y-3 p-4">
        {event.entradas_texto && (
          <p className="text-[1.0625rem] whitespace-pre-line">{event.entradas_texto}</p>
        )}
        {url && (
          <>
            <PrimaryLink href={url} icon={<TicketIcon className="size-5" />} className="w-full">
              {t('tickets.buy')}
            </PrimaryLink>
            <p className="text-soft text-sm">{t('tickets.note')}</p>
          </>
        )}
      </Card>
    </section>
  )
}
