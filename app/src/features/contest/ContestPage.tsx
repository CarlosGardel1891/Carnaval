import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { BackButton } from '../../components/ui/BackButton'
import { EmptyStageArt, OfflineArt } from '../../components/ui/illustrations'
import {
  CategoryPill,
  EmptyState,
  Pill,
  PrimaryButton,
  Segmented,
} from '../../components/ui/primitives'
import { fetchEvents, type CalendarEvent } from '../../lib/api'
import { formatIsoDate, formatNight, formatTime } from '../../lib/format'
import { useSystemBars } from '../../lib/systemBars'
import { useLocale } from '../../lib/useLocale'
import { Tickets } from '../calendar/Tickets'
import { hasTickets } from '../calendar/ticketSale'
import { groupPath } from '../groups/groupPath'
import {
  contestRounds,
  currentRound,
  isSampleFixture,
  type ContestNight,
  type Round,
} from './contest'
import { useContestFixture } from './useContestFixture'

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
      className={`bg-surface shadow-card overflow-hidden rounded-[1.375rem] ${
        isToday ? 'ring-brand ring-2' : ''
      } ${night.fecha < today ? 'opacity-60' : ''}`}
    >
      <h3 className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-4 pb-2 text-[1.0625rem] leading-tight">
        <span className="font-extrabold tracking-tight">{title}</span>
        {/* Tocar la fecha abre el pizarrón de esa noche. */}
        <Link
          to={`/?noche=${night.fecha}`}
          aria-label={t('calendar.openNight', { date })}
          className="text-accent -my-2 inline-flex min-h-11 items-center font-bold first-letter:uppercase"
        >
          {date}
        </Link>
        {isToday && (
          <span className="bg-brand rounded-full px-2.5 py-0.5 text-[0.8125rem] font-bold text-white">
            {t('calendar.today')}
          </span>
        )}
      </h3>
      {night.acts.length === 0 ? (
        <p className="text-soft px-4 pb-4 text-sm">{t('contest.noActs')}</p>
      ) : (
        <ul className="divide-line border-line divide-y border-t">
          {night.acts.map((act) => {
            const suspended = act.estado === 'suspendida'
            return (
              <li key={act.actuacion_id} className="relative flex items-center gap-3 px-4 py-3">
                <time
                  dateTime={act.inicio}
                  className={`w-[3.75rem] shrink-0 self-start pt-px text-[1.0625rem] font-extrabold tabular-nums ${
                    suspended ? 'text-soft line-through' : ''
                  }`}
                >
                  {formatTime(act.inicio, locale)}
                </time>
                <div className="min-w-0 flex-1">
                  <p className="text-[1.0625rem] leading-snug font-bold">
                    <Link
                      to={groupPath(act.conjunto_slug)}
                      className="after:absolute after:inset-0"
                    >
                      {suspended ? (
                        <s className="text-soft">{act.conjunto_nombre}</s>
                      ) : (
                        act.conjunto_nombre
                      )}
                    </Link>
                  </p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <CategoryPill category={act.conjunto_categoria}>
                      {t(`category.${act.conjunto_categoria}`)}
                    </CategoryPill>
                    {act.estado !== 'programada' && (
                      <Pill tone={suspended ? 'danger' : 'amber'}>{t(`status.${act.estado}`)}</Pill>
                    )}
                  </p>
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
    <p className="text-ink mt-2 font-bold">
      {t(first.estado === 'estimado' ? 'contest.startsAround' : 'contest.startsOn', {
        date: formatIsoDate(first.fecha_inicio, locale),
      })}
    </p>
  )
}

/**
 * El Concurso Oficial: las ruedas en un segmentado y, de la elegida, una tarjeta por noche con
 * los conjuntos que actúan. La rueda va en la URL (`?rueda=`); sin elegir, es la que está en
 * curso o la que viene.
 */
export function ContestPage() {
  const { t } = useTranslation()
  useSystemBars('onLight')
  const [params, setParams] = useSearchParams()
  const { today, season, fixture } = useContestFixture()
  const rows = fixture.data
  const rounds = useMemo(() => (rows ? contestRounds(rows) : []), [rows])
  const failed = season.isError || (fixture.isError && !rows)
  const retry = () => void (season.isError ? season.refetch() : fixture.refetch())
  const noSeason = !season.isPending && !season.isError && !season.data
  const contestEvents = useContestEvents(season.data?.id)
  // Las entradas del Concurso son las de su evento en el calendario (decisión 60).
  const withTickets = contestEvents.find(hasTickets)

  const chosen =
    rounds.find((round) => round.rueda === params.get('rueda')) ?? currentRound(rounds, today)
  const choose = (rueda: Round) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('rueda', rueda)
        return next
      },
      { replace: true },
    )

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 pt-3 pb-6">
      <BackButton fallback="/calendario" />
      <header>
        <h1 className="text-[1.875rem] leading-[1.1] font-extrabold tracking-tight">
          {t('contest.title')}
        </h1>
        <p className="text-soft mt-1.5 text-[1.0625rem] font-semibold">
          {season.data ? t('contest.subtitle', { year: season.data.anio }) : t('contest.venue')}
        </p>
      </header>

      {withTickets && <Tickets event={withTickets} />}

      {failed ? (
        <div role="alert">
          <EmptyState
            illustration={<OfflineArt />}
            title={t('contest.error')}
            action={<PrimaryButton onClick={retry}>{t('today.retry')}</PrimaryButton>}
          />
        </div>
      ) : noSeason ? (
        <EmptyState illustration={<EmptyStageArt />}>{t('contest.noSeason')}</EmptyState>
      ) : !rows || !season.data ? (
        <p className="text-soft py-6 text-center">{t('contest.loading')}</p>
      ) : !chosen ? (
        // Sin etapas cargadas: el fixture todavía no se publicó. No es una lista vacía.
        <div className="bg-surface shadow-card rounded-[1.375rem]">
          <EmptyState
            illustration={<EmptyStageArt />}
            title={t('contest.notPublished', { year: season.data.anio })}
          >
            <p>{t('contest.notPublishedHint')}</p>
            <ContestStart first={contestEvents[0]} />
          </EmptyState>
        </div>
      ) : (
        <>
          {isSampleFixture(rows) && (
            <p
              role="note"
              className="bg-brand-soft text-brand rounded-2xl px-4 py-2.5 text-sm font-semibold"
            >
              {t('contest.sample')}
            </p>
          )}
          {fixture.isError && !fixture.isFetching && (
            <p
              role="alert"
              className="bg-danger-soft text-danger rounded-2xl px-4 py-2.5 text-sm font-semibold"
            >
              {t('today.refreshError')}
            </p>
          )}
          {rounds.length > 1 && (
            <Segmented
              label={t('contest.rounds')}
              value={chosen.rueda}
              options={rounds.map((round) => ({
                value: round.rueda,
                label: t(`round.${round.rueda}`),
              }))}
              onChange={choose}
            />
          )}
          <section aria-labelledby={`rueda-${chosen.rueda}`} className="space-y-3">
            <h2
              id={`rueda-${chosen.rueda}`}
              className={
                rounds.length > 1
                  ? 'sr-only'
                  : 'px-1 text-[1.1875rem] leading-tight font-extrabold tracking-tight'
              }
            >
              {t(`round.${chosen.rueda}`)}
            </h2>
            {chosen.nights.map((night) => (
              <NightCard key={night.etapa_id} night={night} today={today} />
            ))}
          </section>
        </>
      )}
    </main>
  )
}
