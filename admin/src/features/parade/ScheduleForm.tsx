import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, inputClass, Notice } from '../../components/ui'
import * as api from '../../lib/api'
import type { ParadeEvent } from '../../lib/api'
import { isTime } from '../../lib/format'

/** Un número entero opcional: vacío es null (vale la regla general). */
const optionalInt = (text: string): number | null | undefined => {
  if (text.trim() === '') return null
  const value = Number(text)
  return Number.isInteger(value) && value > 0 ? value : undefined
}

/**
 * El horario del desfile y su atraso (decisión 63). El atraso corre todas las horas
 * estimadas que muestra la app: es lo que se toca la noche del desfile.
 */
export function ScheduleForm({ event }: { event: ParadeEvent }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [inicio, setInicio] = useState(event.desfile_inicio?.slice(0, 5) ?? '')
  const [intervalo, setIntervalo] = useState(String(event.desfile_intervalo_min ?? ''))
  const [separacion, setSeparacion] = useState(String(event.desfile_separacion_m ?? ''))
  const [atraso, setAtraso] = useState(String(event.desfile_atraso_min))
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const interval = optionalInt(intervalo)
  const separation = optionalInt(separacion)
  const delay = Number(atraso)
  const valid =
    (inicio === '' || isTime(inicio)) &&
    interval !== undefined &&
    separation !== undefined &&
    atraso.trim() !== '' &&
    Number.isInteger(delay) &&
    delay >= 0 &&
    delay <= 600

  const save = useMutation({
    mutationFn: () =>
      api.saveParadeSchedule(event.id, {
        desfile_inicio: inicio || null,
        desfile_intervalo_min: interval ?? null,
        desfile_separacion_m: separation ?? null,
        desfile_atraso_min: delay,
      }),
    onSuccess: () => {
      setMessage({ kind: 'ok', text: t('parade.schedule.saved') })
      void queryClient.invalidateQueries({ queryKey: ['parade-events'] })
    },
    onError: (error) => setMessage({ kind: 'error', text: error.message }),
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (valid) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{t('parade.schedule.title')}</h2>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={t('parade.schedule.delay')} hint={t('parade.schedule.delayHint')}>
          <input
            type="number"
            min={0}
            max={600}
            required
            className={inputClass}
            value={atraso}
            onChange={(e) => setAtraso(e.target.value)}
          />
        </Field>
        <Field label={t('parade.schedule.start')} hint={t('parade.schedule.startHint')}>
          <input
            type="time"
            className={inputClass}
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </Field>
        <Field label={t('parade.schedule.interval')} hint={t('parade.schedule.intervalHint')}>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={intervalo}
            onChange={(e) => setIntervalo(e.target.value)}
          />
        </Field>
        <Field label={t('parade.schedule.separation')} hint={t('parade.schedule.separationHint')}>
          <input
            type="number"
            min={1}
            className={inputClass}
            value={separacion}
            onChange={(e) => setSeparacion(e.target.value)}
          />
        </Field>
      </div>
      {!valid && <Notice kind="error">{t('parade.schedule.invalid')}</Notice>}
      <Button type="submit" disabled={!valid || save.isPending}>
        {t('parade.schedule.save')}
      </Button>
    </form>
  )
}
