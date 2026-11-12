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
    <div className="pt-1 pb-1">
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-soft text-[0.8125rem] font-semibold">
          {isFetching
            ? t('today.updating')
            : ago
              ? t('today.updated', { ago })
              : t('today.updatedNow')}
        </p>
        <button
          type="button"
          className="text-accent -mr-1 inline-flex min-h-11 shrink-0 items-center gap-1.5 px-1 text-[0.8125rem] font-bold disabled:opacity-60"
          disabled={isFetching}
          onClick={onRefresh}
        >
          {t('today.refresh')}
        </button>
      </div>
      {failed && !isFetching && (
        <p
          role="alert"
          className="bg-danger-soft text-danger mb-2 rounded-2xl px-4 py-2.5 text-sm font-semibold"
        >
          {t('today.refreshError')}
        </p>
      )}
    </div>
  )
}
