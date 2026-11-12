import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { passTime, paradeRules } from '@cuerda/shared'
import { ChevronRightIcon, HeartIcon, NearIcon } from '../../components/ui/icons'
import { EmptyStageArt, OfflineArt } from '../../components/ui/illustrations'
import {
  Card,
  EmptyState,
  FilterChip,
  Pill,
  PrimaryButton,
  SectionHeader,
} from '../../components/ui/primitives'
import { useUserLocation } from '../location/locationContext'
import { useDistanceLabel } from '../location/useDistanceLabel'
import { useFollowed } from '../follow/useFollow'
import { groupPath } from '../groups/groupPath'
import { NearbyNotice } from '../today/NearbyNotice'
import { EstimatedTime, EstimateNote } from './Estimate'
import { useLlamadasNight } from './llamadasContext'
import { blocksOf, nearestBlock, passTimes, type Block } from './parade'
import { paradeOrderQuery, paradeRouteQuery } from './useLlamadas'

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

  if (route.isPending) return <p className="text-soft py-6 text-center">{t('llamadas.loading')}</p>
  if (route.isError && !route.data) {
    return (
      <div role="alert">
        <EmptyState
          illustration={<OfflineArt />}
          title={t('llamadas.routeError')}
          action={
            <PrimaryButton onClick={() => void route.refetch()}>{t('today.retry')}</PrimaryButton>
          }
        />
      </div>
    )
  }
  if (blocks.length === 0) {
    return <EmptyState illustration={<EmptyStageArt />}>{t('llamadas.noRoute')}</EmptyState>
  }

  return (
    <section aria-labelledby="por-cuadra">
      <SectionHeader id="por-cuadra" title={t('llamadas.block.title')} />
      <div className="flex flex-wrap items-center gap-2 pb-3">
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t('llamadas.block.label')}</span>
          <select
            value={block ? String(block.number) : ''}
            onChange={(event) => choose(event.target.value)}
            className="bg-surface shadow-card text-ink min-h-13 w-full rounded-2xl px-4 text-[1.0625rem] font-bold"
          >
            <option value="">{t('llamadas.block.choose')}</option>
            {blocks.map((b) => (
              <option key={b.number} value={b.number}>
                {t('llamadas.block.option', { number: b.number, from: b.from, to: b.to })}
              </option>
            ))}
          </select>
        </label>
        <FilterChip
          pressed={near}
          disabled={status === 'locating'}
          icon={<NearIcon className="size-4.5" />}
          onClick={() => void toggleNear()}
        >
          {t('nearby.label')}
        </FilterChip>
      </div>
      <NearbyNotice
        status={status}
        approximate={false}
        hiddenStages={0}
        onRetry={() => void toggleNear()}
      />
      {night.recorrido_estado === 'estimado' && (
        <p className="text-soft px-1 pb-3 text-sm">{t('llamadas.routeEstimated')}</p>
      )}

      {block && (
        <div>
          <h3 className="px-1 text-[1.1875rem] leading-tight font-extrabold tracking-tight">
            {name(block)}
          </h3>
          {nearest && (
            <p className="text-accent px-1 pt-1 text-sm font-bold">
              {t('llamadas.block.nearest', { distance: distanceLabel(nearest.distanceM) })}
            </p>
          )}
          <div className="pt-2">
            <EstimateNote night={night} />
          </div>
          <p className="text-soft px-1 pb-3 text-sm">{t('llamadas.block.middle')}</p>
          {order.isPending ? (
            <p className="text-soft py-2">{t('llamadas.loading')}</p>
          ) : slots.length === 0 ? (
            // Sin orden, igual se puede decir cuándo llega el desfile a esa cuadra.
            <Card className="space-y-2 p-4">
              <p className="font-bold">{t('llamadas.block.noOrder')}</p>
              <p>
                {t('llamadas.block.first')}{' '}
                <EstimatedTime
                  time={passTime(night.fecha_inicio, 1, block.middleM, paradeRules(night))}
                  className="text-brand font-extrabold"
                />
              </p>
            </Card>
          ) : (
            <Card>
              <ol className="divide-line divide-y">
                {slots.map((slot) => {
                  const mine = followed.has(slot.conjunto_id)
                  return (
                    <li
                      key={slot.conjunto_id}
                      className={`relative flex items-center gap-3 px-4 py-3 ${mine ? 'bg-brand-soft/60' : ''}`}
                    >
                      <EstimatedTime
                        time={slot.time}
                        className="text-brand w-[5.25rem] shrink-0 text-[1.0625rem] font-extrabold"
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
                        {mine && (
                          <p className="mt-1">
                            <Pill tone="brand" className="gap-1">
                              <HeartIcon filled className="size-3.5" />
                              {t('llamadas.following')}
                            </Pill>
                          </p>
                        )}
                      </div>
                      <ChevronRightIcon className="text-soft size-5 shrink-0 opacity-40" />
                    </li>
                  )
                })}
              </ol>
            </Card>
          )}
        </div>
      )}
    </section>
  )
}
