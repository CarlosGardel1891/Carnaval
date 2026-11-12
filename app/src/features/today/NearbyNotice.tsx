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
      <p role="status" className="text-soft px-1 pb-3 text-sm font-semibold">
        {t('nearby.locating')}
      </p>
    )
  }
  if (status === 'denied') {
    return (
      <p
        role="alert"
        className="bg-amber-soft text-amber mb-4 rounded-2xl px-4 py-3 text-[0.9375rem] font-semibold"
      >
        {t('nearby.denied')}
      </p>
    )
  }
  if (status === 'unavailable') {
    return (
      <div
        role="alert"
        className="bg-amber-soft text-amber mb-4 space-y-3 rounded-2xl px-4 py-3 text-[0.9375rem] font-semibold"
      >
        <p>{t('nearby.unavailable')}</p>
        <Button variant="secondary" onClick={onRetry}>
          {t('nearby.retry')}
        </Button>
      </div>
    )
  }
  if (!approximate && hiddenStages === 0) return null
  return (
    <div className="text-soft space-y-1.5 px-1 pb-3 text-sm">
      {approximate && <p>{t('nearby.approximate')}</p>}
      {hiddenStages > 0 && <p>{t('nearby.hidden', { count: hiddenStages })}</p>}
    </div>
  )
}
