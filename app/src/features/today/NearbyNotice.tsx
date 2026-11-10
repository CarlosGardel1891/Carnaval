import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import type { LocationStatus } from '../location/locationContext'

interface NearbyNoticeProps {
  status: LocationStatus
  /** Se está ordenando con una posición aproximada. */
  approximate: boolean
  /** Escenarios que «cerca mío» deja afuera por no tener ubicación cargada. */
  hiddenStages: number
  onRetry: () => void
}

/**
 * Lo que hay que decir sobre «cerca mío»: buscando, sin permiso, sin posición, que la
 * posición es aproximada, o qué quedó afuera.
 */
export function NearbyNotice({ status, approximate, hiddenStages, onRetry }: NearbyNoticeProps) {
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
  if (!approximate && hiddenStages === 0) return null
  return (
    <div className="text-soft space-y-2 pb-3">
      {approximate && <p>{t('nearby.approximate')}</p>}
      {hiddenStages > 0 && <p>{t('nearby.hidden', { count: hiddenStages })}</p>}
    </div>
  )
}
