import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Constants } from '@cuerda/shared'
import { Button } from '../../components/Button'
import { ChevronLeftIcon, SearchIcon } from '../../components/ui/icons'
import { EmptySearchArt, OfflineArt } from '../../components/ui/illustrations'
import { EmptyState, PrimaryButton } from '../../components/ui/primitives'
import { CompactTitle, PullToRefresh } from '../../components/ui/scroll'
import { TabHeader } from '../../components/ui/TabHeader'
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
import { NightSummary, NowOnStage } from './Overview'
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
  // «Gratis» lo filtra la base; la categoría, la app. Con «cerca mío», la distancia a cada
  // escenario se calcula acá, en el teléfono: la posición no viaja (decisión 90).
  const origin = filters.nearby ? coords : null
  const followed = useFollowed()
  const query = useNightActs(noche, {
    onlyFree: filters.onlyFree,
    onlyFollowed: filters.mine,
    origin,
  })
  const acts = query.data
  const byDistance = origin !== null

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

  const stageCount = useMemo(() => new Set((acts ?? []).map((a) => a.escenario_id)).size, [acts])
  const liveActs = useMemo(
    () => (acts ?? []).filter((act) => onStage.has(act.actuacion_id)),
    [acts, onStage],
  )
  const title = isTonight ? t('today.title') : t('today.otherNight')
  const hasBoard = Boolean(acts && (acts.length > 0 || active))

  return (
    <main className="mx-auto max-w-2xl pb-6">
      <CompactTitle title={title} />
      <PullToRefresh onRefresh={() => void query.refetch()} refreshing={query.isRefetching} />
      <TabHeader title={title} subtitle={formatNight(noche, locale)} overlap={hasBoard}>
        {!isTonight && (
          <Link
            to="/"
            className="-mt-3 mb-3 inline-flex min-h-11 items-center gap-1 font-bold text-white"
          >
            <ChevronLeftIcon className="size-5" />
            {t('today.backToTonight')}
          </Link>
        )}
        <Link
          to="/buscar"
          className="pressable text-soft flex min-h-13 items-center gap-3 rounded-full bg-white px-5 text-[1.0625rem] font-semibold shadow-[0_8px_24px_rgb(4_40_100/0.18)]"
        >
          <SearchIcon className="size-5 shrink-0" />
          {t('search.placeholder')}
        </Link>
      </TabHeader>

      <div className="px-4">
        {query.isPending && <p className="text-soft py-6 text-center">{t('today.loading')}</p>}

        {query.isError && !acts && (
          <div role="alert">
            <EmptyState
              illustration={<OfflineArt />}
              title={t('today.error')}
              action={
                <PrimaryButton onClick={() => void query.refetch()}>
                  {t('today.retry')}
                </PrimaryButton>
              }
            />
          </div>
        )}

        {acts && (
          <>
            {hasBoard && (
              <div className="relative z-10 -mt-11">
                <NightSummary acts={acts.length} stages={stageCount} onStage={liveActs.length} />
              </div>
            )}
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
                <NowOnStage acts={liveActs} />
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
                  <EmptyState
                    illustration={<EmptySearchArt />}
                    title={
                      filters.mine
                        ? t(isTonight ? 'mine.noneTonight' : 'mine.noneThatNight')
                        : t('filters.noResults')
                    }
                    action={
                      <Button variant="secondary" onClick={clear}>
                        {t('filters.clear')}
                      </Button>
                    }
                  />
                ) : (
                  <section aria-label={t('today.board')}>
                    <NightBoard
                      acts={visible}
                      onStage={onStage}
                      view={filters.view}
                      byDistance={byDistance}
                    />
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
