import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Constants } from '@cuerda/shared'
import { CloseIcon } from '../../components/ui/icons'
import { PrimaryLink, RoundButton } from '../../components/ui/primitives'
import { Button } from '../../components/Button'
import { formatNight, formatTime } from '../../lib/format'
import { joinParts } from '../../lib/labels'
import { useSystemBars } from '../../lib/systemBars'
import { useLocale } from '../../lib/useLocale'
import { useUserLocation } from '../location/locationContext'
import { useStagePath } from '../stages/stagePath'
import { countStagesWithoutLocation } from '../today/board'
import { useNightActs } from '../today/useNightActs'
import { useNoche } from '../today/useNoche'
import { MarkerDot } from './MarkerDot'
import { mapMarkers, type MapMarker } from './markers'
import { MontevideoMap } from './MontevideoMap'
import { useLocatedStages } from './useLocatedStages'

/** Los controles del mapa quedan por encima de la barra de pestañas. */
const mapVars = { '--map-bottom': 'var(--tabbar-space)' } as CSSProperties

/**
 * El mapa de la noche (decisión 92), a pantalla completa: los escenarios con ubicación y dónde
 * está cada itinerante. Arriba flota el título con las referencias; tocar un marcador abre su
 * tarjeta abajo, y de ahí se va a la ficha.
 */
export function MapPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const stagePath = useStagePath()
  useSystemBars('onLight')
  const { noche } = useNoche()
  const stages = useLocatedStages(noche)
  // La misma consulta que el pizarrón sin filtros: de acá salen las paradas de los itinerantes.
  const acts = useNightActs(noche)
  const { coords, status, restore } = useUserLocation()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const hasKey = Boolean(import.meta.env.VITE_MAPTILER_KEY)

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
  const selected = markers.find((marker) => marker.key === selectedKey) ?? null

  const detailsOf = useCallback(
    (marker: MapMarker) =>
      joinParts([
        marker.tipo && t(`stageType.${marker.tipo}`),
        marker.inicio && formatTime(marker.inicio, locale),
        marker.direccion,
      ]),
    [t, locale],
  )
  const labelOf = useCallback(
    (marker: MapMarker) => joinParts([marker.nombre, detailsOf(marker)]),
    [detailsOf],
  )
  const open = useCallback((marker: MapMarker) => setSelectedKey(marker.key), [])
  const close = useCallback(() => setSelectedKey(null), [])

  const loading = stages.isPending || acts.isPending
  const failed = (stages.isError && !stages.data) || (acts.isError && !acts.data)
  // Falló la actualización, pero hay con qué armar el mapa: se avisa que es lo anterior.
  const stale =
    !failed && (stages.isError || acts.isError) && !stages.isFetching && !acts.isFetching
  const empty = !loading && !failed && markers.length === 0

  return (
    <main className="fixed inset-0" style={mapVars}>
      <MontevideoMap
        markers={markers}
        labelOf={labelOf}
        onOpen={open}
        user={coords}
        selectedKey={selectedKey}
        onBackground={close}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-3 pt-[calc(var(--safe-top)+0.75rem)]">
        <header className="shadow-float pointer-events-auto mx-auto max-w-2xl rounded-[1.375rem] border border-white/70 bg-white/90 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-[1.5rem] leading-tight font-extrabold tracking-tight">
              {t('map.title')}
            </h1>
            <p className="text-soft text-sm font-semibold first-letter:uppercase">
              {formatNight(noche, locale)}
            </p>
          </div>
          {types.length > 0 && (
            <ul
              aria-label={t('map.legend')}
              className="no-scrollbar -mx-4 mt-2 flex gap-x-4 overflow-x-auto px-4"
            >
              {types.map((tipo) => (
                <li
                  key={tipo}
                  className="flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap"
                >
                  <MarkerDot tipo={tipo} className="size-5" />
                  {t(`stageType.${tipo}`)}
                </li>
              ))}
            </ul>
          )}
          {loading && <p className="text-soft mt-1 text-sm">{t('map.loading')}</p>}
          {failed && (
            <div role="alert" className="mt-2 space-y-2">
              <p className="font-semibold">{t('map.error')}</p>
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
            <p role="alert" className="text-danger mt-1 text-sm font-semibold">
              {t('today.refreshError')}
            </p>
          )}
          {empty && <p className="text-soft mt-1 text-sm">{t('map.empty')}</p>}
          {notOnMap > 0 && (
            <p className="text-soft mt-1.5 text-sm">{t('map.notOnMap', { count: notOnMap })}</p>
          )}
        </header>
        {!hasKey && (
          <p className="bg-brand-soft text-brand shadow-card mx-auto mt-2 w-fit max-w-full rounded-full px-4 py-1.5 text-center text-sm font-semibold">
            {t('map.missingKey')}
          </p>
        )}
      </div>

      {selected && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--tabbar-space)+0.5rem)] z-10 px-3">
          <section
            aria-labelledby="map-selected"
            className="bg-surface shadow-float pointer-events-auto mx-auto max-w-md rounded-[1.375rem] p-4"
          >
            <div className="flex items-start gap-3">
              <MarkerDot tipo={selected.tipo} className="mt-0.5 size-10" />
              <div className="min-w-0 flex-1">
                <h2
                  id="map-selected"
                  className="text-[1.1875rem] leading-tight font-extrabold tracking-tight"
                >
                  {selected.nombre}
                </h2>
                <p className="text-soft mt-0.5 text-[0.9375rem]">{detailsOf(selected)}</p>
              </div>
              <RoundButton label={t('map.close')} onClick={close} className="bg-raised shadow-none">
                <CloseIcon className="size-5" />
              </RoundButton>
            </div>
            <PrimaryLink to={stagePath(selected.slug)} className="mt-4 w-full">
              {t('map.openStage')}
            </PrimaryLink>
          </section>
        </div>
      )}
    </main>
  )
}
