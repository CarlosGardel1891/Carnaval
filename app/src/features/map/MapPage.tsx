import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Constants } from '@cuerda/shared'
import { Button } from '../../components/Button'
import { formatNight, formatTime } from '../../lib/format'
import { joinParts } from '../../lib/labels'
import { useLocale } from '../../lib/useLocale'
import { useUserLocation } from '../location/locationContext'
import { useStagePath } from '../stages/stagePath'
import { countStagesWithoutLocation } from '../today/board'
import { useNightActs } from '../today/useNightActs'
import { useNoche } from '../today/useNoche'
import { mapMarkers, markerShape, MARKER_STROKE, type MapMarker } from './markers'
import { MontevideoMap } from './MontevideoMap'
import { useLocatedStages } from './useLocatedStages'

/** El mapa de la noche: los escenarios con ubicación y dónde está cada itinerante. */
export function MapPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const navigate = useNavigate()
  const stagePath = useStagePath()
  const { noche } = useNoche()
  const stages = useLocatedStages(noche)
  // La misma consulta que el pizarrón sin filtros: de acá salen las paradas de los itinerantes.
  const acts = useNightActs(noche)
  const { coords, status, restore } = useUserLocation()

  // La posición se muestra sólo si ya había permiso: el mapa nunca lo pide.
  useEffect(() => {
    if (!coords && status === 'idle') void restore()
  }, [coords, status, restore])

  const markers = useMemo(
    () => mapMarkers(stages.data ?? [], acts.data ?? []),
    [stages.data, acts.data],
  )
  const types = useMemo(() => {
    const present = new Set(markers.map((marker) => marker.tipo))
    return Constants.public.Enums.tipo_escenario.filter((tipo) => present.has(tipo))
  }, [markers])
  const notOnMap = acts.data ? countStagesWithoutLocation(acts.data) : 0

  const labelOf = useCallback(
    (marker: MapMarker) =>
      joinParts([
        marker.nombre,
        marker.tipo && t(`stageType.${marker.tipo}`),
        marker.inicio && formatTime(marker.inicio, locale),
        marker.direccion,
      ]),
    [t, locale],
  )
  const open = useCallback(
    (marker: MapMarker) => void navigate(stagePath(marker.slug)),
    [navigate, stagePath],
  )

  const loading = stages.isPending || acts.isPending
  const failed = (stages.isError && !stages.data) || (acts.isError && !acts.data)
  // Falló la actualización, pero hay con qué armar el mapa: se avisa que es lo anterior.
  const stale =
    !failed && (stages.isError || acts.isError) && !stages.isFetching && !acts.isFetching

  return (
    <main className="flex h-full flex-col">
      <header className="space-y-1 px-4 pt-4 pb-3">
        <h1 className="text-2xl font-bold">{t('map.title')}</h1>
        <p className="text-soft first-letter:uppercase">{formatNight(noche, locale)}</p>
        {types.length > 0 && (
          <ul aria-label={t('map.legend')} className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {types.map((tipo) => {
              const shape = markerShape(tipo)
              return (
                <li key={tipo} className="flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
                    <path
                      d={shape.path}
                      fill={shape.color}
                      stroke={MARKER_STROKE}
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t(`stageType.${tipo}`)}
                </li>
              )
            })}
          </ul>
        )}
        {loading && <p className="text-soft">{t('map.loading')}</p>}
        {failed && (
          <div role="alert" className="space-y-2">
            <p>{t('map.error')}</p>
            <Button
              variant="secondary"
              onClick={() => {
                void stages.refetch()
                void acts.refetch()
              }}
            >
              {t('today.retry')}
            </Button>
          </div>
        )}
        {stale && (
          <p role="alert" className="text-danger">
            {t('today.refreshError')}
          </p>
        )}
        {!loading && !failed && markers.length === 0 && (
          <p className="text-soft">{t('map.empty')}</p>
        )}
        {notOnMap > 0 && <p className="text-soft">{t('map.notOnMap', { count: notOnMap })}</p>}
      </header>
      <div className="min-h-0 flex-1">
        <MontevideoMap markers={markers} labelOf={labelOf} onOpen={open} user={coords} />
      </div>
    </main>
  )
}
