import { useTranslation } from 'react-i18next'
import { SeasonCard } from '../season/SeasonCard'
import { useCurrentSeason } from '../season/useCurrentSeason'

export function TodayPage() {
  const { t } = useTranslation()
  const season = useCurrentSeason()

  return (
    <main className="mx-auto max-w-2xl px-4 pb-6">
      <header className="pt-4 pb-3">
        <p className="text-accent text-sm font-semibold tracking-wide uppercase">{t('app.name')}</p>
        <h1 className="text-3xl font-bold">{t('today.title')}</h1>
      </header>
      {season.isPending && <p className="text-soft">{t('season.loading')}</p>}
      {season.isError && (
        <div role="alert" className="space-y-3">
          <p>{t('season.error')}</p>
          <button
            type="button"
            className="bg-accent text-accent-ink min-h-12 rounded-xl px-5 font-semibold"
            onClick={() => void season.refetch()}
          >
            {t('season.retry')}
          </button>
        </div>
      )}
      {season.isSuccess &&
        (season.data ? (
          <SeasonCard season={season.data} />
        ) : (
          <p className="text-soft">{t('season.empty')}</p>
        ))}
    </main>
  )
}
