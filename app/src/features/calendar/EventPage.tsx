import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { nocheLogica } from '@cuerda/shared'
import { BackButton } from '../../components/ui/BackButton'
import { CalendarIcon, MapPinIcon } from '../../components/ui/icons'
import { EmptySearchArt, OfflineArt } from '../../components/ui/illustrations'
import {
  Card,
  EmptyState,
  Pill,
  PrimaryButton,
  PrimaryLink,
  SectionHeader,
} from '../../components/ui/primitives'
import { fetchEvent, type CalendarEvent } from '../../lib/api'
import { formatIsoDate, formatNight } from '../../lib/format'
import { useSystemBars } from '../../lib/systemBars'
import { useLocale } from '../../lib/useLocale'
import { useNow } from '../../lib/useNow'
import { useCurrentSeason } from '../season/useCurrentSeason'
import { CONTEST_PATH } from '../contest/contest'
import { isMultiDay, isPreseason } from './calendar'
import { Tickets } from './Tickets'

const iconCircle =
  'bg-brand-soft text-brand inline-flex size-11 shrink-0 items-center justify-center rounded-full'

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
  useSystemBars('onLight')
  const today = nocheLogica(useNow())
  const season = useCurrentSeason(today)
  const query = useEvent(slug)
  const event = query.data

  // Si se entró directo a la ficha no hay a dónde volver: «Volver» lleva al calendario.
  const backButton = <BackButton fallback="/calendario" />

  if (!event) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-3 pb-6">
        {backButton}
        <h1 className="mt-4 text-[1.875rem] leading-tight font-extrabold tracking-tight">
          {t('event.title')}
        </h1>
        {query.isPending ? (
          <p className="text-soft mt-2">{t('event.loading')}</p>
        ) : query.isError ? (
          <div role="alert">
            <EmptyState
              illustration={<OfflineArt />}
              title={t('event.error')}
              action={
                <PrimaryButton onClick={() => void query.refetch()}>
                  {t('today.retry')}
                </PrimaryButton>
              }
            />
          </div>
        ) : (
          <EmptyState illustration={<EmptySearchArt />} title={t('event.notFound')} />
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
    <main className="mx-auto max-w-2xl space-y-5 px-4 pt-3 pb-6">
      {backButton}
      <header>
        <h1 className="text-[1.875rem] leading-[1.1] font-extrabold tracking-tight text-balance">
          {event.nombre}
        </h1>
        <p className="mt-2.5 flex flex-wrap gap-2">
          <Pill tone="brand" className="px-3 py-1 text-[0.9375rem]">
            {t(`eventType.${event.tipo}`)}
          </Pill>
          {preseason && (
            <Pill className="px-3 py-1 text-[0.9375rem]">{t('calendar.preseason')}</Pill>
          )}
        </p>
      </header>

      <section aria-labelledby="cuando">
        <SectionHeader id="cuando" title={t('event.when')} />
        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className={iconCircle}>
              <CalendarIcon className="size-5.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[1.0625rem] font-bold first-letter:uppercase">{dates}</p>
              <p className="mt-1">
                {/* Una fecha estimada nunca se muestra como confirmada. */}
                <Pill tone={estimated ? 'amber' : 'ok'}>{t(`eventStatus.${event.estado}`)}</Pill>
              </p>
            </div>
          </div>
          {estimated && <p className="text-soft text-sm">{t('event.estimatedHint')}</p>}
        </Card>
      </section>

      <section aria-labelledby="donde">
        <SectionHeader id="donde" title={t('event.where')} />
        <Card className="flex items-center gap-3 p-4">
          <span aria-hidden="true" className={iconCircle}>
            <MapPinIcon className="size-5.5" />
          </span>
          <p className={event.lugar ? 'text-[1.0625rem] font-bold' : 'text-soft'}>
            {event.lugar ?? t('event.noPlace')}
          </p>
        </Card>
      </section>

      {event.info && (
        <p className="text-soft px-1 text-[1.0625rem] whitespace-pre-line">{event.info}</p>
      )}

      <div className="space-y-3">
        <PrimaryLink to={`/?noche=${night}`} className="w-full">
          {ongoing ? t('event.seeTonight') : t('event.seeNight')}
        </PrimaryLink>
        {event.tipo === 'concurso' && (
          <Link
            to={CONTEST_PATH}
            className="pressable bg-surface border-line text-brand flex min-h-13 w-full items-center justify-center rounded-2xl border px-6 text-[1.0625rem] font-bold"
          >
            {t('contest.seeFixture')}
          </Link>
        )}
      </div>

      <Tickets event={event} />

      <section aria-labelledby="fuente">
        <SectionHeader id="fuente" title={t('event.source')} />
        {sources.length === 0 ? (
          <p className="text-soft px-1 text-sm">{t('event.noSource')}</p>
        ) : (
          <ul className="flex flex-wrap gap-x-4 px-1">
            {sources.map(({ url, site }) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent inline-flex min-h-11 items-center font-bold"
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
