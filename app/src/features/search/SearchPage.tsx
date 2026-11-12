import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { BackButton } from '../../components/ui/BackButton'
import { CloseIcon, MapPinIcon, SearchIcon } from '../../components/ui/icons'
import { EmptySearchArt, OfflineArt } from '../../components/ui/illustrations'
import {
  Avatar,
  Card,
  CategoryPill,
  EmptyState,
  PrimaryButton,
  SectionHeader,
} from '../../components/ui/primitives'
import { ChevronRightIcon } from '../../components/ui/icons'
import { joinParts } from '../../lib/labels'
import { useSystemBars } from '../../lib/systemBars'
import { groupPath } from '../groups/groupPath'
import { useGroups } from '../groups/useGroups'
import { searchAll } from './search'
import { useStages } from './useStages'

const row = 'relative flex min-h-16 items-center gap-3 px-4 py-3'
const chevron = 'text-soft size-5 shrink-0 opacity-40'

/**
 * Buscar (decisión 92): conjuntos y escenarios por nombre o por alias. Se abre desde el
 * buscador de «Hoy». Lo que se escribe vive en la URL (`?q=`), así al volver de una ficha la
 * búsqueda queda como estaba.
 */
export function SearchPage() {
  const { t } = useTranslation()
  useSystemBars('onLight')
  const [params, setParams] = useSearchParams()
  const text = params.get('q') ?? ''
  const setText = (value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value !== '') next.set('q', value)
        else next.delete('q')
        return next
      },
      { replace: true },
    )

  const groupsQuery = useGroups()
  const stagesQuery = useStages()
  const groups = groupsQuery.data
  const stages = stagesQuery.data
  const results = useMemo(() => searchAll(text, groups ?? [], stages ?? []), [text, groups, stages])
  const total = results.groups.length + results.stages.length
  const searching = text.trim() !== ''
  // Con uno de los dos catálogos ya se puede buscar; el otro llega o no llega.
  const nothingLoaded = !groups && !stages
  const failed = nothingLoaded && (groupsQuery.isError || stagesQuery.isError)
  const retry = () => {
    void groupsQuery.refetch()
    void stagesQuery.refetch()
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-6">
      <h1 className="sr-only">{t('search.title')}</h1>
      <div className="bg-ground/90 sticky top-0 z-20 -mx-4 -mt-[var(--safe-top)] flex items-center gap-3 px-4 pt-[calc(var(--safe-top)+0.75rem)] pb-3 backdrop-blur-xl">
        <BackButton fallback="/" />
        <label className="bg-surface shadow-card focus-within:outline-brand-mid flex min-h-13 min-w-0 flex-1 items-center gap-3 rounded-full pr-2 pl-5 focus-within:outline-3">
          <SearchIcon className="text-soft size-5 shrink-0" />
          <span className="sr-only">{t('search.placeholder')}</span>
          <input
            type="search"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('search.placeholder')}
            // Se abre para escribir: el teclado sube solo.
            autoFocus
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            // El foco lo marca la píldora entera, no el campo de adentro.
            style={{ outline: 'none' }}
            className="placeholder:text-soft min-w-0 flex-1 bg-transparent py-3 text-[1.0625rem] font-semibold outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {text !== '' && (
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
      </div>

      {failed ? (
        <div role="alert">
          <EmptyState
            illustration={<OfflineArt />}
            title={t('search.error')}
            action={<PrimaryButton onClick={retry}>{t('today.retry')}</PrimaryButton>}
          />
        </div>
      ) : nothingLoaded ? (
        <p className="text-soft py-6 text-center">{t('search.loading')}</p>
      ) : !searching ? (
        <EmptyState illustration={<EmptySearchArt />} title={t('search.hintTitle')}>
          {t('search.hint')}
        </EmptyState>
      ) : total === 0 ? (
        <EmptyState
          illustration={<EmptySearchArt />}
          title={t('search.noResultsTitle')}
          action={
            <Button variant="secondary" onClick={() => setText('')}>
              {t('search.clear')}
            </Button>
          }
        >
          {t('search.noResults', { text: text.trim() })}
        </EmptyState>
      ) : (
        <div className="space-y-5 pt-2">
          <p className="sr-only" aria-live="polite">
            {t('search.count', { count: total })}
          </p>
          {results.groups.length > 0 && (
            <section aria-labelledby="search-groups">
              <SectionHeader id="search-groups" title={t('search.groups')} />
              <Card>
                <ul className="divide-line divide-y">
                  {results.groups.map((group) => (
                    <li key={group.id} className={row}>
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
                      </div>
                      <ChevronRightIcon className={chevron} />
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}
          {results.stages.length > 0 && (
            <section aria-labelledby="search-stages">
              <SectionHeader id="search-stages" title={t('search.stages')} />
              <Card>
                <ul className="divide-line divide-y">
                  {results.stages.map((stage) => {
                    const summary = joinParts([
                      stage.tipo && t(`stageType.${stage.tipo}`),
                      stage.barrio,
                    ])
                    return (
                      <li key={stage.id} className={row}>
                        <span
                          aria-hidden="true"
                          className="bg-brand-soft text-brand inline-flex size-12 shrink-0 items-center justify-center rounded-full"
                        >
                          <MapPinIcon className="size-6" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[1.0625rem] leading-snug font-bold">
                            <Link
                              to={`/escenarios/${encodeURIComponent(stage.slug)}`}
                              className="after:absolute after:inset-0"
                            >
                              {stage.nombre}
                            </Link>
                          </p>
                          {summary && <p className="text-soft mt-0.5 text-sm">{summary}</p>}
                        </div>
                        <ChevronRightIcon className={chevron} />
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
