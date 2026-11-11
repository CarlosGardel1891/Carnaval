import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { nocheLogica } from '@cuerda/shared'
import { Button } from '../../components/Button'
import type { UpcomingAct } from '../../lib/api'
import { formatNight, formatTime } from '../../lib/format'
import { joinParts } from '../../lib/labels'
import { useLocale } from '../../lib/useLocale'
import { useNow } from '../../lib/useNow'
import { GroupContest } from '../contest/GroupContest'
import { FollowButton } from '../follow/FollowButton'
import { useCurrentSeason } from '../season/useCurrentSeason'
import { GroupBadges } from './GroupBadges'
import { byNight, useGroup, useGroupFromList, useUpcomingActs } from './useGroup'

const action =
  'bg-raised text-ink border-line inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold'
const badge = 'rounded-md border px-2 py-0.5 font-semibold'

/** Sólo se enlaza una dirección web de verdad: lo que venga con otro esquema no se muestra. */
function webUrl(value: string | null): string | null {
  return value && /^https?:\/\//i.test(value) ? value : null
}

function UpcomingRow({ act }: { act: UpcomingAct }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const suspended = act.estado === 'suspendida'
  const details = joinParts([
    act.etapa_rueda && t(`round.${act.etapa_rueda}`),
    // La parada de un itinerante es de la actuación, no del escenario.
    act.itinerante === true && act.direccion,
  ])

  return (
    <li className="flex gap-3 py-3">
      <time
        dateTime={act.inicio}
        className={`w-20 shrink-0 text-lg font-semibold tabular-nums ${suspended ? 'text-soft' : ''}`}
      >
        {formatTime(act.inicio, locale)}
      </time>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-semibold">
          <Link
            to={`/escenarios/${encodeURIComponent(act.escenario_slug)}?noche=${act.noche}`}
            className="text-accent underline"
          >
            {act.escenario_nombre}
          </Link>
        </p>
        {details && <p className="text-soft">{details}</p>}
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
}

/** La ficha de un conjunto: quién es, dónde encontrarlo y qué le queda por actuar. */
export function GroupPage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
  const tonight = nocheLogica(useNow())
  const groupQuery = useGroup(slug)
  const listed = useGroupFromList(slug)
  const group = groupQuery.data ?? listed
  const season = useCurrentSeason(tonight)
  const upcoming = useUpcomingActs(group?.id, tonight)
  const nights = useMemo(() => byNight(upcoming.data ?? []), [upcoming.data])

  // Si se entró directo a la ficha no hay a dónde volver: «Volver» lleva a la lista.
  const back = () => void (location.key === 'default' ? navigate('/conjuntos') : navigate(-1))
  const backButton = (
    <Button variant="secondary" onClick={back}>
      {t('stage.back')}
    </Button>
  )

  if (!group) {
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-6">
        {backButton}
        <h1 className="text-3xl font-bold">{t('group.title')}</h1>
        {groupQuery.isPending ? (
          <p className="text-soft">{t('group.loading')}</p>
        ) : groupQuery.isError ? (
          <div role="alert" className="space-y-3">
            <p className="text-lg">{t('group.error')}</p>
            <Button onClick={() => void groupQuery.refetch()}>{t('today.retry')}</Button>
          </div>
        ) : (
          <p className="text-lg">{t('group.notFound')}</p>
        )}
      </main>
    )
  }

  const seasonId = season.data?.id
  const participation = group.temporadas.find((s) => s.temporada_id === seasonId) ?? null
  const instagram = webUrl(group.instagram)
  const facebook = webUrl(group.facebook)

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 pt-4 pb-6">
      {backButton}
      <header className="flex items-start gap-4">
        {group.foto_url && (
          <img
            src={group.foto_url}
            alt=""
            loading="lazy"
            className="border-line h-20 w-20 shrink-0 rounded-2xl border object-cover"
          />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-3xl font-bold">{group.nombre}</h1>
          <p className="text-soft text-lg">
            {joinParts([t(`category.${group.categoria}`), group.barrio])}
          </p>
          <GroupBadges season={participation} />
        </div>
      </header>

      <FollowButton groupId={group.id} groupName={group.nombre} />

      {group.bio && <p className="text-lg whitespace-pre-line">{group.bio}</p>}

      {(instagram || facebook) && (
        <section aria-labelledby="redes" className="space-y-2">
          <h2 id="redes" className="text-xl font-bold">
            {t('group.links')}
          </h2>
          <ul className="flex flex-wrap gap-3">
            {instagram && (
              <li>
                <a href={instagram} target="_blank" rel="noreferrer" className={action}>
                  {t('group.instagram')}
                </a>
              </li>
            )}
            {facebook && (
              <li>
                <a href={facebook} target="_blank" rel="noreferrer" className={action}>
                  {t('group.facebook')}
                </a>
              </li>
            )}
          </ul>
        </section>
      )}

      <GroupContest groupId={group.id} inContest={participation?.en_concurso === true} />

      <section aria-labelledby="proximas" className="space-y-3">
        <h2 id="proximas" className="text-xl font-bold">
          {t('group.upcoming')}
        </h2>
        {upcoming.isError && upcoming.data && !upcoming.isFetching && (
          <p role="alert" className="text-danger">
            {t('today.refreshError')}
          </p>
        )}
        {upcoming.isPending ? (
          <p className="text-soft">{t('today.loading')}</p>
        ) : upcoming.isError && !upcoming.data ? (
          <div role="alert" className="space-y-3">
            <p className="text-lg">{t('today.error')}</p>
            <Button onClick={() => void upcoming.refetch()}>{t('today.retry')}</Button>
          </div>
        ) : nights.length === 0 ? (
          <p className="text-lg">{t('group.noUpcoming')}</p>
        ) : (
          nights.map(({ noche, acts }) => (
            <div key={noche} className="space-y-1">
              <h3 className="text-soft text-lg font-semibold first-letter:uppercase">
                {noche === tonight ? t('stage.tonight') : formatNight(noche, locale)}
              </h3>
              <ul className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
                {acts.map((act) => (
                  <UpcomingRow key={act.actuacion_id} act={act} />
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  )
}
