import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Constants } from '@cuerda/shared'
import { Button } from '../../components/Button'
import { formatNight } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { useFollowed } from '../follow/useFollow'
import { useUserLocation } from '../location/locationContext'
import {
  categoriesPresent,
  countStagesWithoutLocation,
  filterByCategories,
  onlyLocatedStages,
  onStageNow,
} from './board'
import { EmptyMine } from './EmptyMine'
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
  const { coords, approximate, status, request, restore, dismiss } = useUserLocation()
  // «Gratis» lo filtra la base; la categoría, la app. Con «cerca mío», la base además
  // devuelve la distancia a cada escenario.
  const origin = filters.nearby ? coords : null
  const followed = useFollowed()
  const query = useNightActs(noche, {
    onlyFree: filters.onlyFree,
    onlyFollowed: filters.mine,
    origin,
  })
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
      <header className="relative pt-4 pb-2">
        <Link
          to="/acerca"
          aria-label={t('about.open')}
          className="text-soft absolute top-2 right-0 flex size-12 items-center justify-center"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5.5M12 7.5v.5" />
          </svg>
        </Link>
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
                onToggleMine={() => update({ mine: !filters.mine })}
                onToggleCategory={toggleCategory}
                onView={(view) => update({ view })}
              />
              <NearbyNotice
                status={status}
                approximate={byDistance && approximate}
                hiddenStages={hiddenStages}
                onRetry={() => void turnNearbyOn()}
              />
              {filters.mine && !followed.isPending && followed.ids.size === 0 ? (
                <EmptyMine />
              ) : visible.length === 0 ? (
                <div className="space-y-3 py-2">
                  <p className="text-lg">
                    {filters.mine
                      ? t(isTonight ? 'mine.noneTonight' : 'mine.noneThatNight')
                      : t('filters.noResults')}
                  </p>
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
