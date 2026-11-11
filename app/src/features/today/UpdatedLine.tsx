import { useTranslation } from 'react-i18next'
import { clockOffsetMs } from '../../lib/clock'
import { formatAgo } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'

interface UpdatedLineProps {
  /** Cuándo llegaron los datos que se ven (ms desde época). */
  updatedAt: number
  now: Date
  isFetching: boolean
  /** Falló la última actualización: lo que se ve es lo anterior. */
  failed: boolean
  onRefresh: () => void
}

/** «Actualizado hace X», con el botón para pedir la grilla de nuevo. */
export function UpdatedLine({ updatedAt, now, isFetching, failed, onRefresh }: UpdatedLineProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  // `updatedAt` es del reloj de verdad; `now`, del de la app, que en desarrollo puede estar corrido.
  const ago = formatAgo(now.getTime() - clockOffsetMs() - updatedAt, locale)

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-soft">
          {isFetching
            ? t('today.updating')
            : ago
              ? t('today.updated', { ago })
              : t('today.updatedNow')}
        </p>
        <button
          type="button"
          className="text-accent min-h-12 shrink-0 px-2 font-semibold"
          disabled={isFetching}
          onClick={onRefresh}
        >
          {t('today.refresh')}
        </button>
      </div>
      {failed && !isFetching && (
        <p role="alert" className="text-danger pb-2">
          {t('today.refreshError')}
        </p>
      )}
    </div>
  )
}
