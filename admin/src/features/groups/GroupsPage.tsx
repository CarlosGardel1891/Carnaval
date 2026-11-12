import { Constants, type CategoriaConjunto } from '@cuerda/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, inputClass, Notice, PageTitle } from '../../components/ui'
import * as api from '../../lib/api'
import type { GroupRow, Season } from '../../lib/api'
import { matchesSearch, orNull, slugOf, toLines } from '../../lib/text'

const CATEGORIES = Constants.public.Enums.categoria_conjunto

/** En el Concurso: sí, no, o todavía no se sabe (decisión 26). */
type Contest = 'pendiente' | 'si' | 'no'

interface Draft {
  nombre: string
  alias: string
  categoria: CategoriaConjunto
  barrio: string
  instagram: string
  facebook: string
  verificado: boolean
  fuentes: string
  participa: boolean
  concurso: Contest
  llamadas: boolean
}

const emptyDraft: Draft = {
  nombre: '',
  alias: '',
  categoria: 'murga',
  barrio: '',
  instagram: '',
  facebook: '',
  verificado: false,
  fuentes: '',
  participa: false,
  concurso: 'pendiente',
  llamadas: false,
}

function toDraft(group: GroupRow, season: Season | undefined): Draft {
  const part = group.conjunto_temporada.find((p) => p.temporada_id === season?.id)
  return {
    nombre: group.nombre,
    alias: group.alias.join('\n'),
    categoria: group.categoria,
    barrio: group.barrio ?? '',
    instagram: group.instagram ?? '',
    facebook: group.facebook ?? '',
    verificado: group.verificado,
    fuentes: group.fuente_url.join('\n'),
    participa: Boolean(part),
    concurso: !part || part.en_concurso === null ? 'pendiente' : part.en_concurso ? 'si' : 'no',
    llamadas: part?.en_llamadas ?? false,
  }
}

