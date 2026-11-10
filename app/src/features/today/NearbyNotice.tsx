import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import type { LocationStatus } from '../location/locationContext'

interface NearbyNoticeProps {
  status: LocationStatus
  /** Escenarios que «cerca mío» deja afuera por no tener ubicación cargada. */
  hiddenStages: number
  onRetry: () => void
}

/** Lo que hay que decir sobre «cerca mío»: buscando, sin permiso, sin posición, o qué quedó afuera. */
export function NearbyNotice({ status, hiddenStages, onRetry }: NearbyNoticeProps) {
  const { t } = useTranslation()

  if (status === 'locating') {
    return (
      <p role="status" className="text-soft pb-3">
        {t('nearby.locating')}
      </p>
    )
  }
  if (status === 'denied') {
    return (
      <p role="alert" className="border-line bg-surface mb-3 rounded-xl border p-3">
        {t('nearby.denied')}
      </p>
    )
  }
  if (status === 'unavailable') {
    return (
      <div role="alert" className="border-line bg-surface mb-3 space-y-3 rounded-xl border p-3">
        <p>{t('nearby.unavailable')}</p>
        <Button variant="secondary" onClick={onRetry}>
          {t('nearby.retry')}
        </Button>
      </div>
    )
  }
  if (hiddenStages > 0) {
    return <p className="text-soft pb-3">{t('nearby.hidden', { count: hiddenStages })}</p>
  }
  return null
}
