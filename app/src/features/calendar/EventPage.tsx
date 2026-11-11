import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { nocheLogica } from '@cuerda/shared'
import { Button } from '../../components/Button'
import { fetchEvent, type CalendarEvent } from '../../lib/api'
import { formatIsoDate, formatNight } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { useNow } from '../../lib/useNow'
import { useCurrentSeason } from '../season/useCurrentSeason'
import { isMultiDay, isPreseason } from './calendar'

const action =
  'bg-accent text-accent-ink inline-flex min-h-12 items-center rounded-xl px-5 font-semibold'
const badge = 'rounded-md border px-2 py-0.5 font-semibold'

/** Los datos de un evento. Cambian poco: una hora de gracia. */
function useEvent(slug: string) {
  const queryClient = useQueryClient()
  return useQuery({
    queryKey: ['evento', slug],
    queryFn: () => fetchEvent(slug),
    staleTime: 60 * 60_000,
    // Viniendo del calendario, el evento ya está en la lista cargada.
    placeholderData: () =>
      queryClient
        .getQueriesData<CalendarEvent[]>({ queryKey: ['eventos'] })
        .flatMap(([, events]) => events ?? [])
        .find((event) => event.slug === slug),
  })
}

/** De dónde salió el dato: sólo se enlazan direcciones web, con el nombre del sitio. */
function sourceLinks(urls: string[]): { url: string; site: string }[] {
  return urls.flatMap((url) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return []
      return [{ url, site: parsed.hostname.replace(/^www\./, '') }]
    } catch {
      return []
    }
  })
}

/** La ficha de un evento del calendario: qué es, cuándo, dónde y de dónde salió el dato. */
export function EventPage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const today = nocheLogica(useNow())
  const season = useCurrentSeason(today)
  const query = useEvent(slug)
  const event = query.data

  // Si se entró directo a la ficha no hay a dónde volver: «Volver» lleva al calendario.
  const back = () => void (location.key === 'default' ? navigate('/calendario') : navigate(-1))
  const backButton = (
    <Button variant="secondary" onClick={back}>
      {t('stage.back')}
    </Button>
  )

  if (!event) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-6">
        {backButton}
        <h1 className="text-3xl font-bold">{t('event.title')}</h1>
        {query.isPending ? (
          <p className="text-soft">{t('event.loading')}</p>
        ) : query.isError ? (
          <div role="alert" className="space-y-3">
            <p className="text-lg">{t('event.error')}</p>
            <Button onClick={() => void query.refetch()}>{t('today.retry')}</Button>
          </div>
        ) : (
          <p className="text-lg">{t('event.notFound')}</p>
        )}
      </main>
    )
  }

  const estimated = event.estado === 'estimado'
  const multiDay = isMultiDay(event)
  // Una fecha estimada lleva «aprox.» adelante: nunca se lee como confirmada.
  const dates = multiDay
    ? t(estimated ? 'event.approxRange' : 'event.range', {
        start: formatIsoDate(event.fecha_inicio, locale),
        end: formatIsoDate(event.fecha_fin, locale),
      })
    : estimated
      ? t('event.approx', { date: formatNight(event.fecha_inicio, locale) })
      : formatNight(event.fecha_inicio, locale)
  // En un evento de varios días que está en curso, «esa noche» es la de hoy.
  const ongoing = multiDay && event.fecha_inicio <= today && event.fecha_fin >= today
  const night = ongoing ? today : event.fecha_inicio
  const sources = sourceLinks(event.fuente_url)
  const preseason = season.data ? isPreseason(event, season.data.fecha_inicio) : false

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 pt-4 pb-6">
      {backButton}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{event.nombre}</h1>
        <p className="text-soft text-lg">{t(`eventType.${event.tipo}`)}</p>
        {preseason && (
          <p>
            <span className={`${badge} border-line text-soft text-sm`}>
              {t('calendar.preseason')}
            </span>
          </p>
        )}
      </header>

      <section aria-labelledby="cuando" className="space-y-2">
        <h2 id="cuando" className="text-xl font-bold">
          {t('event.when')}
        </h2>
        <p className="text-lg first-letter:uppercase">{dates}</p>
        <p>
          {/* Una fecha estimada nunca se muestra como confirmada. */}
          <span
            className={`${badge} ${estimated ? 'border-accent text-accent' : 'border-line text-soft'}`}
          >
            {t(`eventStatus.${event.estado}`)}
          </span>
        </p>
        {estimated && <p className="text-soft">{t('event.estimatedHint')}</p>}
      </section>

      <section aria-labelledby="donde" className="space-y-2">
        <h2 id="donde" className="text-xl font-bold">
          {t('event.where')}
        </h2>
        <p className="text-lg">{event.lugar ?? t('event.noPlace')}</p>
      </section>

      {event.info && <p className="text-lg whitespace-pre-line">{event.info}</p>}

      <p>
        <Link to={`/?noche=${night}`} className={action}>
          {ongoing ? t('event.seeTonight') : t('event.seeNight')}
        </Link>
      </p>

      <section aria-labelledby="fuente" className="space-y-2">
        <h2 id="fuente" className="text-xl font-bold">
          {t('event.source')}
        </h2>
        {sources.length === 0 ? (
          <p className="text-soft">{t('event.noSource')}</p>
        ) : (
          <ul className="space-y-1">
            {sources.map(({ url, site }) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent inline-flex min-h-12 items-center underline"
                >
                  {site}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
