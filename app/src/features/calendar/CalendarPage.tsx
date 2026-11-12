import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ChevronRightIcon, TicketIcon } from '../../components/ui/icons'
import { EmptyStageArt, OfflineArt } from '../../components/ui/illustrations'
import {
  Card,
  DateBadge,
  EmptyState,
  Pill,
  PrimaryButton,
  SectionHeader,
} from '../../components/ui/primitives'
import { CompactTitle } from '../../components/ui/scroll'
import { TabHeader } from '../../components/ui/TabHeader'
import type { CalendarEvent } from '../../lib/api'
import { formatDayParts, formatIsoDate, formatMonth, formatNight } from '../../lib/format'
import { joinParts } from '../../lib/labels'
import { useLocale } from '../../lib/useLocale'
import { CONTEST_PATH } from '../contest/contest'
import { buildCalendar, isMultiDay, isPastEvent, isPreseason, type CalendarDay } from './calendar'
import { eventPath, useSeasonEvents } from './useEvents'

interface EventRowProps {
  event: CalendarEvent
  today: string
  seasonStart: string
  /** En la fila de hoy, un evento que empezó antes y sigue. */
  ongoing?: boolean
}

function EventRow({ event, today, seasonStart, ongoing = false }: EventRowProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const estimated = event.estado === 'estimado'
  const until =
    isMultiDay(event) &&
    t(estimated ? 'calendar.approxUntil' : 'calendar.until', {
      date: formatIsoDate(event.fecha_fin, locale),
    })
  // Una sola etiqueta por evento (decisión 92), la que más importa: que está en curso, que la
  // fecha es estimada (decisión 56) o que es de la pretemporada. En curso y estimado a la vez,
  // el «aprox.» del texto sigue diciendo que la fecha no es firme.
  const label = ongoing ? (
    <Pill tone="brand">{t('calendar.ongoing')}</Pill>
  ) : estimated ? (
    <Pill tone="amber">{t('eventStatus.estimado')}</Pill>
  ) : isPreseason(event, seasonStart) ? (
    <Pill>{t('calendar.preseason')}</Pill>
  ) : null

  return (
    // Lo que ya terminó queda a la vista, en segundo plano.
    <li className={isPastEvent(event, today) ? 'opacity-60' : undefined}>
      <Link to={eventPath(event.slug)} className="flex min-h-11 items-center gap-2 py-1">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.0625rem] leading-snug font-bold">
            {event.nombre}
          </span>
          <span className="text-soft block truncate text-sm">
            {joinParts([t(`eventType.${event.tipo}`), until, event.lugar])}
          </span>
          {label && <span className="mt-1 block">{label}</span>}
        </span>
        <ChevronRightIcon className="text-soft size-5 shrink-0 opacity-40" />
      </Link>
    </li>
  )
}

function DayRow({
  day,
  today,
  seasonStart,
}: {
  day: CalendarDay
  today: string
  seasonStart: string
}) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { weekday, dayOfMonth } = formatDayParts(day.date, locale)
  const empty = day.events.length === 0 && day.ongoing.length === 0
  const past = day.date < today

  return (
    <li
      aria-current={day.isToday ? 'date' : undefined}
      className={`flex scroll-mt-28 gap-3 px-4 py-3 ${day.isToday ? 'bg-brand-soft/60' : ''}`}
    >
      {/* Tocar el día abre el pizarrón de esa noche. */}
      <Link
        to={`/?noche=${day.date}`}
        aria-label={t('calendar.openNight', { date: formatNight(day.date, locale) })}
        className={`pressable self-start ${past ? 'opacity-60' : ''}`}
      >
        <DateBadge today={day.isToday} top={weekday} bottom={dayOfMonth} />
      </Link>
      <div className="min-w-0 flex-1 self-center">
        {day.isToday && (
          <p className="text-brand text-[0.75rem] font-extrabold tracking-[0.08em] uppercase">
            {t('calendar.today')}
          </p>
        )}
        {empty ? (
          <p className="text-soft text-sm">{t('calendar.nothingToday')}</p>
        ) : (
          <ul className="space-y-1">
            {day.events.map((event) => (
              <EventRow key={event.id} event={event} today={today} seasonStart={seasonStart} />
            ))}
            {day.ongoing.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                today={today}
                seasonStart={seasonStart}
                ongoing
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  )
}

/** El calendario de la temporada: todos los eventos, por mes y por día, con hoy marcado. */
export function CalendarPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { today, season, events } = useSeasonEvents()
  const months = useMemo(
    () => (events.data ? buildCalendar(events.data, today) : []),
    [events.data, today],
  )
  const failed = season.isError || (events.isError && !events.data)
  const retry = () => void (season.isError ? season.refetch() : events.refetch())
  const noSeason = !season.isPending && !season.isError && !season.data
  const seasonStart = season.data?.fecha_inicio
  const ready = Boolean(events.data && seasonStart && months.length > 0)

  // El calendario abre en hoy: la pretemporada queda arriba, a un scroll de distancia. Una
  // sola vez, cuando aparece la lista (en los tests, jsdom no sabe scrollear).
  const list = useRef<HTMLDivElement>(null)
  const centered = useRef(false)
  useEffect(() => {
    if (!ready || centered.current) return
    centered.current = true
    const row = list.current?.querySelector('[aria-current="date"]')
    if (row && typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'center' })
  }, [ready])

  return (
    <main className="mx-auto max-w-2xl pb-6">
      <CompactTitle title={t('calendar.title')} />
      <TabHeader
        title={t('calendar.title')}
        subtitle={season.data ? t('season.title', { year: season.data.anio }) : undefined}
        overlap
      />

      <div className="px-4">
        <Link
          to={CONTEST_PATH}
          className="pressable bg-surface shadow-card relative z-10 -mt-11 flex min-h-16 items-center gap-3 rounded-[1.375rem] p-4"
        >
          <span
            aria-hidden="true"
            className="bg-sun-soft text-sun-ink inline-flex size-11 shrink-0 items-center justify-center rounded-full"
          >
            <TicketIcon className="size-5.5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[1.0625rem] leading-snug font-extrabold tracking-tight">
              {t('contest.title')}
            </span>
            <span className="text-soft block text-sm">{t('contest.card')}</span>
          </span>
          <ChevronRightIcon className="text-soft size-5 shrink-0 opacity-50" />
        </Link>

        {failed ? (
          <div role="alert">
            <EmptyState
              illustration={<OfflineArt />}
              title={t('calendar.error')}
              action={<PrimaryButton onClick={retry}>{t('today.retry')}</PrimaryButton>}
            />
          </div>
        ) : noSeason || (events.data && events.data.length === 0) ? (
          <EmptyState illustration={<EmptyStageArt />}>{t('calendar.empty')}</EmptyState>
        ) : !events.data || !seasonStart ? (
          <p className="text-soft py-6 text-center">{t('calendar.loading')}</p>
        ) : (
          <div ref={list}>
            {months.map(({ month, days }) => (
              <section key={month} aria-labelledby={`mes-${month}`} className="pt-5">
                <SectionHeader id={`mes-${month}`} title={formatMonth(month, locale)} capitalize />
                <Card>
                  <ul className="divide-line divide-y">
                    {days.map((day) => (
                      <DayRow key={day.date} day={day} today={today} seasonStart={seasonStart} />
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
