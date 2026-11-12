import { Constants } from '@cuerda/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, inputClass, Notice } from '../../components/ui'
import * as api from '../../lib/api'
import type { Closure, EstadoEvento, TipoCorte } from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { fromLocalInput, toLocalInput } from '../../lib/night'
import { slugOf, toLines } from '../../lib/text'
import { readPoints } from './points'

const TYPES = Constants.public.Enums.tipo_corte
const STATES = Constants.public.Enums.estado_evento

interface Draft {
  tipo: TipoCorte
  descripcion: string
  desde: string
  hasta: string
  estado: EstadoEvento
  fuentes: string
  /** Un punto por línea: «latitud, longitud». */
  puntos: string
}

const emptyDraft: Draft = {
  tipo: 'corte',
  descripcion: '',
  desde: '',
  hasta: '',
  estado: 'estimado',
  fuentes: '',
  puntos: '',
}

const toDraft = (closure: Closure): Draft => ({
  tipo: closure.tipo,
  descripcion: closure.descripcion,
  desde: toLocalInput(closure.desde),
  hasta: toLocalInput(closure.hasta),
  estado: closure.estado,
  fuentes: closure.fuente_url.join('\n'),
  puntos: closure.puntos.map((p) => `${p.lat}, ${p.lng}`).join('\n'),
})

/** Los cortes de calle y las prohibiciones de estacionar de una noche (decisión 64). */
export function ClosuresEditor({ eventId }: { eventId: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const closures = useQuery({
    queryKey: ['parade-closures', eventId],
    queryFn: () => api.fetchClosures(eventId),
  })
  const current =
    typeof selected === 'number' ? closures.data?.find((c) => c.id === selected) : undefined

  const points = readPoints(draft.puntos)
  const desde = fromLocalInput(draft.desde)
  const hasta = fromLocalInput(draft.hasta)
  const badRange = desde !== null && hasta !== null && hasta < desde
  const valid =
    draft.descripcion.trim() !== '' && points !== null && points.length !== 1 && !badRange

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['parade-closures'] })
  const fail = (error: Error) => setMessage({ kind: 'error', text: error.message })

  const save = useMutation({
    mutationFn: () =>
      api.saveClosure(eventId, current?.id ?? null, {
        slug: current?.slug ?? slugOf(`${draft.tipo} ${draft.descripcion}`).slice(0, 80),
        tipo: draft.tipo,
        descripcion: draft.descripcion.trim(),
        desde,
        hasta,
        estado: draft.estado,
        fuente_url: toLines(draft.fuentes),
        puntos: points ?? [],
      }),
    onSuccess: () => {
      setSelected(null)
      setMessage({ kind: 'ok', text: t('parade.closures.saved') })
      void refresh()
    },
    onError: fail,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteClosure(id),
    onSuccess: () => {
      setSelected(null)
      setMessage({ kind: 'ok', text: t('parade.closures.deleted') })
      void refresh()
    },
    onError: fail,
  })

  const open = (target: Closure | 'new') => {
    setMessage(null)
    setDeleting(false)
    setSelected(target === 'new' ? 'new' : target.id)
    setDraft(target === 'new' ? emptyDraft : toDraft(target))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) save.mutate()
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{t('parade.closures.title')}</h2>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {closures.isError && <Notice kind="error">{t('parade.closures.loadFailed')}</Notice>}
      {closures.data?.length === 0 && (
        <p className="text-sm text-slate-600">{t('parade.closures.empty')}</p>
      )}

      <ul className="space-y-1 text-sm">
        {(closures.data ?? []).map((closure) => (
          <li key={closure.id}>
            <button
              type="button"
              aria-current={selected === closure.id}
              onClick={() => open(closure)}
              className={`w-full rounded-lg border px-3 py-2 text-left ${
                selected === closure.id
                  ? 'border-slate-800'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <span className="block font-medium">{closure.descripcion}</span>
              <span className="block text-xs text-slate-500">
                {t(`parade.closures.types.${closure.tipo}`)} ·{' '}
                {t(`parade.route.states.${closure.estado}`)}
                {closure.desde && ` · ${formatDateTime(closure.desde)}`}
                {closure.hasta && ` – ${formatDateTime(closure.hasta)}`}
                {closure.puntos.length === 0 && ` · ${t('parade.closures.noLine')}`}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {selected === null && (
        <Button variant="secondary" onClick={() => open('new')}>
          {t('parade.closures.new')}
        </Button>
      )}

      {selected !== null && (
        <form onSubmit={onSubmit} className="space-y-3 rounded-lg bg-slate-50 p-3">
          <h3 className="font-semibold">
            {current ? current.descripcion : t('parade.closures.newTitle')}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label={t('parade.closures.field.description')}>
                <input
                  required
                  className={inputClass}
                  value={draft.descripcion}
                  onChange={(e) => set('descripcion', e.target.value)}
                />
              </Field>
            </div>
            <Field label={t('parade.closures.field.type')}>
              <select
                className={inputClass}
                value={draft.tipo}
                onChange={(e) => set('tipo', e.target.value as TipoCorte)}
              >
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`parade.closures.types.${type}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('parade.closures.field.state')}>
              <select
                className={inputClass}
                value={draft.estado}
                onChange={(e) => set('estado', e.target.value as EstadoEvento)}
              >
                {STATES.map((state) => (
                  <option key={state} value={state}>
                    {t(`parade.route.states.${state}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label={t('parade.closures.field.from')}
              hint={t('parade.closures.field.timeHint')}
            >
              <input
                type="datetime-local"
                className={inputClass}
                value={draft.desde}
                onChange={(e) => set('desde', e.target.value)}
              />
            </Field>
            <Field label={t('parade.closures.field.to')}>
              <input
                type="datetime-local"
                className={inputClass}
                value={draft.hasta}
                onChange={(e) => set('hasta', e.target.value)}
              />
            </Field>
            <Field
              label={t('parade.closures.field.points')}
              hint={t('parade.closures.field.pointsHint')}
            >
              <textarea
                className={`${inputClass} h-24 font-mono`}
                value={draft.puntos}
                onChange={(e) => set('puntos', e.target.value)}
              />
            </Field>
            <Field label={t('parade.closures.field.sources')} hint={t('groups.field.sourcesHint')}>
              <textarea
                className={`${inputClass} h-24`}
                value={draft.fuentes}
                onChange={(e) => set('fuentes', e.target.value)}
              />
            </Field>
          </div>
          {(points === null || points.length === 1) && (
            <Notice kind="error">{t('parade.closures.badPoints')}</Notice>
          )}
          {badRange && <Notice kind="error">{t('parade.closures.badRange')}</Notice>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!valid || save.isPending}>
              {t('night.save')}
            </Button>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              {t('night.cancel')}
            </Button>
            {current &&
              (deleting ? (
                <Button
                  variant="danger"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(current.id)}
                >
                  {t('parade.closures.confirmDelete')}
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setDeleting(true)}>
                  {t('parade.closures.delete')}
                </Button>
              ))}
          </div>
        </form>
      )}
    </section>
  )
}
