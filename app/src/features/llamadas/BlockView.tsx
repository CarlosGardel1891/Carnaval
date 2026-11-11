import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { passTime, paradeRules } from '@cuerda/shared'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { useUserLocation } from '../location/locationContext'
import { useDistanceLabel } from '../location/useDistanceLabel'
import { useFollowed } from '../follow/useFollow'
import { groupPath } from '../groups/groupPath'
import { NearbyNotice } from '../today/NearbyNotice'
import { EstimatedTime, EstimateNote } from './Estimate'
import { useLlamadasNight } from './llamadasContext'
import { blocksOf, nearestBlock, passTimes, type Block } from './parade'
import { paradeOrderQuery, paradeRouteQuery } from './useLlamadas'

const badge = 'rounded-md border px-2 py-0.5 text-sm font-semibold'

/**
 * A qué hora pasa cada comparsa por una cuadra. La cuadra se elige de la lista o con
 * «Cerca mío», que toma la más cercana a donde está el usuario. Va en la URL (`?cuadra=`).
 * Todo se calcula en el teléfono, con el recorrido y el orden ya descargados.
 */
export function BlockView() {
  const { t } = useTranslation()
  const { night } = useLlamadasNight()
  const [params, setParams] = useSearchParams()
  const distanceLabel = useDistanceLabel()
  const { status, request, dismiss, coords } = useUserLocation()
  const route = useQuery(paradeRouteQuery(night.id))
  const order = useQuery(paradeOrderQuery(night.id))
  const { ids: followed } = useFollowed()
  /** Con «Cerca mío» prendido, la cuadra es la más cercana a donde está el usuario. */
  const [near, setNear] = useState(false)

  const blocks = useMemo(() => blocksOf(route.data ?? []), [route.data])
  const nearest = near && coords ? nearestBlock(blocks, coords) : null
  const chosen = blocks.find((b) => String(b.number) === params.get('cuadra')) ?? null
  // Mientras «Cerca mío» está prendido manda la posición; si no, la cuadra elegida a mano.
  const block = near ? (nearest?.block ?? null) : chosen
  const slots = block && order.data ? passTimes(night, order.data, block) : []
  const name = (b: Block) => t('llamadas.block.name', { street: b.street, from: b.from, to: b.to })

  const choose = (number: string) => {
    setNear(false)
    dismiss()
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (number) next.set('cuadra', number)
        else next.delete('cuadra')
        return next
      },
      { replace: true },
    )
  }

  const toggleNear = async () => {
    if (near) {
      setNear(false)
      dismiss()
    } else if (await request()) {
      setNear(true)
    }
  }

  if (route.isPending) return <p className="text-soft py-4">{t('llamadas.loading')}</p>
  if (route.isError && !route.data) {
    return (
      <div role="alert" className="space-y-3 py-4">
        <p className="text-lg">{t('llamadas.routeError')}</p>
        <Button onClick={() => void route.refetch()}>{t('today.retry')}</Button>
      </div>
    )
  }
  if (blocks.length === 0) return <p className="py-4 text-lg">{t('llamadas.noRoute')}</p>

  return (
    <section aria-labelledby="por-cuadra" className="space-y-3 pt-2">
      <h2 id="por-cuadra" className="text-xl font-bold">
        {t('llamadas.block.title')}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t('llamadas.block.label')}</span>
          <select
            value={block ? String(block.number) : ''}
            onChange={(event) => choose(event.target.value)}
            className="bg-surface border-line min-h-12 w-full rounded-xl border px-3 text-lg"
          >
            <option value="">{t('llamadas.block.choose')}</option>
            {blocks.map((b) => (
              <option key={b.number} value={b.number}>
                {t('llamadas.block.option', { number: b.number, from: b.from, to: b.to })}
              </option>
            ))}
          </select>
        </label>
        <Chip pressed={near} disabled={status === 'locating'} onClick={() => void toggleNear()}>
          {t('nearby.label')}
        </Chip>
      </div>
      <NearbyNotice
        status={status}
        approximate={false}
        hiddenStages={0}
        onRetry={() => void toggleNear()}
      />
      {night.recorrido_estado === 'estimado' && (
        <p className="text-soft">{t('llamadas.routeEstimated')}</p>
      )}

      {block && (
        <div className="space-y-1">
          <h3 className="text-lg font-bold">{name(block)}</h3>
          {nearest && (
            <p className="text-accent font-semibold">
              {t('llamadas.block.nearest', { distance: distanceLabel(nearest.distanceM) })}
            </p>
          )}
          <EstimateNote night={night} />
          <p className="text-soft">{t('llamadas.block.middle')}</p>
          {order.isPending ? (
            <p className="text-soft py-2">{t('llamadas.loading')}</p>
          ) : slots.length === 0 ? (
            // Sin orden, igual se puede decir cuándo llega el desfile a esa cuadra.
            <div className="space-y-2 py-2">
              <p className="text-lg">{t('llamadas.block.noOrder')}</p>
              <p className="text-lg">
                {t('llamadas.block.first')}{' '}
                <EstimatedTime
                  time={passTime(night.fecha_inicio, 1, block.middleM, paradeRules(night))}
                />
              </p>
            </div>
          ) : (
            <ol className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
              {slots.map((slot) => (
                <li key={slot.conjunto_id} className="flex items-center gap-3 py-3">
                  <EstimatedTime time={slot.time} className="w-24 shrink-0 text-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-semibold">
                      <Link
                        to={groupPath(slot.conjunto_slug)}
                        className="decoration-soft underline underline-offset-4"
                      >
                        {slot.conjunto_nombre}
                      </Link>
                    </p>
                    {followed.has(slot.conjunto_id) && (
                      <p className="mt-1">
                        <span className={`${badge} border-accent text-accent`}>
                          {t('llamadas.following')}
                        </span>
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </section>
  )
}
