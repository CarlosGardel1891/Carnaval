import { Constants, type TipoEscenario } from '@cuerda/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, inputClass, Notice, PageTitle } from '../../components/ui'
import * as api from '../../lib/api'
import type { StageRow } from '../../lib/api'
import { matchesSearch, orNull, slugOf, toLines } from '../../lib/text'
import type { Coords } from '../map/geocode'
import { LocationPicker } from '../map/LocationPicker'

const TYPES = Constants.public.Enums.tipo_escenario

/** Un sí o no que también puede no saberse (decisión 3). */
type Tri = 'si' | 'no' | 'nose'
const toTri = (value: boolean | null): Tri => (value === null ? 'nose' : value ? 'si' : 'no')
const fromTri = (value: Tri): boolean | null => (value === 'nose' ? null : value === 'si')

interface Draft {
  nombre: string
  alias: string
  tipo: TipoEscenario | ''
  direccion: string
  barrio: string
  precio: string
  gratis: Tri
  activo: boolean
  itinerante: Tri
  fuentes: string
  ubicacion: Coords | null
}

const emptyDraft: Draft = {
  nombre: '',
  alias: '',
  tipo: '',
  direccion: '',
  barrio: '',
  precio: '',
  gratis: 'nose',
  activo: true,
  itinerante: 'no',
  fuentes: '',
  ubicacion: null,
}

const toDraft = (stage: StageRow): Draft => ({
  nombre: stage.nombre,
  alias: stage.alias.join('\n'),
  tipo: stage.tipo ?? '',
  direccion: stage.direccion ?? '',
  barrio: stage.barrio ?? '',
  precio: stage.precio_texto ?? '',
  gratis: toTri(stage.gratis),
  activo: stage.activo,
  itinerante: toTri(stage.itinerante),
  fuentes: stage.fuente_url.join('\n'),
  ubicacion: stage.lat !== null && stage.lng !== null ? { lat: stage.lat, lng: stage.lng } : null,
})

/** Un escenario fijo y activo sin punto en el mapa: no sale en el mapa ni en «cerca mío». */
const missesLocation = (stage: StageRow) =>
  stage.activo && stage.itinerante !== true && stage.lat === null