export function GroupsPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  /** El id que se edita, 'new' para uno nuevo, o null. */
  const [selected, setSelected] = useState<number | 'new' | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const groups = useQuery({ queryKey: ['groups'], queryFn: api.fetchGroups })
  const seasons = useQuery({ queryKey: ['seasons'], queryFn: api.fetchSeasons })
  // La temporada que se está cargando: la última.
  const season = seasons.data?.[seasons.data.length - 1]

  const shown = useMemo(
    () => (groups.data ?? []).filter((g) => matchesSearch(search, g.nombre, g.alias)),
    [groups.data, search],
  )
  const current =
    typeof selected === 'number' ? groups.data?.find((g) => g.id === selected) : undefined

  const save = useMutation({
    mutationFn: async () => {
      const id = await api.saveGroup(current?.id ?? null, {
        slug: current?.slug ?? slugOf(draft.nombre),
        nombre: draft.nombre.trim(),
        alias: toLines(draft.alias),
        categoria: draft.categoria,
        barrio: orNull(draft.barrio),
        instagram: orNull(draft.instagram),
        facebook: orNull(draft.facebook),
        verificado: draft.verificado,
        fuente_url: toLines(draft.fuentes),
      })
      if (season) {
        const had = Boolean(current?.conjunto_temporada.some((p) => p.temporada_id === season.id))
        if (draft.participa) {
          await api.setParticipation(id, season.id, {
            en_concurso: draft.concurso === 'pendiente' ? null : draft.concurso === 'si',
            en_llamadas: draft.llamadas,
          })
        } else if (had) {
          await api.setParticipation(id, season.id, null)
        }
      }
      return id
    },
    onSuccess: (id) => {
      setSelected(id)
      setMessage({ kind: 'ok', text: t('groups.saved') })
      void queryClient.invalidateQueries({ queryKey: ['groups'] })
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
    onError: (error) => setMessage({ kind: 'error', text: error.message }),
  })

  const open = (target: GroupRow | 'new') => {
    setMessage(null)
    setSelected(target === 'new' ? 'new' : target.id)
    setDraft(target === 'new' ? emptyDraft : toDraft(target, season))
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (draft.nombre.trim()) save.mutate()
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  return (
    <>
      <PageTitle title={t('groups.title')} intro={t('groups.intro')} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="space-y-3">
          <div className="flex gap-2">
            <input
              aria-label={t('groups.search')}
              placeholder={t('groups.search')}
              className={inputClass}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Button onClick={() => open('new')}>{t('groups.new')}</Button>
          </div>
          {groups.isError && <Notice kind="error">{t('groups.loadFailed')}</Notice>}
          {groups.data && (
            <p role="status" className="text-sm text-slate-600">
              {t('groups.count', { count: shown.length, total: groups.data.length })}
            </p>
          )}
          <ul className="max-h-[70vh] space-y-1 overflow-y-auto">
            {shown.map((group) => (
              <li key={group.id}>
                <button
                  type="button"
                  aria-current={selected === group.id}
                  onClick={() => open(group)}
                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                    selected === group.id
                      ? 'border-slate-800 bg-white'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <span className="flex-1 font-medium">{group.nombre}</span>
                  <span className="text-xs text-slate-500">{t(`category.${group.categoria}`)}</span>
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
              {current ? current.nombre : t('groups.newTitle')}
            </h2>
            {message && <Notice kind={message.kind}>{message.text}</Notice>}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('groups.field.name')}>
                <input
                  required
                  className={inputClass}
                  value={draft.nombre}
                  onChange={(event) => set('nombre', event.target.value)}
                />
              </Field>
              <Field label={t('groups.field.category')}>
                <select
                  className={inputClass}
                  value={draft.categoria}
                  onChange={(event) => set('categoria', event.target.value as CategoriaConjunto)}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(`category.${category}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('groups.field.alias')} hint={t('groups.field.aliasHint')}>
                <textarea
                  className={`${inputClass} h-24`}
                  value={draft.alias}
                  onChange={(event) => set('alias', event.target.value)}
                />
              </Field>
              <Field label={t('groups.field.sources')} hint={t('groups.field.sourcesHint')}>
                <textarea
                  className={`${inputClass} h-24`}
                  value={draft.fuentes}
                  onChange={(event) => set('fuentes', event.target.value)}
                />
              </Field>
              <Field label={t('groups.field.neighborhood')}>
                <input
                  className={inputClass}
                  value={draft.barrio}
                  onChange={(event) => set('barrio', event.target.value)}
                />
              </Field>
              <Field label={t('groups.field.instagram')}>
                <input
                  className={inputClass}
                  value={draft.instagram}
                  onChange={(event) => set('instagram', event.target.value)}
                />
              </Field>
              <Field label={t('groups.field.facebook')}>
                <input
                  className={inputClass}
                  value={draft.facebook}
                  onChange={(event) => set('facebook', event.target.value)}
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.verificado}
                  onChange={(event) => set('verificado', event.target.checked)}
                />
                {t('groups.field.verified')}
              </label>
            </div>

            {season && (
              <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-sm font-medium">
                  {t('groups.season', { anio: season.anio })}
                </legend>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.participa}
                    onChange={(event) => set('participa', event.target.checked)}
                  />
                  {t('groups.participates', { anio: season.anio })}
                </label>
                {draft.participa && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t('groups.contest')}>
                      <select
                        className={inputClass}
                        value={draft.concurso}
                        onChange={(event) => set('concurso', event.target.value as Contest)}
                      >
                        <option value="pendiente">{t('groups.contestPending')}</option>
                        <option value="si">{t('groups.contestYes')}</option>
                        <option value="no">{t('groups.contestNo')}</option>
                      </select>
                    </Field>
                    <label className="flex items-center gap-2 self-end pb-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.llamadas}
                        onChange={(event) => set('llamadas', event.target.checked)}
                      />
                      {t('groups.parade')}
                    </label>
                  </div>
                )}
              </fieldset>
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
