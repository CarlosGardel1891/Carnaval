import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, inputClass, Notice } from '../../components/ui'
import * as api from '../../lib/api'
import { formatDateTime } from '../../lib/format'

interface StageCount {
  id: number
  nombre: string
  /** Cuántas actuaciones suyas no están suspendidas. */
  active: number
}

type Outcome =
  | { kind: 'suspended' | 'undone'; count: number; notified: boolean }
  | { kind: 'error'; text: string }

/**
 * Suspender la noche entera o algunos escenarios, y deshacerlo (decisión 72). Es en dos
 * pasos: elegir y confirmar. El aviso se pide enseguida; si eso falla, sale igual con la
 * pasada de cada minuto, y acá se dice.
 */
export function SuspendPanel({
  noche,
  stages,
  onDone,
}: {
  noche: string
  stages: StageCount[]
  onDone: () => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [skipped, setSkipped] = useState<number[]>([])
  const [motivo, setMotivo] = useState('')
  const [outcome, setOutcome] = useState<Outcome | null>(null)

  const withActs = stages.filter((stage) => stage.active > 0)
  const chosen = withActs.filter((stage) => !skipped.includes(stage.id))
  const total = chosen.reduce((sum, stage) => sum + stage.active, 0)
  const wholeNight = chosen.length === withActs.length

  const suspensions = useQuery({
    queryKey: ['suspensions', noche],
    queryFn: () => api.fetchSuspensions(noche),
  })

  const finish = (result: Outcome) => {
    setOutcome(result)
    setOpen(false)
    setSkipped([])
    setMotivo('')
    void queryClient.invalidateQueries({ queryKey: ['suspensions'] })
    onDone()
  }

  const suspend = useMutation({
    mutationFn: async () => {
      // Con todos marcados va la noche entera, también lo que se cargue mientras tanto.
      const count = await api.suspendNight(
        noche,
        wholeNight ? null : chosen.map((s) => s.id),
        motivo,
      )
      return { count, notified: await api.sendChangeNotices() }
    },
    onSuccess: (result) => finish({ kind: 'suspended', ...result }),
    onError: (error) => setOutcome({ kind: 'error', text: error.message }),
  })

  const undo = useMutation({
    mutationFn: async (id: number) => {
      const count = await api.undoSuspension(id)
      return { count, notified: await api.sendChangeNotices() }
    },
    onSuccess: (result) => finish({ kind: 'undone', ...result }),
    onError: (error) => setOutcome({ kind: 'error', text: error.message }),
  })

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{t('suspend.title')}</h2>

      {outcome?.kind === 'error' && <Notice kind="error">{outcome.text}</Notice>}
      {outcome && outcome.kind !== 'error' && (
        <Notice kind={outcome.notified ? 'ok' : 'warn'}>
          {t(`suspend.${outcome.kind}`, { count: outcome.count })}{' '}
          {t(outcome.notified ? 'suspend.notified' : 'suspend.notifyLater')}
        </Notice>
      )}

      {!open && (
        <Button
          variant="danger"
          disabled={withActs.length === 0}
          onClick={() => {
            setOutcome(null)
            setOpen(true)
          }}
        >
          {t('suspend.open')}
        </Button>
      )}
      {!open && withActs.length === 0 && (
        <p className="text-sm text-slate-600">{t('suspend.nothing')}</p>
      )}

      {open && (
        <div className="space-y-3 rounded-lg bg-red-50 p-3">
          <p className="text-sm">{t('suspend.choose')}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {withActs.map((stage) => (
              <li key={stage.id}>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!skipped.includes(stage.id)}
                    onChange={(event) =>
                      setSkipped((prev) =>
                        event.target.checked
                          ? prev.filter((id) => id !== stage.id)
                          : [...prev, stage.id],
                      )
                    }
                  />
                  {t('suspend.stage', { nombre: stage.nombre, count: stage.active })}
                </label>
              </li>
            ))}
          </ul>
          <Field label={t('suspend.reason')}>
            <input
              className={inputClass}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
            />
          </Field>
          <p role="status" className="text-sm font-medium">
            {wholeNight
              ? t('suspend.confirmNight', { count: total })
              : t('suspend.confirmStages', { count: total, stages: chosen.length })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="danger"
              disabled={total === 0 || suspend.isPending}
              onClick={() => suspend.mutate()}
            >
              {t('suspend.confirm')}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('night.cancel')}
            </Button>
          </div>
        </div>
      )}

      {(suspensions.data?.length ?? 0) > 0 && (
        <ul className="space-y-1 text-sm">
          {suspensions.data!.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2"
            >
              <span className="flex-1">
                {t('suspend.entry', {
                  count: item.actuaciones,
                  when: formatDateTime(item.creado_en),
                  who: item.creado_email ?? t('suspend.system'),
                })}
                {item.motivo && ` · ${item.motivo}`}
                {item.deshecha_en &&
                  ` · ${t('suspend.undoneAt', { when: formatDateTime(item.deshecha_en) })}`}
              </span>
              {!item.deshecha_en && (
                <Button
                  variant="secondary"
                  disabled={undo.isPending}
                  onClick={() => {
                    setOutcome(null)
                    undo.mutate(item.id)
                  }}
                >
                  {t('suspend.undo')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
