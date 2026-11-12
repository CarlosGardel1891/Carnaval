import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, inputClass, Notice } from '../../components/ui'
import * as api from '../../lib/api'
import { readOrder } from './orderText'

/**
 * El orden de desfile de una noche (decisión 64). Se edita como texto, una comparsa por
 * línea: sirve igual para pegar el orden que publica la IM y para reordenar el cargado. Se
 * guarda entero, todo o nada.
 */
export function OrderEditor({ eventId }: { eventId: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  /** null: todavía no se tocó, y muestra lo cargado. */
  const [text, setText] = useState<string | null>(null)
  const [fuente, setFuente] = useState<string | null>(null)
  const [fuenteUrl, setFuenteUrl] = useState('')
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const order = useQuery({
    queryKey: ['parade-order', eventId],
    queryFn: () => api.fetchParadeOrder(eventId),
  })
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: api.fetchCatalog })

  const loadedText = (order.data ?? []).map((slot) => slot.conjunto_nombre).join('\n')
  const currentText = text ?? loadedText
  const currentSource = fuente ?? order.data?.[0]?.fuente ?? ''

  const lines = useMemo(
    () => readOrder(currentText, catalog.data?.groups ?? []),
    [currentText, catalog.data],
  )
  const unknown = lines.filter((line) => !line.group)
  const repeated = lines.filter((line) => line.repeated)
  const blocked =
    !catalog.data ||
    unknown.length > 0 ||
    repeated.length > 0 ||
    (lines.length > 0 && !currentSource.trim()) ||
    // Sin nada escrito y sin nada cargado no hay qué guardar.
    (lines.length === 0 && (order.data?.length ?? 0) === 0)

  const save = useMutation({
    mutationFn: () =>
      api.replaceParadeOrder(
        eventId,
        lines.map((line) => line.group!.id),
        currentSource.trim(),
        fuenteUrl.trim() || null,
      ),
    onSuccess: (count) => {
      setText(null)
      setMessage({ kind: 'ok', text: t('parade.order.saved', { count }) })
      void queryClient.invalidateQueries({ queryKey: ['parade-order'] })
    },
    onError: (error) => setMessage({ kind: 'error', text: error.message }),
  })

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{t('parade.order.title')}</h2>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {order.isError && <Notice kind="error">{t('parade.order.loadFailed')}</Notice>}
      {order.data?.length === 0 && text === null && <Notice>{t('parade.order.empty')}</Notice>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <Field label={t('parade.order.text')} hint={t('parade.order.textHint')}>
            <textarea
              className={`${inputClass} h-72 font-mono`}
              value={currentText}
              onChange={(event) => {
                setMessage(null)
                setText(event.target.value)
              }}
            />
          </Field>
          <Field label={t('parade.order.source')}>
            <input
              className={inputClass}
              value={currentSource}
              onChange={(event) => setFuente(event.target.value)}
            />
          </Field>
          <Field label={t('parade.order.sourceUrl')}>
            <input
              type="url"
              className={inputClass}
              value={fuenteUrl}
              onChange={(event) => setFuenteUrl(event.target.value)}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <p role="status" className="text-sm text-slate-700">
            {t('parade.order.summary', {
              count: lines.length,
              unknown: unknown.length,
              repeated: repeated.length,
            })}
          </p>
          <ol className="max-h-80 space-y-0.5 overflow-y-auto text-sm">
            {lines.map((line, index) => (
              <li key={`${index}-${line.name}`} className="flex gap-2">
                <span className="w-8 text-right font-mono text-slate-500">{index + 1}</span>
                <span className="flex-1">{line.group?.nombre ?? line.name}</span>
                {!line.group && (
                  <span className="rounded bg-red-100 px-2 text-xs text-red-900">
                    {t('parade.order.unknown')}
                  </span>
                )}
                {line.repeated && (
                  <span className="rounded bg-red-100 px-2 text-xs text-red-900">
                    {t('parade.order.repeated')}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {unknown.length > 0 && <Notice kind="warn">{t('parade.order.unknownHint')}</Notice>}
      {lines.length > 0 && !currentSource.trim() && (
        <Notice kind="warn">{t('import.sourceMissing')}</Notice>
      )}
      <Button disabled={blocked || save.isPending} onClick={() => save.mutate()}>
        {lines.length === 0 ? t('parade.order.clear') : t('parade.order.save')}
      </Button>
    </section>
  )
}
