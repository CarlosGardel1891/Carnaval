import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams } from 'react-router'
import { Button } from '../../components/Button'
import type { Coords } from '../../lib/api'
import { directionsUrl } from '../../lib/directions'
import { formatNight, formatTime } from '../../lib/format'
import { joinParts, priceLabel } from '../../lib/labels'
import { useLocale } from '../../lib/useLocale'
import { mapMarkers } from '../map/markers'
import { useLocatedStages } from '../map/useLocatedStages'
import { ActRow } from '../today/ActRow'
import { hasLocation, onStageNow } from '../today/board'
import { useNightActs } from '../today/useNightActs'
import { useNoche } from '../today/useNoche'
import { stageFromActs, useStage } from './useStage'

const NOBODY: ReadonlySet<number> = new Set()

const action =
  'bg-raised text-ink border-line inline-flex min-h-12 items-center rounded-xl border px-5 font-semibold'

function DirectionsLink({ to, label }: { to: Coords; label: string }) {
  const { t } = useTranslation()
  return (
    <a href={directionsUrl(to, label)} target="_blank" rel="noreferrer" className={action}>
      {t('stage.directions')}
    </a>
  )
}

/** La ficha de un escenario: qué es, dónde queda y qué pasa ahí esa noche. */
export function StagePage() {
  const { slug = '' } = useParams()
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const location = useLocation()
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
  const back = () => void (location.key === 'default' ? navigate('/') : navigate(-1))
  const backButton = (
    <Button variant="secondary" onClick={back}>
      {t('stage.back')}
    </Button>
  )

  const stage = stageQuery.data ?? stageFromActs(acts)
  if (!stage) {
    const waiting = stageQuery.isPending || (stageQuery.isError && night.isPending)
    return (
      <main className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-6">
        {backButton}
        <h1 className="text-3xl font-bold">{t('stage.title')}</h1>
        {waiting ? (
          <p className="text-soft">{t('stage.loading')}</p>
        ) : stageQuery.isError ? (
          <div role="alert" className="space-y-3">
            <p className="text-lg">{t('stage.error')}</p>
            <Button onClick={() => void stageQuery.refetch()}>{t('today.retry')}</Button>
          </div>
        ) : (
          <p className="text-lg">{t('stage.notFound')}</p>
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
    <main className="mx-auto max-w-2xl space-y-5 px-4 pt-4 pb-6">
      {backButton}
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">{stage.nombre}</h1>
        <p className="text-soft text-lg">
          {joinParts([
            stage.tipo && t(`stageType.${stage.tipo}`),
            stage.barrio,
            itinerant && t('stage.itinerant'),
          ])}
        </p>
        {price && <p className="text-lg font-semibold">{price}</p>}
      </header>

      {itinerant ? (
        <section aria-labelledby="paradas" className="space-y-2">
          <h2 id="paradas" className="text-xl font-bold">
            {isTonight ? t('stage.stopsTonight') : t('stage.stops')}
          </h2>
          <p className="text-soft">{t('stage.itinerantHint')}</p>
          {stops.length > 0 && (
            <ul className="space-y-3 pt-1">
              {stops.map((stop) => (
                <li key={stop.key} className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg">
                    {joinParts([stop.inicio && formatTime(stop.inicio, locale), stop.direccion])}
                  </p>
                  <DirectionsLink to={stop} label={stop.direccion ?? stage.nombre} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section aria-labelledby="donde" className="space-y-2">
          <h2 id="donde" className="text-xl font-bold">
            {t('stage.where')}
          </h2>
          {stage.direccion && <p className="text-lg">{stage.direccion}</p>}
          {coords ? (
            <DirectionsLink to={coords} label={stage.nombre} />
          ) : (
            locationKnown && <p className="text-soft">{t('stage.noLocation')}</p>
          )}
        </section>
      )}

      <section aria-labelledby="grilla" className="space-y-2">
        <h2 id="grilla" className="text-xl font-bold first-letter:uppercase">
          {isTonight ? t('stage.tonight') : formatNight(noche, locale)}
        </h2>
        {night.isError && night.data && !night.isFetching && (
          <p role="alert" className="text-danger">
            {t('today.refreshError')}
          </p>
        )}
        {night.isPending ? (
          <p className="text-soft">{t('today.loading')}</p>
        ) : night.isError && !night.data ? (
          <div role="alert" className="space-y-3">
            <p className="text-lg">{t('today.error')}</p>
            <Button onClick={() => void night.refetch()}>{t('today.retry')}</Button>
          </div>
        ) : acts.length === 0 ? (
          <p className="text-lg">{isTonight ? t('stage.noActsTonight') : t('stage.noActs')}</p>
        ) : (
          <ul className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
            {acts.map((act) => (
              <ActRow key={act.actuacion_id} act={act} onStage={onStage.has(act.actuacion_id)} />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
