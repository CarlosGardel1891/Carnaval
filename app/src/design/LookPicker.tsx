import { useTranslation } from 'react-i18next'
import { LOOKS, looksAllowed, setLook, useLook, type Look } from './looks'

/**
 * El selector de direcciones visuales. Sólo en desarrollo (decisión 91): en un build que
 * apunta al proyecto remoto no se dibuja.
 */
export function LookPicker() {
  const { t } = useTranslation()
  const look = useLook()
  if (!looksAllowed()) return null

  const options: (Look | null)[] = [null, ...LOOKS]
  return (
    <div
      role="group"
      aria-label={t('dev.look.label')}
      className="flex flex-wrap items-center gap-1 px-4 py-2 text-xs"
    >
      <span className="text-soft mr-1 font-semibold">{t('dev.look.label')}</span>
      {options.map((option) => (
        <button
          key={option ?? 'actual'}
          type="button"
          aria-pressed={look === option}
          onClick={() => setLook(option)}
          className={`min-h-8 rounded-full border px-3 font-semibold ${
            look === option
              ? 'bg-ink text-ground border-transparent'
              : 'border-line text-soft bg-transparent'
          }`}
        >
          {t(`dev.look.${option ?? 'actual'}`)}
        </button>
      ))}
    </div>
  )
}
