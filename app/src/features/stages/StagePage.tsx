import { useTranslation } from 'react-i18next'

export function StagePage() {
  const { t } = useTranslation()
  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      <h1 className="text-3xl font-bold">{t('stage.title')}</h1>
    </main>
  )
}
