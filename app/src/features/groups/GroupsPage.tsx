import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Constants, nocheLogica, type CategoriaConjunto } from '@cuerda/shared'
import { Button } from '../../components/Button'
import { Chip } from '../../components/Chip'
import { joinParts } from '../../lib/labels'
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
    <main className="mx-auto max-w-2xl px-4 pb-6">
      <header className="pt-4 pb-2">
        <h1 className="text-3xl font-bold">{t('groups.title')}</h1>
      </header>

      {groupsQuery.isError && !groups ? (
        <div role="alert" className="space-y-3 py-4">
          <p className="text-lg">{t('groups.error')}</p>
          <Button onClick={() => void groupsQuery.refetch()}>{t('today.retry')}</Button>
        </div>
      ) : (
        !ready && <p className="text-soft py-4">{t('groups.loading')}</p>
      )}

      {ready && (
        <>
          <div className="space-y-2 pb-3">
            <label className="block">
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
                className="bg-surface border-line placeholder:text-soft min-h-12 w-full rounded-xl border px-4 text-lg"
              />
            </label>
            <div
              role="group"
              aria-label={t('filters.label')}
              className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1"
            >
              {categories.map((category) => (
                <Chip
                  key={category}
                  pressed={filters.categories.includes(category)}
                  onClick={() => toggleCategory(category)}
                >
                  {t(`category.${category}`)}
                </Chip>
              ))}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="space-y-3 py-2">
              <p className="text-lg">{active ? t('groups.noResults') : t('groups.empty')}</p>
              {active && (
                <Button variant="secondary" onClick={clear}>
                  {t('filters.clear')}
                </Button>
              )}
            </div>
          ) : (
            <>
              <p className="text-soft pb-2" aria-live="polite">
                {t('groups.count', { count: visible.length })}
              </p>
              <ul className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
                {visible.map((group) => (
                  <li key={group.id}>
                    <Link to={groupPath(group.slug)} className="block py-3">
                      <span className="block text-lg font-semibold">{group.nombre}</span>
                      <span className="text-soft block">
                        {joinParts([t(`category.${group.categoria}`), group.barrio])}
                      </span>
                      <GroupBadges season={seasonOf(group, seasonId)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </main>
  )
}
