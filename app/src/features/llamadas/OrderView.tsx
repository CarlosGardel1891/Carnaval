import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { ChevronRightIcon, HeartIcon } from '../../components/ui/icons'
import { EmptyStageArt, OfflineArt } from '../../components/ui/illustrations'
import {
  Avatar,
  Card,
  EmptyState,
  Pill,
  PrimaryButton,
  SectionHeader,
} from '../../components/ui/primitives'
import { useFollowed } from '../follow/useFollow'
import { groupPath } from '../groups/groupPath'
import { EstimatedTime, EstimateNote } from './Estimate'
import { GLOSSARY_GROUP, GLOSSARY_TEASER } from './glossary'
import { useLlamadasNight } from './llamadasContext'
import { useLlamadasSearch } from './llamadasSearch'
import { blocksOf, departures, passTimes, SAMPLE_ORDER_SOURCE } from './parade'
import { llamadasGroupsQuery, paradeOrderQuery, paradeRouteQuery } from './useLlamadas'

function Following() {
  const { t } = useTranslation()
  return (
    <Pill tone="brand" className="gap-1">
      <HeartIcon filled className="size-3.5" />
      {t('llamadas.following')}
    </Pill>
  )
}

/** Un adelanto del glosario, para quien viene de afuera: unas tarjetas y el enlace a todo. */
function GlossaryTeaser() {
  const { t } = useTranslation()
  const search = useLlamadasSearch()
  return (
    <section aria-labelledby="que-es" className="pt-5">
      <SectionHeader
        id="que-es"
        title={t('llamadas.whatIs')}
        action={{
          label: t('llamadas.seeGlossary'),
          to: { pathname: '/llamadas/glosario', search },
        }}
      />
      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4">
        {GLOSSARY_TEASER.map((key) => (
          <li
            key={key}
            className="bg-surface shadow-card w-[13.5rem] shrink-0 rounded-[1.375rem] p-4"
          >
            <p className="text-brand text-[0.6875rem] font-extrabold tracking-[0.08em] uppercase">
              {t(`glossary.groups.${GLOSSARY_GROUP[key]}`)}
            </p>
            <p className="mt-1 text-[1.0625rem] font-extrabold tracking-tight">
              {t(`glossary.terms.${key}.term`)}
            </p>
            <p className="text-soft mt-1 line-clamp-3 text-sm">{t(`glossary.terms.${key}.text`)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Las comparsas clasificadas a las Llamadas, mientras no esté el orden. */
function Qualified({ seasonId }: { seasonId: number }) {
  const { t } = useTranslation()
  const groups = useQuery(llamadasGroupsQuery())
  const { ids: followed } = useFollowed()
  const qualified = useMemo(
    () =>
      (groups.data ?? []).filter((group) =>
        group.temporadas.some((s) => s.temporada_id === seasonId && s.en_llamadas),
      ),
    [groups.data, seasonId],
  )
  if (qualified.length === 0) return null
  return (
    <section aria-labelledby="clasificadas" className="pt-2">
      <SectionHeader
        id="clasificadas"
        title={t('llamadas.qualified', { count: qualified.length })}
      />
      <p className="text-soft px-1 pb-3 text-sm">{t('llamadas.qualifiedNote')}</p>
      <Card>
        <ul className="divide-line divide-y">
          {qualified.map((group) => (
            <li key={group.id} className="relative flex min-h-16 items-center gap-3 px-4 py-3">
              <Avatar name={group.nombre} category={group.categoria} photoUrl={group.foto_url} />
              <div className="min-w-0 flex-1">
                <p className="text-[1.0625rem] leading-snug font-bold">
                  <Link to={groupPath(group.slug)} className="after:absolute after:inset-0">
                    {group.nombre}
                  </Link>
                </p>
                {group.barrio && <p className="text-soft text-sm">{group.barrio}</p>}
                {followed.has(group.id) && (
                  <p className="mt-1">
                    <Following />
                  </p>
                )}
              </div>
              <ChevronRightIcon className="text-soft size-5 shrink-0 opacity-40" />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}

/** El orden de desfile de la noche, con la hora estimada de salida de cada comparsa. */
export function OrderView() {
  const { t } = useTranslation()
  const { night } = useLlamadasNight()
  const [params] = useSearchParams()
  const search = useLlamadasSearch()
  const order = useQuery(paradeOrderQuery(night.id))
  const route = useQuery(paradeRouteQuery(night.id))
  const { ids: followed } = useFollowed()
  const slots = useMemo(
    () => (order.data ? departures(night, order.data) : []),
    [night, order.data],
  )
  // Con «Tu cuadra» elegida, cada comparsa dice además a qué hora pasa por ahí.
  const passing = useMemo(() => {
    const block = blocksOf(route.data ?? []).find((b) => String(b.number) === params.get('cuadra'))
    if (!block || !order.data) return null
    return new Map(passTimes(night, order.data, block).map((slot) => [slot.conjunto_id, slot.time]))
  }, [route.data, order.data, night, params])

  if (order.isPending) return <p className="text-soft py-6 text-center">{t('llamadas.loading')}</p>
  if (order.isError && !order.data) {
    return (
      <div role="alert">
        <EmptyState
          illustration={<OfflineArt />}
          title={t('llamadas.orderError')}
          action={
            <PrimaryButton onClick={() => void order.refetch()}>{t('today.retry')}</PrimaryButton>
          }
        />
      </div>
    )
  }

  if (slots.length === 0) {
    // Sin orden cargado no hay una lista vacía: todavía no se publicó.
    return (
      <>
        <Card>
          <EmptyState illustration={<EmptyStageArt />} title={t('llamadas.notPublished')}>
            {t('llamadas.notPublishedHint')}
          </EmptyState>
        </Card>
        <Qualified seasonId={night.temporada_id} />
        <GlossaryTeaser />
      </>
    )
  }

  return (
    <>
      <section aria-labelledby="orden">
        <SectionHeader
          id="orden"
          title={t('llamadas.order')}
          action={{
            label: t('llamadas.seeRoute'),
            to: { pathname: '/llamadas/recorrido', search },
          }}
        />
        {slots.some((slot) => slot.fuente === SAMPLE_ORDER_SOURCE) && (
          <p
            role="note"
            className="bg-brand-soft text-brand mb-3 rounded-2xl px-4 py-2.5 text-sm font-semibold"
          >
            {t('llamadas.sample')}
          </p>
        )}
        <EstimateNote night={night} />
        <Card>
          <ol className="divide-line divide-y">
            {slots.map((slot) => {
              const mine = followed.has(slot.conjunto_id)
              const pass = passing?.get(slot.conjunto_id)
              return (
                <li
                  key={slot.conjunto_id}
                  className={`relative flex items-center gap-3 px-4 py-3 ${mine ? 'bg-brand-soft/60' : ''}`}
                >
                  <span
                    aria-label={t('llamadas.position', { number: slot.posicion })}
                    className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-extrabold tabular-nums ${
                      mine ? 'bg-brand text-white' : 'bg-raised text-soft'
                    }`}
                  >
                    {slot.posicion}
                  </span>
                  {/* La salida va antes en el documento y a la derecha en la pantalla. */}
                  <EstimatedTime
                    time={slot.time}
                    className="text-brand order-last shrink-0 text-[1.0625rem] font-extrabold"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[1.0625rem] leading-snug font-bold">
                      <Link
                        to={groupPath(slot.conjunto_slug)}
                        className="after:absolute after:inset-0"
                      >
                        {slot.conjunto_nombre}
                      </Link>
                    </p>
                    {slot.conjunto_barrio && (
                      <p className="text-soft text-sm">{slot.conjunto_barrio}</p>
                    )}
                    {pass && (
                      <p className="text-soft text-sm">
                        {t('llamadas.passesYourBlock')}{' '}
                        <EstimatedTime time={pass} className="font-bold" />
                      </p>
                    )}
                    {mine && (
                      <p className="mt-1">
                        <Following />
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </Card>
      </section>
      <GlossaryTeaser />
    </>
  )
}
