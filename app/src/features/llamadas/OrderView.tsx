import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { useFollowed } from '../follow/useFollow'
import { groupPath } from '../groups/groupPath'
import { useGroups } from '../groups/useGroups'
import { EstimatedTime, EstimateNote } from './Estimate'
import { useLlamadasNight } from './llamadasContext'
import { departures, SAMPLE_ORDER_SOURCE } from './parade'
import { paradeOrderQuery } from './useLlamadas'

const badge = 'rounded-md border px-2 py-0.5 text-sm font-semibold'

/** Las comparsas clasificadas a las Llamadas, mientras no esté el orden. */
function Qualified({ seasonId }: { seasonId: number }) {
  const { t } = useTranslation()
  const groups = useGroups()
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
    <section aria-labelledby="clasificadas" className="space-y-2 pt-2">
      <h2 id="clasificadas" className="text-xl font-bold">
        {t('llamadas.qualified', { count: qualified.length })}
      </h2>
      <p className="text-soft">{t('llamadas.qualifiedNote')}</p>
      <ul className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
        {qualified.map((group) => (
          <li key={group.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
            <Link
              to={groupPath(group.slug)}
              className="decoration-soft text-lg font-semibold underline underline-offset-4"
            >
              {group.nombre}
            </Link>
            {group.barrio && <span className="text-soft">{group.barrio}</span>}
            {followed.has(group.id) && (
              <span className={`${badge} border-accent text-accent`}>
                {t('llamadas.following')}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

/** El orden de desfile de la noche, con la hora estimada de salida de cada comparsa. */
export function OrderView() {
  const { t } = useTranslation()
  const { night } = useLlamadasNight()
  const order = useQuery(paradeOrderQuery(night.id))
  const { ids: followed } = useFollowed()
  const slots = useMemo(
    () => (order.data ? departures(night, order.data) : []),
    [night, order.data],
  )

  if (order.isPending) return <p className="text-soft py-4">{t('llamadas.loading')}</p>
  if (order.isError && !order.data) {
    return (
      <div role="alert" className="space-y-3 py-4">
        <p className="text-lg">{t('llamadas.orderError')}</p>
        <Button onClick={() => void order.refetch()}>{t('today.retry')}</Button>
      </div>
    )
  }

  if (slots.length === 0) {
    // Sin orden cargado no hay una lista vacía: todavía no se publicó.
    return (
      <div className="space-y-2 py-3">
        <p className="text-lg font-semibold">{t('llamadas.notPublished')}</p>
        <p className="text-soft">{t('llamadas.notPublishedHint')}</p>
        <Qualified seasonId={night.temporada_id} />
      </div>
    )
  }

  return (
    <section aria-labelledby="orden" className="space-y-1 pt-2">
      <h2 id="orden" className="text-xl font-bold">
        {t('llamadas.order')}
      </h2>
      {slots.some((slot) => slot.fuente === SAMPLE_ORDER_SOURCE) && (
        <p role="note" className="border-accent text-accent rounded-xl border px-4 py-3">
          {t('llamadas.sample')}
        </p>
      )}
      <EstimateNote night={night} />
      <ol className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
        {slots.map((slot) => (
          <li key={slot.conjunto_id} className="flex items-center gap-3 py-3">
            <span
              aria-label={t('llamadas.position', { number: slot.posicion })}
              className="text-soft w-8 shrink-0 text-center text-lg font-bold tabular-nums"
            >
              {slot.posicion}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold">
                <Link
                  to={groupPath(slot.conjunto_slug)}
                  className="decoration-soft underline underline-offset-4"
                >
                  {slot.conjunto_nombre}
                </Link>
              </p>
              {slot.conjunto_barrio && <p className="text-soft">{slot.conjunto_barrio}</p>}
              {followed.has(slot.conjunto_id) && (
                <p className="mt-1">
                  <span className={`${badge} border-accent text-accent`}>
                    {t('llamadas.following')}
                  </span>
                </p>
              )}
            </div>
            <EstimatedTime time={slot.time} className="shrink-0 text-lg" />
          </li>
        ))}
      </ol>
    </section>
  )
}
