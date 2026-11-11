import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { useDismissPushPrompt, useEnablePush, usePushStatus } from './usePush'

/**
 * Los avisos de un conjunto que se sigue. Nunca se pide el permiso al abrir la app: esto
 * aparece en la ficha recién después de «Seguir» (decisión 45).
 *
 * - Sin haber preguntado: una tarjeta propia; sólo «Sí, avisame» muestra el diálogo del
 *   sistema.
 * - Después de «Ahora no»: una línea con un botón, por si cambia de idea.
 * - Con el permiso negado: cómo prenderlos desde los ajustes. La app no vuelve a pedirlo.
 *
 * En el navegador, o sin Firebase configurado, no muestra nada.
 */
export function PushPrompt() {
  const { t } = useTranslation()
  const { enabled, permission, asked, isPending } = usePushStatus()
  const enable = useEnablePush()
  const dismiss = useDismissPushPrompt()

  if (!enabled || isPending || permission === undefined) return null

  const error = enable.isError && (
    <p role="alert" className="text-danger">
      {t('push.error')}
    </p>
  )

  if (permission === 'granted') {
    // Con el permiso dado pero el registro fallido (sin red), no se dice que están activados.
    return enable.isError ? (
      <div className="space-y-2">
        {error}
        <Button variant="secondary" disabled={enable.isPending} onClick={() => enable.mutate()}>
          {t('push.enable')}
        </Button>
      </div>
    ) : (
      <p className="text-soft">{t('push.on')}</p>
    )
  }
  if (permission === 'denied') return <p className="text-soft">{t('push.denied')}</p>

  if (asked) {
    return (
      <div className="space-y-2">
        <p className="text-soft">{t('push.off')}</p>
        <Button variant="secondary" disabled={enable.isPending} onClick={() => enable.mutate()}>
          {t('push.enable')}
        </Button>
        {error}
      </div>
    )
  }

  return (
    <section
      aria-labelledby="avisos"
      className="bg-surface border-line space-y-3 rounded-2xl border p-4"
    >
      <h2 id="avisos" className="text-xl font-bold">
        {t('push.askTitle')}
      </h2>
      <p className="text-soft">{t('push.askBody')}</p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={enable.isPending} onClick={() => enable.mutate()}>
          {t('push.accept')}
        </Button>
        <Button variant="secondary" disabled={enable.isPending} onClick={dismiss}>
          {t('push.later')}
        </Button>
      </div>
      {error}
    </section>
  )
}
