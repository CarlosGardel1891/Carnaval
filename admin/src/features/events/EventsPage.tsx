import { Constants } from '@cuerda/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button, Field, inputClass, Notice, PageTitle } from '../../components/ui'
import * as api from '../../lib/api'
import type { EstadoEvento, EventRow, TipoEvento } from '../../lib/api'
import { formatNight, isIsoDate } from '../../lib/format'
import { orNull, slugOf, toLines } from '../../lib/text'

const TYPES = Constants.public.Enums.tipo_evento
const STATES = Constants.public.Enums.estado_evento

interface Draft {
  nombre: string
  tipo: TipoEvento
  fechaInicio: string
  fechaFin: string
  lugar: string
  estado: EstadoEvento
  info: string
  fuentes: string
  entradasUrl: string
  entradasTexto: string
}

const emptyDraft: Draft = {
  nombre: '',
  tipo: 'otro',
  fechaInicio: '',
  fechaFin: '',
  lugar: '',
  estado: 'estimado',
  info: '',
  fuentes: '',
  entradasUrl: '',
  entradasTexto: '',
}

const toDraft = (event: EventRow): Draft => ({
  nombre: event.nombre,
  tipo: event.tipo,
  fechaInicio: event.fecha_inicio,
  fechaFin: event.fecha_fin,
  lugar: event.lugar ?? '',
  estado: event.estado,
  info: event.info ?? '',
  fuentes: event.fuente_url.join('\n'),
  entradasUrl: event.entradas_url ?? '',
  entradasTexto: event.entradas_texto ?? '',
})

const isWebUrl = (text: string) => /^https?:\/\/\S+$/.test(text)

