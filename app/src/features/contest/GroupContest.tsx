import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { formatNight, formatTime } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { CONTEST_PATH, contestNightsOfGroup } from './contest'
import { useContestFixture } from './useContestFixture'

interface GroupContestProps {
  groupId: number
  /** Si el conjunto está en el Concurso esta temporada (`conjunto_temporada.en_concurso`). */
  inContest: boolean
}

const badge = 'rounded-md border px-2 py-0.5 text-sm font-semibold'

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
    <section aria-labelledby="en-el-concurso" className="space-y-3">
      <h2 id="en-el-concurso" className="text-xl font-bold">
        {t('contest.inContest')}
      </h2>
      {nights.length === 0 ? (
        <p className="text-soft">{t('contest.groupNotPublished')}</p>
      ) : (
        <>
          <ul className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
            {nights.map((night) => {
              const suspended = night.estado === 'suspendida'
              return (
                <li
                  key={night.etapa_id}
                  className={`flex gap-3 py-3 ${night.fecha < today ? 'opacity-60' : ''}`}
                >
                  <time
                    dateTime={night.inicio}
                    className={`w-20 shrink-0 text-lg font-semibold tabular-nums ${suspended ? 'text-soft' : ''}`}
                  >
                    {formatTime(night.inicio, locale)}
                  </time>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold first-letter:uppercase">
                      {formatNight(night.fecha, locale)}
                    </p>
                    <p className="text-soft">
                      {t('contest.groupNight', {
                        round: t(`round.${night.rueda}`),
                        number: night.numero,
                      })}
                    </p>
                    {night.estado !== 'programada' && (
                      <p className="mt-1">
                        <span
                          className={`${badge} ${suspended ? 'border-danger text-danger' : 'border-accent text-accent'}`}
                        >
                          {t(`status.${night.estado}`)}
                        </span>
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <p>
            <Link
              to={CONTEST_PATH}
              className="text-accent inline-flex min-h-12 items-center underline"
            >
              {t('contest.seeFixture')}
            </Link>
          </p>
        </>
      )}
    </section>
  )
}
