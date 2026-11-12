import { Constants } from '@cuerda/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, inputClass, Notice } from '../../components/ui'
import * as api from '../../lib/api'
import type { EstadoEvento, ParadeEvent } from '../../lib/api'
import { toLines } from '../../lib/text'
import { LocationPicker } from '../map/LocationPicker'

const STATES = Constants.public.Enums.estado_evento

interface CornerDraft {
  /** Para React: las esquinas se mueven y se borran. */
  key: number
  calle: string
  cruce: string
  lat: string
  lng: string
}

const coordinate = (text: string, limit: number): number | null => {
  const value = Number(text.replace(',', '.'))
  return text.trim() !== '' && Number.isFinite(value) && Math.abs(value) <= limit ? value : null
}

/**
 * El recorrido de una noche: sus esquinas, en orden (decisión 64). La primera es la salida y
 * la última, la llegada. Se guarda entero, con su estado (estimado o confirmado) y su fuente.
 */
export function RouteEditor({ event }: { event: ParadeEvent }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [corners, setCorners] = useState<CornerDraft[] | null>(null)
  const [estado, setEstado] = useState<EstadoEvento>(event.recorrido_estado ?? 'estimado')
  const [fuentes, setFuentes] = useState(event.recorrido_fuente_url.join('\n'))
  const [onMap, setOnMap] = useState<number | null>(null)
  const [nextKey, setNextKey] = useState(1000)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const route = useQuery({
    queryKey: ['parade-route', event.id],
    queryFn: () => api.fetchParadeRoute(event.id),
  })

  const loaded: CornerDraft[] = (route.data ?? []).map((corner, index) => ({
    key: index,
    calle: corner.calle,
    cruce: corner.cruce,
    lat: String(corner.lat),
    lng: String(corner.lng),
  }))
  const list = corners ?? loaded

  const parsed = list.map((corner) => ({
    calle: corner.calle.trim(),
    cruce: corner.cruce.trim(),
    lat: coordinate(corner.lat, 90),
    lng: coordinate(corner.lng, 180),
  }))
  const incomplete = parsed.filter((c) => !c.calle || !c.cruce || c.lat === null || c.lng === null)
  const blocked = incomplete.length > 0 || list.length === 1

  const change = (key: number, patch: Partial<CornerDraft>) => {
    setMessage(null)
    setCorners(list.map((corner) => (corner.key === key ? { ...corner, ...patch } : corner)))
  }

  const move = (index: number, by: -1 | 1) => {
    const next = [...list]
    const [item] = next.splice(index, 1)
    next.splice(index + by, 0, item!)
    setCorners(next)
  }

  const add = () => {
    const last = list[list.length - 1]
    setCorners([...list, { key: nextKey, calle: last?.calle ?? '', cruce: '', lat: '', lng: '' }])
    setNextKey(nextKey + 1)
  }

  const save = useMutation({
    mutationFn: () =>
      api.replaceParadeRoute(
        event.id,
        parsed.map((c) => ({ calle: c.calle, cruce: c.cruce, lat: c.lat!, lng: c.lng! })),
        estado,
        toLines(fuentes),
      ),
    onSuccess: (count) => {
      setCorners(null)
      setOnMap(null)
      setMessage({ kind: 'ok', text: t('parade.route.saved', { count }) })
      void queryClient.invalidateQueries({ queryKey: ['parade-route'] })
      void queryClient.invalidateQueries({ queryKey: ['parade-events'] })
    },
    onError: (error) => setMessage({ kind: 'error', text: error.message }),
  })

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">{t('parade.route.title')}</h2>
      <p className="text-sm text-slate-600">{t('parade.route.intro')}</p>
      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {route.isError && <Notice kind="error">{t('parade.route.loadFailed')}</Notice>}

      <ol className="space-y-2">
        {list.map((corner, index) => (
          <li key={corner.key} className="space-y-2 rounded-lg bg-slate-50 p-3">
            <div className="grid gap-2 sm:grid-cols-[2rem_1fr_1fr_8rem_8rem]">
              <span className="self-center font-mono text-sm text-slate-500">{index + 1}</span>
              <input
                aria-label={t('parade.route.street', { n: index + 1 })}
                placeholder={t('parade.route.streetPlaceholder')}
                className={inputClass}
                value={corner.calle}
                onChange={(e) => change(corner.key, { calle: e.target.value })}
              />
              <input
                aria-label={t('parade.route.cross', { n: index + 1 })}
                placeholder={t('parade.route.crossPlaceholder')}
                className={inputClass}
                value={corner.cruce}
                onChange={(e) => change(corner.key, { cruce: e.target.value })}
              />
              <input
                aria-label={t('parade.route.lat', { n: index + 1 })}
                placeholder={t('parade.route.latPlaceholder')}
                className={inputClass}
                value={corner.lat}
                onChange={(e) => change(corner.key, { lat: e.target.value })}
              />
              <input
                aria-label={t('parade.route.lng', { n: index + 1 })}
                placeholder={t('parade.route.lngPlaceholder')}
                className={inputClass}
                value={corner.lng}
                onChange={(e) => change(corner.key, { lng: e.target.value })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => setOnMap(onMap === corner.key ? null : corner.key)}
              >
                {t('parade.route.onMap', { n: index + 1 })}
              </Button>
              <Button variant="secondary" disabled={index === 0} onClick={() => move(index, -1)}>
                {t('parade.route.up', { n: index + 1 })}
              </Button>
              <Button
                variant="secondary"
                disabled={index === list.length - 1}
                onClick={() => move(index, 1)}
              >
                {t('parade.route.down', { n: index + 1 })}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setCorners(list.filter((c) => c.key !== corner.key))}
              >
                {t('parade.route.remove', { n: index + 1 })}
              </Button>
            </div>
            {onMap === corner.key && (
              <LocationPicker
                value={
                  parsed[index]!.lat !== null && parsed[index]!.lng !== null
                    ? { lat: parsed[index]!.lat!, lng: parsed[index]!.lng! }
                    : null
                }
                onChange={(value) =>
                  change(corner.key, {
                    lat: value ? String(value.lat) : '',
                    lng: value ? String(value.lng) : '',
                  })
                }
                searchHint={[corner.calle, corner.cruce].filter(Boolean).join(' y ')}
              />
            )}
          </li>
        ))}
      </ol>
      <Button variant="secondary" onClick={add}>
        {t('parade.route.add')}
      </Button>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('parade.route.state')} hint={t('parade.route.stateHint')}>
          <select
            className={inputClass}
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoEvento)}
          >
            {STATES.map((state) => (
              <option key={state} value={state}>
                {t(`parade.route.states.${state}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('parade.route.sources')} hint={t('groups.field.sourcesHint')}>
          <textarea
            className={`${inputClass} h-20`}
            value={fuentes}
            onChange={(e) => setFuentes(e.target.value)}
          />
        </Field>
      </div>

      {incomplete.length > 0 && (
        <Notice kind="warn">{t('parade.route.incomplete', { count: incomplete.length })}</Notice>
      )}
      {list.length === 1 && <Notice kind="warn">{t('parade.route.tooShort')}</Notice>}
      <Button disabled={blocked || save.isPending} onClick={() => save.mutate()}>
        {list.length === 0 ? t('parade.route.clear') : t('parade.route.save')}
      </Button>
    </section>
  )
}