export function EventsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const events = useQuery({ queryKey: ['events'], queryFn: api.fetchEvents })
  const seasons = useQuery({ queryKey: ['seasons'], queryFn: api.fetchSeasons })
  const season = seasons.data?.[seasons.data.length - 1]
  const current =
    typeof selected === 'number' ? events.data?.find((e) => e.id === selected) : undefined

  const ticketUrl = draft.entradasUrl.trim()
  const badTicketUrl = ticketUrl !== '' && !isWebUrl(ticketUrl)
  const badDates =
    !isIsoDate(draft.fechaInicio) ||
    (draft.fechaFin !== '' && (!isIsoDate(draft.fechaFin) || draft.fechaFin < draft.fechaInicio))
  const temporadaId = current?.temporada_id ?? season?.id

  const save = useMutation({
    mutationFn: () =>
      api.saveEvent(current?.id ?? null, {
        temporada_id: temporadaId!,
        slug: current?.slug ?? slugOf(`${draft.nombre} ${draft.fechaInicio.slice(0, 4)}`),
        tipo: draft.tipo,
        nombre: draft.nombre.trim(),
        fecha_inicio: draft.fechaInicio,
        fecha_fin: draft.fechaFin || draft.fechaInicio,
        lugar: orNull(draft.lugar),
        estado: draft.estado,
        info: orNull(draft.info),
        fuente_url: toLines(draft.fuentes),
        entradas_url: ticketUrl || null,
        entradas_texto: orNull(draft.entradasTexto),
      }),
    onSuccess: (id) => {
      setSelected(id)
      setMessage({ kind: 'ok', text: t('events.saved') })
      void queryClient.invalidateQueries({ queryKey: ['events'] })
    },
    onError: (error) => setMessage({ kind: 'error', text: error.message }),
  })

  const open = (target: EventRow | 'new') => {
    setMessage(null)
    setSelected(target === 'new' ? 'new' : target.id)
    setDraft(target === 'new' ? emptyDraft : toDraft(target))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (draft.nombre.trim() && !badDates && !badTicketUrl && temporadaId) save.mutate()
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  return (
    <>
      <PageTitle title={t('events.title')} intro={t('events.intro')} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="space-y-3">
          <Button onClick={() => open('new')}>{t('events.new')}</Button>
          {events.isError && <Notice kind="error">{t('events.loadFailed')}</Notice>}
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
            {(events.data ?? []).map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  aria-current={selected === event.id}
                  onClick={() => open(event)}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-left text-sm ${
                    selected === event.id
                      ? 'border-slate-800'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span className="block font-medium">{event.nombre}</span>
                  <span className="block text-xs text-slate-500">
                    {formatNight(event.fecha_inicio)}
                    {event.estado === 'estimado' && ` · ${t('eventStatus.estimado')}`}
                    {event.entradas_url && ` · ${t('events.hasTickets')}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {selected !== null && (
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
          >
            <h2 className="text-lg font-semibold">
              {current ? current.nombre : t('events.newTitle')}
            </h2>
            {message && <Notice kind={message.kind}>{message.text}</Notice>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('events.field.name')}>
                <input
                  required
                  className={inputClass}
                  value={draft.nombre}
                  onChange={(event) => set('nombre', event.target.value)}
                />
              </Field>
              <Field label={t('events.field.type')}>
                <select
                  className={inputClass}
                  value={draft.tipo}
                  onChange={(event) => set('tipo', event.target.value as TipoEvento)}
                >
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`eventType.${type}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('events.field.from')}>
                <input
                  type="date"
                  required
                  className={inputClass}
                  value={draft.fechaInicio}
                  onChange={(event) => set('fechaInicio', event.target.value)}
                />
              </Field>
              <Field label={t('events.field.to')} hint={t('events.field.toHint')}>
                <input
                  type="date"
                  className={inputClass}
                  value={draft.fechaFin}
                  onChange={(event) => set('fechaFin', event.target.value)}
                />
              </Field>
              <Field label={t('events.field.state')} hint={t('events.field.stateHint')}>
                <select
                  className={inputClass}
                  value={draft.estado}
                  onChange={(event) => set('estado', event.target.value as EstadoEvento)}
                >
                  {STATES.map((state) => (
                    <option key={state} value={state}>
                      {t(`eventStatus.${state}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('events.field.place')}>
                <input
                  className={inputClass}
                  value={draft.lugar}
                  onChange={(event) => set('lugar', event.target.value)}
                />
              </Field>
              <Field label={t('events.field.info')}>
                <textarea
                  className={`${inputClass} h-24`}
                  value={draft.info}
                  onChange={(event) => set('info', event.target.value)}
                />
              </Field>
              <Field label={t('events.field.sources')} hint={t('groups.field.sourcesHint')}>
                <textarea
                  className={`${inputClass} h-24`}
                  value={draft.fuentes}
                  onChange={(event) => set('fuentes', event.target.value)}
                />
              </Field>
            </div>
            {draft.fechaInicio !== '' && badDates && (
              <Notice kind="error">{t('events.badDates')}</Notice>
            )}

            <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-sm font-medium">{t('events.tickets.title')}</legend>
              <p className="text-xs text-slate-600">{t('events.tickets.intro')}</p>
              <Field label={t('events.tickets.url')}>
                <input
                  className={inputClass}
                  placeholder="https://"
                  value={draft.entradasUrl}
                  onChange={(event) => set('entradasUrl', event.target.value)}
                />
              </Field>
              {badTicketUrl && <Notice kind="error">{t('events.tickets.badUrl')}</Notice>}
              <Field label={t('events.tickets.text')} hint={t('events.tickets.textHint')}>
                <input
                  className={inputClass}
                  value={draft.entradasTexto}
                  onChange={(event) => set('entradasTexto', event.target.value)}
                />
              </Field>
            </fieldset>

            {current?.tipo === 'llamadas' && (
              <Link to={`/llamadas?evento=${current.id}`} className="block text-sm underline">
                {t('events.goParade')}
              </Link>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={save.isPending}>
                {t('night.save')}
              </Button>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                {t('groups.close')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
