import { useTranslation } from 'react-i18next'
import { MontevideoMap } from './MontevideoMap'

export function MapPage() {
  const { t } = useTranslation()
  return (
    <main className="flex h-full flex-col">
      <h1 className="sr-only">{t('map.title')}</h1>
      <div className="min-h-0 flex-1">
        <MontevideoMap />
      </div>
    </main>
  )
}
