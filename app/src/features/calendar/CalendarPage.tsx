import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import type { CalendarEvent } from '../../lib/api'
import { formatDayParts, formatIsoDate, formatMonth, formatNight } from '../../lib/format'
import { joinParts } from '../../lib/labels'
import { useLocale } from '../../lib/useLocale'
import { CONTEST_PATH } from '../contest/contest'
import { buildCalendar, isMultiDay, isPastEvent, isPreseason, type CalendarDay } from './calendar'
import { eventPath, useSeasonEvents } from './useEvents'

const badge = 'rounded-md border px-2 py-0.5 text-sm font-semibold'

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

  return (
    // Lo que ya terminó queda a la vista, en segundo plano.
    <li className={isPastEvent(event, today) ? 'opacity-60' : undefined}>
      <Link to={eventPath(event.slug)} className="block py-2">
        <span className="decoration-soft block text-lg font-semibold underline underline-offset-4">
          {event.nombre}
        </span>
        <span className="text-soft block">
          {joinParts([t(`eventType.${event.tipo}`), until, event.lugar])}
        </span>
        {(ongoing || estimated || isPreseason(event, seasonStart)) && (
          <span className="mt-1 flex flex-wrap gap-2">
            {ongoing && (
              <span className={`${badge} bg-accent text-accent-ink border-accent`}>
                {t('calendar.ongoing')}
              </span>
            )}
            {estimated && (
              <span className={`${badge} border-accent text-accent`}>
                {t('eventStatus.estimado')}
              </span>
            )}
            {isPreseason(event, seasonStart) && (
              <span className={`${badge} border-line text-soft`}>{t('calendar.preseason')}</span>
            )}
          </span>
        )}
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
      className={`flex gap-3 py-2 ${day.isToday ? 'border-accent -mx-2 rounded-xl border px-2' : ''}`}
    >
      {/* Tocar el día abre el pizarrón de esa noche. */}
      <Link
        to={`/?noche=${day.date}`}
        aria-label={t('calendar.openNight', { date: formatNight(day.date, locale) })}
        className={`flex min-h-12 w-16 shrink-0 flex-col items-center justify-center rounded-xl border py-1 ${
          day.isToday ? 'bg-accent text-accent-ink border-accent' : 'bg-raised border-line'
        } ${past ? 'opacity-60' : ''}`}
      >
        <span className="text-2xl leading-none font-bold tabular-nums">{dayOfMonth}</span>
        <span className="text-sm first-letter:uppercase">{weekday}</span>
      </Link>
      <div className="min-w-0 flex-1">
        {day.isToday && <p className="text-accent font-semibold">{t('calendar.today')}</p>}
        {empty ? (
          <p className="text-soft py-2">{t('calendar.nothingToday')}</p>
        ) : (
          <ul>
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

  return (
    <main className="mx-auto max-w-2xl px-4 pb-6">
      <header className="pt-4 pb-2">
        <h1 className="text-3xl font-bold">{t('calendar.title')}</h1>
        {season.data && (
          <p className="text-soft text-lg">{t('season.title', { year: season.data.anio })}</p>
        )}
      </header>

      <Link
        to={CONTEST_PATH}
        className="bg-surface border-line my-2 flex min-h-12 items-center gap-3 rounded-2xl border px-4 py-3"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xl font-bold">{t('contest.title')}</span>
          <span className="text-soft block">{t('contest.card')}</span>
        </span>
        <svg
          viewBox="0 0 24 24"
          className="text-soft h-6 w-6 shrink-0"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>

      {failed ? (
        <div role="alert" className="space-y-3 py-4">
          <p className="text-lg">{t('calendar.error')}</p>
          <Button onClick={retry}>{t('today.retry')}</Button>
        </div>
      ) : noSeason || (events.data && events.data.length === 0) ? (
        <p className="py-4 text-lg">{t('calendar.empty')}</p>
      ) : !events.data || !seasonStart ? (
        <p className="text-soft py-4">{t('calendar.loading')}</p>
      ) : (
        months.map(({ month, days }) => (
          <section key={month} aria-labelledby={`mes-${month}`} className="pt-3">
            <h2 id={`mes-${month}`} className="text-xl font-bold first-letter:uppercase">
              {formatMonth(month, locale)}
            </h2>
            <ul className="divide-line divide-y">
              {days.map((day) => (
                <DayRow key={day.date} day={day} today={today} seasonStart={seasonStart} />
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  )
}
