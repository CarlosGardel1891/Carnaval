import { Constants, nocheLogica, type EstadoActuacion } from '@cuerda/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Button, Field, inputClass, Notice, PageTitle } from '../../components/ui'
import * as api from '../../lib/api'
import type { NightAct } from '../../lib/api'
import { formatDateTime, formatNight, formatTime, isIsoDate, isTime } from '../../lib/format'
import { nightInstant } from '../../lib/night'
import { toPatch, type Draft } from './actPatch'
import { SuspendPanel } from './SuspendPanel'

const STATES = Constants.public.Enums.estado_actuacion

const stateStyles: Record<EstadoActuacion, string> = {
  programada: 'bg-slate-100 text-slate-700',
  cambiada: 'bg-amber-100 text-amber-900',
  suspendida: 'bg-red-100 text-red-900',
}

export function NightPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()
  const noche = params.get('noche') ?? nocheLogica(new Date())
  const nightOk = isIsoDate(noche)

  const [editing, setEditing] = useState<{ id: number; draft: Draft } | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const acts = useQuery({
    queryKey: ['night', noche],
    queryFn: () => api.fetchNightActs(noche),
    enabled: nightOk,
  })
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: api.fetchCatalog })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['night'] })
  const fail = (error: Error) => setMessage({ kind: 'error', text: error.message })

  const save = useMutation({
    mutationFn: async ({ act, draft }: { act: NightAct; draft: Draft }) => {
      const patch = toPatch(act, draft, noche)
      if (Object.keys(patch).length > 0) await api.updateAct(act.id, patch)
      return patch
    },
    onSuccess: (patch) => {
      setEditing(null)
      setMessage({
        kind: 'ok',
        text: t(Object.keys(patch).length > 0 ? 'night.saved' : 'night.nothingChanged'),
      })
      void refresh()
    },
    onError: fail,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteAct(id),
    onSuccess: () => {
      setDeleting(null)
      setMessage({ kind: 'ok', text: t('night.deleted') })
      void refresh()
    },
    onError: fail,
  })

  const byStage = useMemo(() => {
    const groups = new Map<number, { nombre: string; acts: NightAct[] }>()
    for (const act of acts.data ?? []) {
      const group = groups.get(act.escenario.id) ?? { nombre: act.escenario.nombre, acts: [] }
      group.acts.push(act)
      groups.set(act.escenario.id, group)
    }
    return [...groups.entries()].map(([id, group]) => ({ id, ...group }))
  }, [acts.data])

  const startEdit = (act: NightAct) => {
    setMessage(null)
    setDeleting(null)
    setEditing({
      id: act.id,
      draft: {
        hora: formatTime(act.inicio),
        escenarioId: act.escenario.id,
        direccion: act.direccion_texto ?? '',
        estado: act.estado,
      },
    })
  }

  const onSubmitEdit = (event: FormEvent, act: NightAct) => {
    event.preventDefault()
    if (editing && isTime(editing.draft.hora)) save.mutate({ act, draft: editing.draft })
  }

  return (
    <>
      <PageTitle title={t('night.title')} intro={t('night.intro')} />

      <section className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="w-56">
          <Field label={t('night.night')} hint={nightOk ? formatNight(noche) : undefined}>
            <input
              type="date"
              className={inputClass}
              value={noche}
              onChange={(event) => {
                setEditing(null)
                setMessage(null)
                setParams({ noche: event.target.value }, { replace: true })
              }}
            />
          </Field>
        </div>
        <Link to="/grilla/importar" className="pb-2 text-sm underline">
          {t('night.goImport')}
        </Link>
      </section>

      {message && <Notice kind={message.kind}>{message.text}</Notice>}
      {acts.isError && <Notice kind="error">{t('night.loadFailed')}</Notice>}
      {acts.isPending && nightOk && <p className="text-sm text-slate-600">{t('app.loading')}</p>}

      {acts.data && (
        <>
          <p role="status" className="text-sm text-slate-700">
            {t('night.summary', {
              count: acts.data.length,
              stages: byStage.length,
              suspended: acts.data.filter((act) => act.estado === 'suspendida').length,
            })}
          </p>

          <SuspendPanel
            noche={noche}
            stages={byStage.map(({ id, nombre, acts: list }) => ({
              id,
              nombre,
              active: list.filter((act) => act.estado !== 'suspendida').length,
            }))}
            onDone={() => void refresh()}
          />

          {byStage.map((stage) => (
            <article key={stage.id} className="rounded-xl border border-slate-200 bg-white">
              <h2 className="border-b border-slate-200 px-4 py-3 font-semibold">{stage.nombre}</h2>
              <ul>
                {stage.acts.map((act) => (
                  <li key={act.id} className="border-b border-slate-100 px-4 py-2 last:border-0">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="w-12 font-mono">{formatTime(act.inicio)}</span>
                      <span className="flex-1 font-medium">{act.conjunto.nombre}</span>
                      <span className={`rounded px-2 py-0.5 text-xs ${stateStyles[act.estado]}`}>
                        {t(`status.${act.estado}`)}
                      </span>
                      <Button variant="secondary" onClick={() => startEdit(act)}>
                        {t('night.edit', { conjunto: act.conjunto.nombre })}
                      </Button>
                      {deleting === act.id ? (
                        <Button
                          variant="danger"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(act.id)}
                        >
                          {t('night.confirmDelete', { conjunto: act.conjunto.nombre })}
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditing(null)
                            setDeleting(act.id)
                          }}
                        >
                          {t('night.delete', { conjunto: act.conjunto.nombre })}
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {act.direccion_texto && `${act.direccion_texto} · `}
                      {t('night.source', { fuente: act.fuente })} ·{' '}
                      {t('night.updated', { when: formatDateTime(act.actualizado_en) })}
                    </p>

                    {editing?.id === act.id && (
                      <form
                        onSubmit={(event) => onSubmitEdit(event, act)}
                        className="mt-3 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-4"
                      >
                        <Field label={t('night.field.time')}>
                          <input
                            type="time"
                            required
                            className={inputClass}
                            value={editing.draft.hora}
                            onChange={(event) =>
                              setEditing({
                                id: act.id,
                                draft: { ...editing.draft, hora: event.target.value },
                              })
                            }
                          />
                        </Field>
                        <Field label={t('night.field.stage')}>
                          <select
                            className={inputClass}
                            value={editing.draft.escenarioId}
                            onChange={(event) =>
                              setEditing({
                                id: act.id,
                                draft: {
                                  ...editing.draft,
                                  escenarioId: Number(event.target.value),
                                },
                              })
                            }
                          >
                            {(
                              catalog.data?.stages ?? [
                                { id: act.escenario.id, nombre: act.escenario.nombre },
                              ]
                            ).map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.nombre}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label={t('night.field.stop')}>
                          <input
                            className={inputClass}
                            value={editing.draft.direccion}
                            onChange={(event) =>
                              setEditing({
                                id: act.id,
                                draft: { ...editing.draft, direccion: event.target.value },
                              })
                            }
                          />
                        </Field>
                        <Field label={t('night.field.state')}>
                          <select
                            className={inputClass}
                            value={editing.draft.estado}
                            onChange={(event) =>
                              setEditing({
                                id: act.id,
                                draft: {
                                  ...editing.draft,
                                  estado: event.target.value as EstadoActuacion,
                                },
                              })
                            }
                          >
                            {STATES.map((state) => (
                              <option key={state} value={state}>
                                {t(`status.${state}`)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <p className="text-xs text-slate-600 sm:col-span-4">
                          {t('night.editHint')}
                        </p>
                        <div className="flex gap-2 sm:col-span-4">
                          <Button type="submit" disabled={save.isPending}>
                            {t('night.save')}
                          </Button>
                          <Button variant="secondary" onClick={() => setEditing(null)}>
                            {t('night.cancel')}
                          </Button>
                        </div>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <AddAct
            noche={noche}
            catalog={catalog.data}
            onAdded={() => {
              setMessage({ kind: 'ok', text: t('night.added') })
              void refresh()
            }}
            onError={fail}
          />
        </>
      )}
    </>
  )
}

function AddAct({
  noche,
  catalog,
  onAdded,
  onError,
}: {
  noche: string
  catalog: Awaited<ReturnType<typeof api.fetchCatalog>> | undefined
  onAdded: () => void
  onError: (error: Error) => void
}) {
  const { t } = useTranslation()
  const [stage, setStage] = useState('')
  const [group, setGroup] = useState('')
  const [hora, setHora] = useState('')
  const [direccion, setDireccion] = useState('')
  const [fuente, setFuente] = useState('')
  const [fuenteUrl, setFuenteUrl] = useState('')

  const add = useMutation({
    mutationFn: () =>
      api.addAct({
        escenario_id: Number(stage),
        conjunto_id: Number(group),
        inicio: nightInstant(noche, hora),
        direccion_texto: direccion.trim() || null,
        fuente: fuente.trim(),
        fuente_url: fuenteUrl.trim() || null,
      }),
    onSuccess: () => {
      setGroup('')
      setHora('')
      onAdded()
    },
    onError,
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (stage && group && isTime(hora) && fuente.trim()) add.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">{t('night.add.title')}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={t('night.add.stage')}>
          <select
            required
            className={inputClass}
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          >
            <option value="">{t('import.resolve.choose')}</option>
            {catalog?.stages.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('night.add.group')}>
          <select
            required
            className={inputClass}
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="">{t('import.resolve.choose')}</option>
            {catalog?.groups.map((option) => (
              <option key={option.id} value={option.id}>
                {option.nombre}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('night.add.time')}>
          <input
            type="time"
            required
            className={inputClass}
            value={hora}
            onChange={(event) => setHora(event.target.value)}
          />
        </Field>
        <Field label={t('night.add.stop')}>
          <input
            className={inputClass}
            value={direccion}
            onChange={(event) => setDireccion(event.target.value)}
          />
        </Field>
        <Field label={t('night.add.source')}>
          <input
            required
            className={inputClass}
            value={fuente}
            onChange={(event) => setFuente(event.target.value)}
          />
        </Field>
        <Field label={t('night.add.sourceUrl')}>
          <input
            type="url"
            className={inputClass}
            value={fuenteUrl}
            onChange={(event) => setFuenteUrl(event.target.value)}
          />
        </Field>
      </div>
      <p className="text-xs text-slate-600">{t('night.add.hint')}</p>
      <Button type="submit" disabled={add.isPending}>
        {t('night.add.submit')}
      </Button>
    </form>
  )
}
