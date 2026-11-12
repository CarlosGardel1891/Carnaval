import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { BackButton } from '../../components/ui/BackButton'
import { MapPinIcon, NearIcon } from '../../components/ui/icons'
import { EmptyStageArt, OfflineArt } from '../../components/ui/illustrations'
import {
  Card,
  EmptyState,
  Pill,
  PrimaryButton,
  PrimaryLink,
  SectionHeader,
} from '../../components/ui/primitives'
import type { Coords } from '../../lib/api'
import { directionsUrl } from '../../lib/directions'
import { formatNight, formatTime } from '../../lib/format'
import { joinParts, priceLabel } from '../../lib/labels'
import { useSystemBars } from '../../lib/systemBars'
import { useLocale } from '../../lib/useLocale'
import { mapMarkers } from '../map/markers'
import { useLocatedStages } from '../map/useLocatedStages'
import { ActRow } from '../today/ActRow'
import { hasLocation, onStageNow } from '../today/board'
import { useNightActs } from '../today/useNightActs'
import { useNoche } from '../today/useNoche'
import { stageFromActs, useStage } from './useStage'

const NOBODY: ReadonlySet<number> = new Set()

/** La ficha de un escenario: qué es, dónde queda y qué pasa ahí esa noche. */
export function StagePage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  useSystemBars('onLight')
  const { noche, isTonight, now } = useNoche()
  const stageQuery = useStage(slug)
  // La misma consulta que el pizarrón sin filtros: viniendo de «Hoy», ya está en la caché.
  const night = useNightActs(noche)
  const located = useLocatedStages(noche)

  const acts = useMemo(
    () => (night.data ?? []).filter((act) => act.escenario_slug === slug),
    [night.data, slug],
  )
  const onStage = useMemo(
    () => (isTonight ? onStageNow(acts, now) : NOBODY),
    [isTonight, acts, now],
  )
  // Las paradas de la noche de un itinerante, como en el mapa.
  const stops = useMemo(() => mapMarkers([], acts), [acts])

  // Si se entró directo a la ficha no hay a dónde volver: «Volver» lleva a Hoy.
  const backButton = <BackButton fallback="/" />

  const stage = stageQuery.data ?? stageFromActs(acts)
  if (!stage) {
    const waiting = stageQuery.isPending || (stageQuery.isError && night.isPending)
    return (
      <main className="mx-auto max-w-2xl px-4 pt-3 pb-6">
        {backButton}
        <h1 className="mt-4 text-[1.875rem] leading-tight font-extrabold tracking-tight">
          {t('stage.title')}
        </h1>
        {waiting ? (
          <p className="text-soft mt-2">{t('stage.loading')}</p>
        ) : stageQuery.isError ? (
          <div role="alert">
            <EmptyState
              illustration={<OfflineArt />}
              title={t('stage.error')}
              action={
                <PrimaryButton onClick={() => void stageQuery.refetch()}>
                  {t('today.retry')}
                </PrimaryButton>
              }
            />
          </div>
        ) : (
          <EmptyState illustration={<EmptyStageArt />} title={t('stage.notFound')} />
        )}
      </main>
    )
  }

  const itinerant = stage.itinerante === true
  const price = priceLabel(t, stage.gratis, stage.precio_texto)
  const fixed = located.data?.find((s) => s.slug === slug && !s.itinerante)
  const actWithLocation = acts.find(hasLocation)
  const coords: Coords | null = itinerant
    ? null
    : fixed
      ? { lat: fixed.lat, lng: fixed.lng }
      : actWithLocation
        ? { lat: actWithLocation.lat as number, lng: actWithLocation.lng as number }
        : null
  // Mientras no se sabe si tiene ubicación, no se dice que falta.
  const locationKnown = coords !== null || !located.isPending

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 pt-3 pb-6">
      {backButton}
      <header>
        <h1 className="text-[1.875rem] leading-[1.1] font-extrabold tracking-tight text-balance">
          {stage.nombre}
        </h1>
        <p className="text-soft mt-1.5 text-[1.0625rem] font-semibold">
          {joinParts([
            stage.tipo && t(`stageType.${stage.tipo}`),
            stage.barrio,
            itinerant && t('stage.itinerant'),
          ])}
        </p>
        {price && (
          <p className="mt-2.5">
            <Pill
              tone={stage.gratis === true ? 'ok' : 'brand'}
              className="px-3 py-1 text-[0.9375rem]"
            >
              {price}
            </Pill>
          </p>
        )}
      </header>

      {itinerant ? (
        <section aria-labelledby="paradas">
          <SectionHeader
            id="paradas"
            title={isTonight ? t('stage.stopsTonight') : t('stage.stops')}
          />
          <Card className="p-4">
            <p className="text-soft text-[0.9375rem]">{t('stage.itinerantHint')}</p>
            {stops.length > 0 && (
              <ul className="divide-line mt-2 divide-y">
                {stops.map((stop) => (
                  <li
                    key={stop.key}
                    className="flex flex-wrap items-center justify-between gap-x-3 py-2"
                  >
                    <p className="text-[1.0625rem] font-bold">
                      {joinParts([stop.inicio && formatTime(stop.inicio, locale), stop.direccion])}
                    </p>
                    <a
                      href={directionsUrl(stop, stop.direccion ?? stage.nombre)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent inline-flex min-h-11 items-center gap-1.5 font-bold"
                    >
                      <NearIcon className="size-4.5" />
                      {t('stage.directions')}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>
      ) : (
        <section aria-labelledby="donde">
          <SectionHeader id="donde" title={t('stage.where')} />
          <Card className="p-4">
            {stage.direccion && (
              <p className="flex items-center gap-3 text-[1.0625rem] font-bold">
                <span
                  aria-hidden="true"
                  className="bg-brand-soft text-brand inline-flex size-11 shrink-0 items-center justify-center rounded-full"
                >
                  <MapPinIcon className="size-5.5" />
                </span>
                {stage.direccion}
              </p>
            )}
            {coords ? (
              <PrimaryLink
                href={directionsUrl(coords, stage.nombre)}
                icon={<NearIcon className="size-5" />}
                className={`w-full ${stage.direccion ? 'mt-4' : ''}`}
              >
                {t('stage.directions')}
              </PrimaryLink>
            ) : (
              locationKnown && (
                <p className={`text-soft text-[0.9375rem] ${stage.direccion ? 'mt-3' : ''}`}>
                  {t('stage.noLocation')}
                </p>
              )
            )}
          </Card>
        </section>
      )}

      <section aria-labelledby="grilla">
        <div className="first-letter:uppercase">
          <SectionHeader
            id="grilla"
            title={isTonight ? t('stage.tonight') : formatNight(noche, locale)}
          />
        </div>
        {night.isError && night.data && !night.isFetching && (
          <p role="alert" className="text-danger px-1 pb-2 text-sm font-semibold">
            {t('today.refreshError')}
          </p>
        )}
        {night.isPending ? (
          <p className="text-soft px-1">{t('today.loading')}</p>
        ) : night.isError && !night.data ? (
          <div role="alert">
            <EmptyState
              illustration={<OfflineArt />}
              title={t('today.error')}
              action={
                <PrimaryButton onClick={() => void night.refetch()}>
                  {t('today.retry')}
                </PrimaryButton>
              }
            />
          </div>
        ) : acts.length === 0 ? (
          <Card>
            <EmptyState illustration={<EmptyStageArt />}>
              {isTonight ? t('stage.noActsTonight') : t('stage.noActs')}
            </EmptyState>
          </Card>
        ) : (
          <Card>
            <ul className="divide-line divide-y">
              {acts.map((act) => (
                <ActRow key={act.actuacion_id} act={act} onStage={onStage.has(act.actuacion_id)} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </main>
  )
}
