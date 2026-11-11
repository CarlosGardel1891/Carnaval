import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { Button } from '../../components/Button'
import { fetchEvents, type CalendarEvent } from '../../lib/api'
import { formatIsoDate, formatNight, formatTime } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { Tickets } from '../calendar/Tickets'
import { hasTickets } from '../calendar/ticketSale'
import { groupPath } from '../groups/groupPath'
import { contestRounds, isSampleFixture, type ContestNight } from './contest'
import { useContestFixture } from './useContestFixture'

const badge = 'rounded-md border px-2 py-0.5 text-sm font-semibold'

function NightCard({ night, today }: { night: ContestNight; today: string }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const date = formatNight(night.fecha, locale)
  const isToday = night.fecha === today
  const title = t('contest.night', { number: night.numero })

  return (
    <section
      // El nombre de la noche: «Etapa 1 · lunes, 25 de enero».
      aria-label={`${title} · ${date}`}
      className={`bg-surface rounded-2xl border px-4 ${isToday ? 'border-accent' : 'border-line'} ${
        night.fecha < today ? 'opacity-60' : ''
      }`}
    >
      <h3 className="flex flex-wrap items-baseline gap-x-2 pt-3 text-lg font-bold">
        <span>{title}</span>
        {/* Tocar la fecha abre el pizarrón de esa noche. */}
        <Link
          to={`/?noche=${night.fecha}`}
          aria-label={t('calendar.openNight', { date })}
          className="text-accent font-semibold underline first-letter:uppercase"
        >
          {date}
        </Link>
        {isToday && (
          <span className={`${badge} bg-accent text-accent-ink border-accent`}>
            {t('calendar.today')}
          </span>
        )}
      </h3>
      {night.acts.length === 0 ? (
        <p className="text-soft py-3">{t('contest.noActs')}</p>
      ) : (
        <ul className="divide-line divide-y">
          {night.acts.map((act) => {
            const suspended = act.estado === 'suspendida'
            return (
              <li key={act.actuacion_id} className="flex gap-3 py-3">
                <time
                  dateTime={act.inicio}
                  className={`w-20 shrink-0 text-lg font-semibold tabular-nums ${suspended ? 'text-soft' : ''}`}
                >
                  {formatTime(act.inicio, locale)}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold">
                    <Link
                      to={groupPath(act.conjunto_slug)}
                      className="decoration-soft underline underline-offset-4"
                    >
                      {suspended ? <s>{act.conjunto_nombre}</s> : act.conjunto_nombre}
                    </Link>
                  </p>
                  <p className="text-soft">{t(`category.${act.conjunto_categoria}`)}</p>
                  {act.estado !== 'programada' && (
                    <p className="mt-1">
                      <span
                        className={`${badge} ${suspended ? 'border-danger text-danger' : 'border-accent text-accent'}`}
                      >
                        {t(`status.${act.estado}`)}
                      </span>
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

/**
 * Los eventos del Concurso en el calendario de la temporada, el primero adelante (si hay una
 * fecha confirmada y otra estimada el mismo día, la confirmada). Es la misma consulta que el
 * calendario: viniendo de ahí, ya está en la caché.
 */
function useContestEvents(seasonId: number | undefined) {
  const events = useQuery({
    queryKey: ['eventos', seasonId],
    queryFn: () => fetchEvents(seasonId as number),
    enabled: seasonId !== undefined,
    staleTime: 60 * 60_000,
  })
  return useMemo(
    () =>
      (events.data ?? [])
        .filter((event) => event.tipo === 'concurso')
        .sort(
          (a, b) =>
            a.fecha_inicio.localeCompare(b.fecha_inicio) ||
            Number(a.estado === 'estimado') - Number(b.estado === 'estimado'),
        ),
    [events.data],
  )
}

/** Cuándo arranca el Concurso según el calendario, para cuando el fixture no está publicado. */
function ContestStart({ first }: { first: CalendarEvent | undefined }) {
  const { t } = useTranslation()
  const locale = useLocale()
  if (!first) return null
  return (
    <p className="text-soft text-lg">
      {t(first.estado === 'estimado' ? 'contest.startsAround' : 'contest.startsOn', {
        date: formatIsoDate(first.fecha_inicio, locale),
      })}
    </p>
  )
}

/** El Concurso Oficial: las ruedas, sus noches y los conjuntos de cada noche. */
export function ContestPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { today, season, fixture } = useContestFixture()
  const rows = fixture.data
  const rounds = useMemo(() => (rows ? contestRounds(rows) : []), [rows])
  const failed = season.isError || (fixture.isError && !rows)
  const retry = () => void (season.isError ? season.refetch() : fixture.refetch())
  const noSeason = !season.isPending && !season.isError && !season.data
  const contestEvents = useContestEvents(season.data?.id)
  // Las entradas del Concurso son las de su evento en el calendario (decisión 60).
  const withTickets = contestEvents.find(hasTickets)

  const back = () => void (location.key === 'default' ? navigate('/calendario') : navigate(-1))

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-6">
      <Button variant="secondary" onClick={back}>
        {t('stage.back')}
      </Button>
      <header>
        <h1 className="text-3xl font-bold">{t('contest.title')}</h1>
        <p className="text-soft text-lg">
          {season.data ? t('contest.subtitle', { year: season.data.anio }) : t('contest.venue')}
        </p>
      </header>

      {withTickets && <Tickets event={withTickets} />}

      {failed ? (
        <div role="alert" className="space-y-3">
          <p className="text-lg">{t('contest.error')}</p>
          <Button onClick={retry}>{t('today.retry')}</Button>
        </div>
      ) : noSeason ? (
        <p className="text-lg">{t('contest.noSeason')}</p>
      ) : !rows || !season.data ? (
        <p className="text-soft">{t('contest.loading')}</p>
      ) : rounds.length === 0 ? (
        // Sin etapas cargadas: el fixture todavía no se publicó. No es una lista vacía.
        <div className="space-y-2">
          <p className="text-lg font-semibold">
            {t('contest.notPublished', { year: season.data.anio })}
          </p>
          <p className="text-soft">{t('contest.notPublishedHint')}</p>
          <ContestStart first={contestEvents[0]} />
        </div>
      ) : (
        <>
          {isSampleFixture(rows) && (
            <p role="note" className="border-accent text-accent rounded-xl border px-4 py-3">
              {t('contest.sample')}
            </p>
          )}
          {fixture.isError && !fixture.isFetching && (
            <p role="alert" className="text-danger">
              {t('today.refreshError')}
            </p>
          )}
          {rounds.map(({ rueda, nights }) => (
            <section key={rueda} aria-labelledby={`rueda-${rueda}`} className="space-y-3">
              <h2 id={`rueda-${rueda}`} className="pt-2 text-2xl font-bold">
                {t(`round.${rueda}`)}
              </h2>
              {nights.map((night) => (
                <NightCard key={night.etapa_id} night={night} today={today} />
              ))}
            </section>
          ))}
        </>
      )}
    </main>
  )
}
