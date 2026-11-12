import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import { nocheLogica } from '@cuerda/shared'
import { BackButton } from '../../components/ui/BackButton'
import { ChevronRightIcon, FacebookIcon, InstagramIcon, ShareIcon } from '../../components/ui/icons'
import { EmptySearchArt, EmptyStageArt, OfflineArt } from '../../components/ui/illustrations'
import {
  Avatar,
  Card,
  DateBadge,
  EmptyState,
  Pill,
  PrimaryButton,
  RoundButton,
  SectionHeader,
} from '../../components/ui/primitives'
import type { UpcomingAct } from '../../lib/api'
import { categoryColor, categoryGradientStyle } from '../../lib/category'
import { formatDayParts, formatNight, formatTime } from '../../lib/format'
import { joinParts, priceLabel } from '../../lib/labels'
import { canShare, share } from '../../lib/share'
import { SITE_URL } from '../../lib/site'
import { useSystemBars } from '../../lib/systemBars'
import { useLocale } from '../../lib/useLocale'
import { useNow } from '../../lib/useNow'
import { GroupContest } from '../contest/GroupContest'
import { FollowButton } from '../follow/FollowButton'
import { useCurrentSeason } from '../season/useCurrentSeason'
import { GroupBadges } from './GroupBadges'
import { byNight, useGroup, useGroupFromList, useUpcomingActs } from './useGroup'

const social =
  'pressable bg-surface shadow-card text-ink inline-flex size-13 items-center justify-center rounded-2xl'

/** Sólo se enlaza una dirección web de verdad: lo que venga con otro esquema no se muestra. */
function webUrl(value: string | null): string | null {
  return value && /^https?:\/\//i.test(value) ? value : null
}

function UpcomingRow({ act, tonight }: { act: UpcomingAct; tonight: boolean }) {
  const { t } = useTranslation()
  const locale = useLocale()
  const suspended = act.estado === 'suspendida'
  const day = formatDayParts(act.noche, locale)
  const summary = joinParts([
    act.escenario_tipo && t(`stageType.${act.escenario_tipo}`),
    act.escenario_barrio,
    priceLabel(t, act.gratis, act.precio_texto),
  ])
  const details = joinParts([
    act.etapa_rueda && t(`round.${act.etapa_rueda}`),
    // La parada de un itinerante es de la actuación, no del escenario.
    act.itinerante === true && act.direccion,
  ])

  return (
    <li className={`relative flex items-center gap-3 px-4 py-3 ${suspended ? 'opacity-70' : ''}`}>
      <DateBadge
        today={tonight}
        top={tonight ? t('calendar.today') : `${day.weekday} ${day.dayOfMonth}`}
        bottom={
          <time dateTime={act.inicio} className={suspended ? 'line-through' : ''}>
            {formatTime(act.inicio, locale)}
          </time>
        }
      />
      <div className="min-w-0 flex-1">
        <p className="text-[1.0625rem] leading-snug font-bold">
          <Link
            to={`/escenarios/${encodeURIComponent(act.escenario_slug)}?noche=${act.noche}`}
            className="after:absolute after:inset-0"
          >
            {act.escenario_nombre}
          </Link>
        </p>
        {summary && <p className="text-soft mt-0.5 truncate text-sm">{summary}</p>}
        {details && <p className="text-soft mt-0.5 text-sm">{details}</p>}
        {act.estado !== 'programada' && (
          <p className="mt-1.5">
            <Pill tone={suspended ? 'danger' : 'amber'}>{t(`status.${act.estado}`)}</Pill>
          </p>
        )}
      </div>
      <ChevronRightIcon className="text-soft size-5 shrink-0 opacity-40" />
    </li>
  )
}

