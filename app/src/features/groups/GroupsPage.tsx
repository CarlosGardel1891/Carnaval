import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Constants, nocheLogica, type CategoriaConjunto } from '@cuerda/shared'
import { Button } from '../../components/Button'
import { ChevronRightIcon, CloseIcon, SearchIcon } from '../../components/ui/icons'
import { EmptySearchArt, OfflineArt } from '../../components/ui/illustrations'
import {
  Avatar,
  Card,
  CategoryPill,
  EmptyState,
  FilterChip,
  PrimaryButton,
} from '../../components/ui/primitives'
import { CompactTitle } from '../../components/ui/scroll'
import { TabHeader } from '../../components/ui/TabHeader'
import { useNow } from '../../lib/useNow'
import { useCurrentSeason } from '../season/useCurrentSeason'
import { GroupBadges } from './GroupBadges'
import { groupPath } from './groupPath'
import { groupCategories, listGroups, seasonOf } from './groups'
import { useGroupFilters } from './useGroupFilters'
import { useGroups } from './useGroups'

const NO_CATEGORIES: ReadonlySet<CategoriaConjunto> = new Set()

/** La lista de conjuntos: buscador, filtro por categoría y marcas de la temporada. */
export function GroupsPage() {
  const { t } = useTranslation()
  const groupsQuery = useGroups()
  // Las marcas son de la temporada vigente; si no se pudo cargar, se lista todo sin marcas.
  const season = useCurrentSeason(nocheLogica(useNow()))
  const seasonId = season.data?.id ?? null
  const { filters, active, setText, toggleCategory, clear } = useGroupFilters()
  const groups = groupsQuery.data
  const ready = groups !== undefined && !season.isPending

  const visible = useMemo(
    () => (groups ? listGroups(groups, { ...filters, seasonId }) : []),
    [groups, filters, seasonId],
  )
  const categories = useMemo(() => {
    const present = groups ? groupCategories(groups) : NO_CATEGORIES
    return Constants.public.Enums.categoria_conjunto.filter(
      (c) => present.has(c) || filters.categories.includes(c),
    )
  }, [groups, filters.categories])

  return (
    <main className="mx-auto max-w-2xl pb-6">
      <CompactTitle title={t('groups.title')} />
      <TabHeader
        title={t('groups.title')}
        subtitle={
          <span aria-live="polite">
            {ready && visible.length > 0 ? t('groups.count', { count: visible.length }) : '\u00a0'}
          </span>
        }
      >
        <label className="flex min-h-13 items-center gap-3 rounded-full bg-white pr-2 pl-5 shadow-[0_8px_24px_rgb(4_40_100/0.18)] focus-within:outline-3 focus-within:outline-white/70">
          <SearchIcon className="text-soft size-5 shrink-0" />
          <span className="sr-only">{t('groups.search')}</span>
          <input
            type="search"
            value={filters.text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('groups.search')}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            // El foco lo marca la píldora entera, no el campo de adentro.
            style={{ outline: 'none' }}
            className="text-ink placeholder:text-soft min-w-0 flex-1 bg-transparent py-3 text-[1.0625rem] font-semibold [&::-webkit-search-cancel-button]:hidden"
          />
          {filters.text !== '' && (
            <button
              type="button"
              aria-label={t('search.clear')}
              onClick={() => setText('')}
              className="text-soft flex size-11 shrink-0 items-center justify-center rounded-full"
            >
              <CloseIcon className="size-5" />
            </button>
          )}
        </label>
      </TabHeader>

      <div className="px-4">
        {groupsQuery.isError && !groups ? (
          <div role="alert">
            <EmptyState
              illustration={<OfflineArt />}
              title={t('groups.error')}
              action={
                <PrimaryButton onClick={() => void groupsQuery.refetch()}>
                  {t('today.retry')}
                </PrimaryButton>
              }
            />
          </div>
        ) : (
          !ready && <p className="text-soft py-6 text-center">{t('groups.loading')}</p>
        )}

        {ready && (
          <>
            <div
              role="group"
              aria-label={t('filters.label')}
              className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-4"
            >
              {categories.map((category) => (
                <FilterChip
                  key={category}
                  category={category}
                  pressed={filters.categories.includes(category)}
                  onClick={() => toggleCategory(category)}
                >
                  {t(`category.${category}`)}
                </FilterChip>
              ))}
            </div>

            {visible.length === 0 ? (
              <EmptyState
                illustration={<EmptySearchArt />}
                action={
                  active && (
                    <Button variant="secondary" onClick={clear}>
                      {t('filters.clear')}
                    </Button>
                  )
                }
              >
                {active ? t('groups.noResults') : t('groups.empty')}
              </EmptyState>
            ) : (
              <Card>
                <ul aria-label={t('groups.title')} className="divide-line divide-y">
                  {visible.map((group) => (
                    <li
                      key={group.id}
                      className="relative flex min-h-16 items-center gap-3 px-4 py-3"
                    >
                      <Avatar
                        name={group.nombre}
                        category={group.categoria}
                        photoUrl={group.foto_url}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[1.0625rem] leading-snug font-bold">
                          <Link to={groupPath(group.slug)} className="after:absolute after:inset-0">
                            {group.nombre}
                          </Link>
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <CategoryPill category={group.categoria}>
                            {t(`category.${group.categoria}`)}
                          </CategoryPill>
                          {group.barrio && (
                            <span className="text-soft text-sm">{group.barrio}</span>
                          )}
                        </p>
                        <GroupBadges season={seasonOf(group, seasonId)} />
                      </div>
                      <ChevronRightIcon className="text-soft size-5 shrink-0 opacity-40" />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  )
}