export function StagesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [onlyMissing, setOnlyMissing] = useState(false)
  const [selected, setSelected] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const stages = useQuery({ queryKey: ['stages'], queryFn: api.fetchStages })
  // Lo que propuso el geocodificador (decisión 87). Si no se pueden leer, el panel anda igual.
  const proposals = useQuery({
    queryKey: ['locationProposals'],
    queryFn: api.fetchLocationProposals,
  })
  const proposalOf = (stageId: number) =>
    proposals.data?.find((proposal) => proposal.escenario_id === stageId)

  const shown = useMemo(
    () =>
      (stages.data ?? []).filter(
        (s) => matchesSearch(search, s.nombre, s.alias) && (!onlyMissing || missesLocation(s)),
      ),
    [stages.data, search, onlyMissing],
  )
  const missing = (stages.data ?? []).filter(missesLocation).length
  const current =
    typeof selected === 'number' ? stages.data?.find((s) => s.id === selected) : undefined
  const itinerant = draft.itinerante === 'si'
  const proposal = current && missesLocation(current) ? proposalOf(current.id) : undefined
  const proposed = (stages.data ?? []).filter((s) => missesLocation(s) && proposalOf(s.id)).length

  const discard = useMutation({
    mutationFn: (stageId: number) => api.discardLocationProposal(stageId),
    onSuccess: () => {
      setMessage({ kind: 'ok', text: t('stages.proposal.discarded') })
      void queryClient.invalidateQueries({ queryKey: ['locationProposals'] })
    },
    onError: (error) => setMessage({ kind: 'error', text: error.message }),
  })

  const save = useMutation({
    mutationFn: () =>
      api.saveStage(current?.id ?? null, {
        slug: current?.slug ?? slugOf(draft.nombre),
        nombre: draft.nombre.trim(),
        alias: toLines(draft.alias),
        tipo: draft.tipo || null,
        direccion: orNull(draft.direccion),
        barrio: orNull(draft.barrio),
        precio_texto: orNull(draft.precio),
        gratis: fromTri(draft.gratis),
        activo: draft.activo,
        itinerante: fromTri(draft.itinerante),
        fuente_url: toLines(draft.fuentes),
        // Un itinerante no tiene lugar propio: el de cada noche va en la actuación (decisión 2).
        lat: itinerant ? null : (draft.ubicacion?.lat ?? null),
        lng: itinerant ? null : (draft.ubicacion?.lng ?? null),
      }),
    onSuccess: (id) => {
      setSelected(id)
      setMessage({ kind: 'ok', text: t('stages.saved') })
      void queryClient.invalidateQueries({ queryKey: ['stages'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
      // Con la ubicación guardada, la base quita la propuesta de ese escenario.
      void queryClient.invalidateQueries({ queryKey: ['locationProposals'] })
    },
    onError: (error) => setMessage({ kind: 'error', text: error.message }),
  })

  const open = (target: StageRow | 'new') => {
    setMessage(null)
    setSelected(target === 'new' ? 'new' : target.id)
    setDraft(target === 'new' ? emptyDraft : toDraft(target))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (draft.nombre.trim()) save.mutate()
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  const tri = (key: 'gratis' | 'itinerante', label: string) => (
    <Field label={label}>
      <select
        className={inputClass}
        value={draft[key]}
        onChange={(event) => set(key, event.target.value as Tri)}
      >
        <option value="si">{t('stages.yes')}</option>
        <option value="no">{t('stages.no')}</option>
        <option value="nose">{t('stages.unknown')}</option>
      </select>
    </Field>
  )

  return (
    <>
      <PageTitle title={t('stages.title')} intro={t('stages.intro')} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="space-y-3">
          <div className="flex gap-2">
            <input
              aria-label={t('stages.search')}
              placeholder={t('stages.search')}
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button onClick={() => open('new')}>{t('stages.new')}</Button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(event) => setOnlyMissing(event.target.checked)}
            />
            {t('stages.onlyMissing', { count: missing })}
          </label>
          {proposed > 0 && (
            <p className="text-sm text-slate-600">
              {t('stages.proposal.pending', { count: proposed })}
            </p>
          )}
          {stages.isError && <Notice kind="error">{t('stages.loadFailed')}</Notice>}
          {stages.data && (
            <p role="status" className="text-sm text-slate-600">
              {t('stages.count', { count: shown.length, total: stages.data.length })}
            </p>
          )}
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
            {shown.map((stage) => (
              <li key={stage.id}>
                <button
                  type="button"
                  aria-current={selected === stage.id}
                  onClick={() => open(stage)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                    selected === stage.id
                      ? 'border-slate-800 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <span className={`flex-1 font-medium ${stage.activo ? '' : 'text-slate-400'}`}>
                    {stage.nombre}
                  </span>
                  <span className="text-xs text-slate-500">
                    {!stage.activo
                      ? t('stages.inactive')
                      : stage.itinerante
                        ? t('stages.itinerant')
                        : stage.lat === null
                          ? proposalOf(stage.id)
                            ? t('stages.proposal.badge')
                            : t('stages.noLocation')
                          : t('stages.located')}
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
              {current ? current.nombre : t('stages.newTitle')}
            </h2>
            {message && <Notice kind={message.kind}>{message.text}</Notice>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('stages.field.name')}>
                <input
                  required
                  className={inputClass}
                  value={draft.nombre}
                  onChange={(event) => set('nombre', event.target.value)}
                />
              </Field>
              <Field label={t('stages.field.type')}>
                <select
                  className={inputClass}
                  value={draft.tipo}
                  onChange={(event) => set('tipo', event.target.value as TipoEscenario | '')}
                >
                  <option value="">{t('stages.unknown')}</option>
                  {TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`stageType.${type}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('stages.field.alias')} hint={t('stages.field.aliasHint')}>
                <textarea
                  className={`${inputClass} h-24`}
                  value={draft.alias}
                  onChange={(event) => set('alias', event.target.value)}
                />
              </Field>
              <Field label={t('stages.field.sources')} hint={t('groups.field.sourcesHint')}>
                <textarea
                  className={`${inputClass} h-24`}
                  value={draft.fuentes}
                  onChange={(event) => set('fuentes', event.target.value)}
                />
              </Field>
              <Field label={t('stages.field.address')}>
                <input
                  className={inputClass}
                  value={draft.direccion}
                  onChange={(event) => set('direccion', event.target.value)}
                />
              </Field>
              <Field label={t('stages.field.neighborhood')}>
                <input
                  className={inputClass}
                  value={draft.barrio}
                  onChange={(event) => set('barrio', event.target.value)}
                />
              </Field>
              <Field label={t('stages.field.price')}>
                <input
                  className={inputClass}
                  value={draft.precio}
                  onChange={(event) => set('precio', event.target.value)}
                />
              </Field>
              {tri('gratis', t('stages.field.free'))}
              {tri('itinerante', t('stages.field.itinerant'))}
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.activo}
                  onChange={(event) => set('activo', event.target.checked)}
                />
                {t('stages.field.active')}
              </label>
            </div>

            <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
              <legend className="px-1 text-sm font-medium">{t('stages.location')}</legend>
              {itinerant ? (
                <Notice>{t('stages.itinerantNoLocation')}</Notice>
              ) : (
                <>
                  {proposal && (
                    <Notice>
                      <p className="font-medium">{t('stages.proposal.title')}</p>
                      <p>{t('stages.proposal.searched', { query: proposal.consulta })}</p>
                      <p>{t('stages.proposal.found', { result: proposal.resultado })}</p>
                      <p className="text-slate-600">{t('stages.proposal.hint')}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => set('ubicacion', { lat: proposal.lat, lng: proposal.lng })}
                        >
                          {t('stages.proposal.show')}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={discard.isPending}
                          onClick={() => discard.mutate(proposal.escenario_id)}
                        >
                          {t('stages.proposal.discard')}
                        </Button>
                      </div>
                    </Notice>
                  )}
                  <LocationPicker
                    // Un mapa por escenario: al cambiar de escenario arranca en su punto.
                    key={String(selected)}
                    value={draft.ubicacion}
                    onChange={(value) => set('ubicacion', value)}
                    searchHint={[draft.direccion, draft.barrio].filter(Boolean).join(', ')}
                  />
                </>
              )}
            </fieldset>

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
