import { Constants } from '@cuerda/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button, Field, inputClass, Notice, PageTitle } from '../../components/ui'
import * as api from '../../lib/api'
import type { ContestStage, RuedaConcurso } from '../../lib/api'
import { formatNight, formatTime, isIsoDate, isTime } from '../../lib/format'
import { nightInstant } from '../../lib/night'
import { orNull } from '../../lib/text'

const ROUNDS = Constants.public.Enums.rueda_concurso

interface Draft {
  rueda: RuedaConcurso
  numero: string
  fecha: string
  fuente: string
  fuenteUrl: string
}

const emptyDraft: Draft = { rueda: 'primera', numero: '', fecha: '', fuente: '', fuenteUrl: '' }

const toDraft = (stage: ContestStage): Draft => ({
  rueda: stage.rueda,
  numero: String(stage.numero),
  fecha: stage.fecha,
  fuente: stage.fuente,
  fuenteUrl: stage.fuente_url ?? '',
})

/**
 * El fixture del Concurso (decisión 57): cada noche es una etapa, y sus conjuntos son
 * actuaciones del Teatro de Verano con esa etapa. Por eso también salen en el pizarrón.
 */
export function ContestPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [group, setGroup] = useState('')
  const [hora, setHora] = useState('')

  const contest = useQuery({ queryKey: ['contest'], queryFn: api.fetchContest })
  const seasons = useQuery({ queryKey: ['seasons'], queryFn: api.fetchSeasons })
  const catalog = useQuery({ queryKey: ['catalog'], queryFn: api.fetchCatalog })
  const season = seasons.data?.[seasons.data.length - 1]
  const theater = catalog.data?.stages.find((stage) => stage.tipo === 'teatro_verano')
  const current =
    typeof selected === 'number' ? contest.data?.find((s) => s.id === selected) : undefined

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['contest'] })
  const fail = (error: Error) => setMessage({ kind: 'error', text: error.message })
  const temporadaId = current?.temporada_id ?? season?.id
  const valid =
    Number.isInteger(Number(draft.numero)) &&
    Number(draft.numero) > 0 &&
    isIsoDate(draft.fecha) &&
    draft.fuente.trim() !== '' &&
    temporadaId !== undefined

  const save = useMutation({
    mutationFn: () =>
      api.saveContestStage(current?.id ?? null, {
        temporada_id: temporadaId!,
        rueda: draft.rueda,
        numero: Number(draft.numero),
        fecha: draft.fecha,
        fuente: draft.fuente.trim(),
        fuente_url: orNull(draft.fuenteUrl),
      }),
    onSuccess: (id) => {
      setSelected(id)
      setMessage({ kind: 'ok', text: t('contest.saved') })
      void refresh()
    },
    onError: fail,
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteContestStage(id),
    onSuccess: () => {
      setSelected(null)
      setDeleting(false)
      void refresh()
    },
    onError: fail,
  })

  const addGroup = useMutation({
    mutationFn: () =>
      api.addAct({
        escenario_id: theater!.id,
        conjunto_id: Number(group),
        inicio: nightInstant(current!.fecha, hora),
        direccion_texto: null,
        fuente: current!.fuente,
        fuente_url: current!.fuente_url,
        etapa_id: current!.id,
      }),
    onSuccess: () => {
      setGroup('')
      setHora('')
      setMessage({ kind: 'ok', text: t('contest.groupAdded') })
      void refresh()
    },
    onError: fail,
  })

  const open = (target: ContestStage | 'new') => {
    setMessage(null)
    setDeleting(false)
    setSelected(target === 'new' ? 'new' : target.id)
    setDraft(target === 'new' ? emptyDraft : toDraft(target))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) save.mutate()
  }

  const onAddGroup = (event: FormEvent) => {
    event.preventDefault()
    if (current && theater && group && isTime(hora)) addGroup.mutate()
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  return (
    <>
      <PageTitle title={t('contest.title')} intro={t('contest.intro')} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="space-y-4">
          <Button onClick={() => open('new')}>{t('contest.new')}</Button>
          {contest.isError && <Notice kind="error">{t('contest.loadFailed')}</Notice>}
          {contest.data?.length === 0 && <Notice>{t('contest.empty')}</Notice>}
          {ROUNDS.map((round) => {
            const stages = (contest.data ?? []).filter((stage) => stage.rueda === round)
            if (stages.length === 0) return null
            return (
              <div key={round} className="space-y-1">
                <h2 className="font-semibold">{t(`round.${round}`)}</h2>
                <ul className="space-y-1">
                  {stages.map((stage) => (
                    <li key={stage.id}>
                      <button
                        type="button"
                        aria-current={selected === stage.id}
                        onClick={() => open(stage)}
                        className={`w-full rounded-lg border bg-white px-3 py-2 text-left text-sm ${
                          selected === stage.id
                            ? 'border-slate-800'
                            : 'border-slate-200 hover:border-slate-400'
                        }`}
                      >
                        <span className="block font-medium">
                          {t('contest.stage', { numero: stage.numero })} ·{' '}
                          {formatNight(stage.fecha)}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {t('contest.groups', { count: stage.actuaciones.length })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </section>

        {selected !== null && (
          <div className="space-y-4">
            <form
              onSubmit={onSubmit}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-4"
            >
              <h2 className="text-lg font-semibold">
                {current
                  ? `${t(`round.${current.rueda}`)} · ${t('contest.stage', { numero: current.numero })}`
                  : t('contest.newTitle')}
              </h2>
              {message && <Notice kind={message.kind}>{message.text}</Notice>}
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label={t('contest.field.round')}>
                  <select
                    className={inputClass}
                    value={draft.rueda}
                    onChange={(event) => set('rueda', event.target.value as RuedaConcurso)}
                  >
                    {ROUNDS.map((round) => (
                      <option key={round} value={round}>
                        {t(`round.${round}`)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t('contest.field.number')}>
                  <input
                    type="number"
                    min={1}
                    required
                    className={inputClass}
                    value={draft.numero}
                    onChange={(event) => set('numero', event.target.value)}
                  />
                </Field>
                <Field label={t('contest.field.date')}>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={draft.fecha}
                    onChange={(event) => set('fecha', event.target.value)}
                  />
                </Field>
                <Field label={t('contest.field.source')}>
                  <input
                    required
                    className={inputClass}
                    value={draft.fuente}
                    onChange={(event) => set('fuente', event.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={t('contest.field.sourceUrl')}>
                    <input
                      type="url"
                      className={inputClass}
                      value={draft.fuenteUrl}
                      onChange={(event) => set('fuenteUrl', event.target.value)}
                    />
                  </Field>
                </div>
              </div>
              {current && draft.fecha !== current.fecha && current.actuaciones.length > 0 && (
                <Notice kind="warn">{t('contest.dateWarning')}</Notice>
              )}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={save.isPending || !valid}>
                  {t('night.save')}
                </Button>
                <Button variant="secondary" onClick={() => setSelected(null)}>
                  {t('groups.close')}
                </Button>
                {current &&
                  (deleting ? (
                    <Button
                      variant="danger"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(current.id)}
                    >
                      {t('contest.confirmDelete')}
                    </Button>
                  ) : (
                    <Button variant="secondary" onClick={() => setDeleting(true)}>
                      {t('contest.delete')}
                    </Button>
                  ))}
              </div>
            </form>

            {current && (
              <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="font-semibold">
                  {t('contest.night', { noche: formatNight(current.fecha) })}
                </h3>
                {current.actuaciones.length === 0 ? (
                  <p className="text-sm text-slate-600">{t('contest.noGroups')}</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {current.actuaciones.map((act) => (
                      <li key={act.id} className="flex gap-3">
                        <span className="w-12 font-mono">{formatTime(act.inicio)}</span>
                        <span className="flex-1">{act.conjunto.nombre}</span>
                        {act.estado !== 'programada' && (
                          <span className="text-xs text-slate-600">
                            {t(`status.${act.estado}`)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <Link to={`/grilla?noche=${current.fecha}`} className="block text-sm underline">
                  {t('contest.editNight')}
                </Link>

                {theater ? (
                  <form
                    onSubmit={onAddGroup}
                    className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end"
                  >
                    <Field label={t('contest.addGroup')}>
                      <select
                        required
                        className={inputClass}
                        value={group}
                        onChange={(event) => setGroup(event.target.value)}
                      >
                        <option value="">{t('import.resolve.choose')}</option>
                        {catalog.data?.groups.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.nombre}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t('contest.addTime')}>
                      <input
                        type="time"
                        required
                        className={inputClass}
                        value={hora}
                        onChange={(event) => setHora(event.target.value)}
                      />
                    </Field>
                    <Button type="submit" disabled={addGroup.isPending}>
                      {t('night.add.submit')}
                    </Button>
                  </form>
                ) : (
                  catalog.data && <Notice kind="warn">{t('contest.noTheater')}</Notice>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </>
  )
}
