import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Constants } from '@cuerda/shared'
import { Button } from '../../components/Button'
import { formatNight } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { useUserLocation } from '../location/locationContext'
import {
  categoriesPresent,
  countStagesWithoutLocation,
  filterByCategories,
  onlyLocatedStages,
  onStageNow,
} from './board'
import { EmptyNight } from './EmptyNight'
import { FilterBar } from './FilterBar'
import { NearbyNotice } from './NearbyNotice'
import { NightBoard } from './NightBoard'
import { UpdatedLine } from './UpdatedLine'
import { useBoardFilters } from './useBoardFilters'
import { useNightActs } from './useNightActs'
import { useNoche } from './useNoche'

const NOBODY: ReadonlySet<number> = new Set()

/** El pizarrón «Hoy»: qué conjunto actúa esta noche, dónde y a qué hora. */
export function TodayPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { noche, isTonight, now } = useNoche()
  const { filters, active, update, toggleCategory, clear } = useBoardFilters()
  const { coords, status, request, restore, dismiss } = useUserLocation()
  // «Gratis» lo filtra la base; la categoría, la app. Con «cerca mío», la base además
  // devuelve la distancia a cada escenario.
  const origin = filters.nearby ? coords : null
  const query = useNightActs(noche, { onlyFree: filters.onlyFree, origin })
  const acts = query.data
  // Mientras llega la consulta con distancias se sigue viendo el orden anterior.
  const byDistance = origin !== null && !query.isPlaceholderData

  // Abrir con `?cerca=1` vale sólo si ya había permiso: si no, se apaga sin preguntar.
  // El permiso se pide únicamente cuando el usuario toca «Cerca mío».
  useEffect(() => {
    if (!filters.nearby || coords || status !== 'idle') return
    let cancelled = false
    void restore().then((hadPermission) => {
      if (!hadPermission && !cancelled) update({ nearby: false })
    })
    return () => {
      cancelled = true
    }
  }, [filters.nearby, coords, status, restore, update])

  const turnNearbyOn = useCallback(async () => {
    if (await request()) update({ nearby: true })
  }, [request, update])

  const toggleNearby = useCallback(() => {
    if (filters.nearby) {
      update({ nearby: false })
      dismiss()
    } else {
      void turnNearbyOn()
    }
  }, [filters.nearby, update, dismiss, turnNearbyOn])

  // «Ahora en escena» sólo vale para la noche en curso, y no depende de la categoría.
  const onStage = useMemo(
    () => (isTonight && acts ? onStageNow(acts, now) : NOBODY),
    [isTonight, acts, now],
  )
  const matching = useMemo(
    () => (acts ? filterByCategories(acts, filters.categories) : []),
    [acts, filters.categories],
  )
  // «Cerca mío» deja afuera los escenarios sin ubicación cargada, y lo avisa.
  const visible = useMemo(
    () => (byDistance ? onlyLocatedStages(matching) : matching),
    [byDistance, matching],
  )
  const hiddenStages = byDistance ? countStagesWithoutLocation(matching) : 0
  // Las categorías de esa noche, más las elegidas (para poder sacarlas aunque no haya).
  const categories = useMemo(() => {
    const present = acts ? categoriesPresent(acts) : []
    return Constants.public.Enums.categoria_conjunto.filter(
      (c) => present.includes(c) || filters.categories.includes(c),
    )
  }, [acts, filters.categories])

  return (
    <main className="mx-auto max-w-2xl px-4 pb-6">
      <header className="pt-4 pb-2">
        <p className="text-accent font-semibold tracking-wide uppercase">{t('app.name')}</p>
        <h1 className="text-3xl font-bold">
          {isTonight ? t('today.title') : t('today.otherNight')}
        </h1>
        <p className="text-soft text-lg first-letter:uppercase">{formatNight(noche, locale)}</p>
        {!isTonight && (
          <Link to="/" className="text-accent inline-flex min-h-12 items-center underline">
            {t('today.backToTonight')}
          </Link>
        )}
      </header>

      {query.isPending && <p className="text-soft py-4">{t('today.loading')}</p>}

      {query.isError && !acts && (
        <div role="alert" className="space-y-3 py-4">
          <p className="text-lg">{t('today.error')}</p>
          <Button onClick={() => void query.refetch()}>{t('today.retry')}</Button>
        </div>
      )}

      {acts && (
        <>
          <UpdatedLine
            updatedAt={query.dataUpdatedAt}
            now={now}
            isFetching={query.isFetching}
            failed={query.isError}
            onRefresh={() => void query.refetch()}
          />
          {acts.length === 0 && !active ? (
            <EmptyNight noche={noche} />
          ) : (
            <>
              <FilterBar
                filters={filters}
                categories={categories}
                locating={status === 'locating'}
                onToggleNearby={toggleNearby}
                onToggleFree={() => update({ onlyFree: !filters.onlyFree })}
                onToggleCategory={toggleCategory}
                onView={(view) => update({ view })}
              />
              <NearbyNotice
                status={status}
                hiddenStages={hiddenStages}
                onRetry={() => void turnNearbyOn()}
              />
              {visible.length === 0 ? (
                <div className="space-y-3 py-2">
                  <p className="text-lg">{t('filters.noResults')}</p>
                  <Button variant="secondary" onClick={clear}>
                    {t('filters.clear')}
                  </Button>
                </div>
              ) : (
                <NightBoard
                  acts={visible}
                  onStage={onStage}
                  view={filters.view}
                  byDistance={byDistance}
                />
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}
