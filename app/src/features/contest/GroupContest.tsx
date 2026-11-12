import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Card, DateBadge, Pill, SectionHeader } from '../../components/ui/primitives'
import { formatDayParts, formatMonthShort, formatNight, formatTime } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { CONTEST_PATH, contestNightsOfGroup } from './contest'
import { useContestFixture } from './useContestFixture'

interface GroupContestProps {
  groupId: number
  /** Si el conjunto está en el Concurso esta temporada (`conjunto_temporada.en_concurso`). */
  inContest: boolean
}

/**
 * Las noches de un conjunto en el Concurso Oficial, para su ficha: todas, también las que
 * ya pasaron. Salen del mismo fixture que la pantalla del Concurso. Si el conjunto no está
 * en el fixture no se muestra nada, salvo que esté en el Concurso y el fixture todavía no
 * se haya publicado: entonces se dice.
 */
export function GroupContest({ groupId, inContest }: GroupContestProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const { today, fixture } = useContestFixture()
  const rows = fixture.data
  const nights = useMemo(() => (rows ? contestNightsOfGroup(rows, groupId) : []), [rows, groupId])

  if (!rows) return null
  const notPublished = rows.length === 0
  if (nights.length === 0 && !(inContest && notPublished)) return null

  return (
    <section aria-labelledby="en-el-concurso">
      <SectionHeader id="en-el-concurso" title={t('contest.inContest')} />
      {nights.length === 0 ? (
        <Card className="p-4">
          <p className="text-soft">{t('contest.groupNotPublished')}</p>
        </Card>
      ) : (
        <>
          <Card>
            <ul className="divide-line divide-y">
              {nights.map((night) => {
                const suspended = night.estado === 'suspendida'
                const day = formatDayParts(night.fecha, locale)
                return (
                  <li
                    key={night.etapa_id}
                    className={`flex items-center gap-3 px-4 py-3 ${night.fecha < today ? 'opacity-60' : ''}`}
                  >
                    <DateBadge
                      today={night.fecha === today}
                      top={`${day.weekday} ${day.dayOfMonth}`}
                      bottom={
                        <span className="uppercase">{formatMonthShort(night.fecha, locale)}</span>
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[1.0625rem] leading-snug font-bold">
                        {t('contest.groupNight', {
                          round: t(`round.${night.rueda}`),
                          number: night.numero,
                        })}
                      </p>
                      <p className="text-soft mt-0.5 text-sm">
                        <span className="inline-block first-letter:uppercase">
                          {formatNight(night.fecha, locale)}
                        </span>
                        {' · '}
                        <time
                          dateTime={night.inicio}
                          className={`font-bold tabular-nums ${suspended ? 'line-through' : 'text-ink'}`}
                        >
                          {formatTime(night.inicio, locale)}
                        </time>
                      </p>
                      {night.estado !== 'programada' && (
                        <p className="mt-1.5">
                          <Pill tone={suspended ? 'danger' : 'amber'}>
                            {t(`status.${night.estado}`)}
                          </Pill>
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
          <p className="px-1 pt-1">
            <Link
              to={CONTEST_PATH}
              className="text-accent inline-flex min-h-11 items-center text-[0.9375rem] font-bold"
            >
              {t('contest.seeFixture')}
            </Link>
          </p>
        </>
      )}
    </section>
  )
}