/** La ficha de un conjunto: quién es, dónde encontrarlo y qué le queda por actuar. */
export function GroupPage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  useSystemBars('onLight')
  const tonight = nocheLogica(useNow())
  const groupQuery = useGroup(slug)
  const listed = useGroupFromList(slug)
  const group = groupQuery.data ?? listed
  const season = useCurrentSeason(tonight)
  const upcoming = useUpcomingActs(group?.id, tonight)
  const nights = useMemo(() => byNight(upcoming.data ?? []), [upcoming.data])

  // Si se entró directo a la ficha no hay a dónde volver: «Volver» lleva a la lista.
  const backButton = <BackButton fallback="/conjuntos" />

  if (!group) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-3 pb-6">
        {backButton}
        <h1 className="mt-4 text-[1.875rem] leading-tight font-extrabold tracking-tight">
          {t('group.title')}
        </h1>
        {groupQuery.isPending ? (
          <p className="text-soft mt-2">{t('group.loading')}</p>
        ) : groupQuery.isError ? (
          <div role="alert">
            <EmptyState
              illustration={<OfflineArt />}
              title={t('group.error')}
              action={
                <PrimaryButton onClick={() => void groupQuery.refetch()}>
                  {t('today.retry')}
                </PrimaryButton>
              }
            />
          </div>
        ) : (
          <EmptyState illustration={<EmptySearchArt />} title={t('group.notFound')} />
        )}
      </main>
    )
  }

  const seasonId = season.data?.id
  const participation = group.temporadas.find((s) => s.temporada_id === seasonId) ?? null
  const instagram = webUrl(group.instagram)
  const facebook = webUrl(group.facebook)

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 pt-3 pb-6">
      <div className="flex items-center justify-between">
        {backButton}
        {canShare() && (
          <RoundButton
            label={t('group.share')}
            onClick={() =>
              void share({
                title: group.nombre,
                text: t('group.shareText', { name: group.nombre }),
                url: SITE_URL,
              })
            }
          >
            <ShareIcon className="size-5" />
          </RoundButton>
        )}
      </div>

      <header
        className="relative overflow-hidden rounded-[1.75rem] p-5 text-white shadow-[0_14px_34px_rgb(15_23_42/0.18)]"
        style={categoryGradientStyle(group.categoria)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 360 220"
          preserveAspectRatio="xMidYMid slice"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <path
            d="M-10 70 C 70 30, 130 120, 210 76 S 320 10, 380 60"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.2"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <rect
            x="262"
            y="40"
            width="9"
            height="6"
            rx="3"
            fill="#ffc83d"
            opacity="0.85"
            transform="rotate(-28 266 43)"
          />
          <rect
            x="304"
            y="104"
            width="9"
            height="6"
            rx="3"
            fill="#ffffff"
            opacity="0.6"
            transform="rotate(34 308 107)"
          />
          <circle cx="228" cy="84" r="2.6" fill="#ffffff" opacity="0.6" />
          <rect
            x="292"
            y="168"
            width="8"
            height="5"
            rx="2.5"
            fill="#7ef0c3"
            opacity="0.8"
            transform="rotate(-40 296 170)"
          />
        </svg>
        <div className="relative">
          <Avatar
            name={group.nombre}
            category={group.categoria}
            photoUrl={group.foto_url}
            size="lg"
            onColor
          />
          <h1 className="mt-4 text-[2rem] leading-[1.08] font-extrabold tracking-tight text-balance">
            {group.nombre}
          </h1>
          <ul className="mt-3 flex flex-wrap gap-2">
            <li
              className="rounded-full bg-white px-3 py-1 text-[0.8125rem] font-bold"
              style={{ color: categoryColor(group.categoria) }}
            >
              <span style={{ color: `var(--cat-${group.categoria}-ink)` }}>
                {t(`category.${group.categoria}`)}
              </span>
            </li>
            {group.barrio && (
              <li className="rounded-full bg-white/20 px-3 py-1 text-[0.8125rem] font-bold">
                {group.barrio}
              </li>
            )}
            <GroupBadges season={participation} onColor />
          </ul>
        </div>
      </header>

      <FollowButton
        groupId={group.id}
        groupName={group.nombre}
        aside={
          (instagram || facebook) && (
            <section aria-labelledby="redes" className="flex gap-3">
              <h2 id="redes" className="sr-only">
                {t('group.links')}
              </h2>
              {instagram && (
                <a
                  href={instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('group.instagram')}
                  className={social}
                >
                  <InstagramIcon className="size-6" />
                </a>
              )}
              {facebook && (
                <a
                  href={facebook}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t('group.facebook')}
                  className={social}
                >
                  <FacebookIcon className="size-6" />
                </a>
              )}
            </section>
          )
        }
      />

      {group.bio && (
        <p className="text-soft px-1 text-[1.0625rem] whitespace-pre-line">{group.bio}</p>
      )}

      <section aria-labelledby="proximas">
        <SectionHeader id="proximas" title={t('group.upcoming')} />
        {upcoming.isError && upcoming.data && !upcoming.isFetching && (
          <p role="alert" className="text-danger px-1 pb-2 text-sm font-semibold">
            {t('today.refreshError')}
          </p>
        )}
        {upcoming.isPending ? (
          <p className="text-soft px-1">{t('today.loading')}</p>
        ) : upcoming.isError && !upcoming.data ? (
          <div role="alert">
            <EmptyState
              illustration={<OfflineArt />}
              title={t('today.error')}
              action={
                <PrimaryButton onClick={() => void upcoming.refetch()}>
                  {t('today.retry')}
                </PrimaryButton>
              }
            />
          </div>
        ) : nights.length === 0 ? (
          <Card>
            <EmptyState illustration={<EmptyStageArt />}>{t('group.noUpcoming')}</EmptyState>
          </Card>
        ) : (
          <div className="space-y-3">
            {nights.map(({ noche, acts }) => (
              <div key={noche}>
                {/* La fecha ya está en cada fila; el título de la noche queda para los lectores. */}
                <h3 className="sr-only">
                  {noche === tonight ? t('stage.tonight') : formatNight(noche, locale)}
                </h3>
                <Card>
                  <ul className="divide-line divide-y">
                    {acts.map((act) => (
                      <UpcomingRow key={act.actuacion_id} act={act} tonight={noche === tonight} />
                    ))}
                  </ul>
                </Card>
              </div>
            ))}
          </div>
        )}
      </section>

      <GroupContest groupId={group.id} inContest={participation?.en_concurso === true} />
    </main>
  )
}
