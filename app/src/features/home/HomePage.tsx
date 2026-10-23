import { useTranslation } from 'react-i18next'
import { MontevideoMap } from './MontevideoMap'
import { SeasonCard } from './SeasonCard'
import { useCurrentSeason } from './useCurrentSeason'

export function HomePage() {
  const { t } = useTranslation()
  const season = useCurrentSeason()

  return (
    <main className="flex h-dvh flex-col bg-slate-100">
      <header className="px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
        <h1 className="text-2xl font-bold">{t('app.name')}</h1>
        <p className="text-sm text-slate-600">{t('app.tagline')}</p>
      </header>
      <div className="min-h-0 flex-1">
        <MontevideoMap />
      </div>
      <div className="p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {season.isPending && <p>{t('season.loading')}</p>}
        {season.isError && (
          <div role="alert" className="space-y-2">
            <p>{t('season.error')}</p>
            <button
              type="button"
              className="rounded-lg bg-slate-800 px-3 py-1 text-white"
              onClick={() => void season.refetch()}
            >
              {t('season.retry')}
            </button>
          </div>
        )}
        {season.isSuccess &&
          (season.data ? <SeasonCard season={season.data} /> : <p>{t('season.empty')}</p>)}
      </div>
    </main>
  )
}
