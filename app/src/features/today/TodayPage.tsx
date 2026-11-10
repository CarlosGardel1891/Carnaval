import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { formatNight } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { NightBoard } from './NightBoard'
import { onStageNow } from './board'
import { EmptyNight } from './EmptyNight'
import { UpdatedLine } from './UpdatedLine'
import { useNightActs } from './useNightActs'
import { useNoche } from './useNoche'

const NOBODY: ReadonlySet<number> = new Set()

/** El pizarrón «Hoy»: qué conjunto actúa esta noche, dónde y a qué hora. */
export function TodayPage() {
  const { t } = useTranslation()
  const locale = useLocale()
  const { noche, isTonight, now } = useNoche()
  const query = useNightActs(noche)
  const acts = query.data

  // «Ahora en escena» sólo vale para la noche en curso.
  const onStage = useMemo(
    () => (isTonight && acts ? onStageNow(acts, now) : NOBODY),
    [isTonight, acts, now],
  )

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
          {acts.length === 0 ? (
            <EmptyNight noche={noche} />
          ) : (
            <NightBoard acts={acts} onStage={onStage} />
          )}
        </>
      )}
    </main>
  )
}
