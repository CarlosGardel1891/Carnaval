import { nocheLogica } from '@cuerda/shared'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button, Field, inputClass, Notice, PageTitle } from '../../components/ui'
import * as api from '../../lib/api'
import { formatNight, formatTime, isIsoDate } from '../../lib/format'
import {
  emptyDecisions,
  nameKey,
  review,
  stopOf,
  toPublishRequest,
  toRows,
  unmatched,
  type Choice,
  type Decisions,
  type LineStatus,
  type ReviewedLine,
} from './importState'
import { NameResolver } from './NameResolver'
import {
  CSV_TEMPLATE,
  CsvHeaderError,
  parseGridCsv,
  parseGridText,
  type ParseResult,
} from './parser'

const statusStyles: Record<LineStatus, string> = {
  nueva: 'bg-emerald-100 text-emerald-900',
  cambia: 'bg-amber-100 text-amber-900',
  igual: 'bg-slate-100 text-slate-700',
  sin_coincidencia: 'bg-red-100 text-red-900',
  duplicada: 'bg-red-100 text-red-900',
}

type LeftoverAction = 'dejar' | 'suspender' | 'borrar'

const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE)}`

export function ImportPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [noche, setNoche] = useState(() => nocheLogica(new Date()))
  const [fuente, setFuente] = useState('')
  const [fuenteUrl, setFuenteUrl] = useState('')
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [readError, setReadError] = useState<'empty' | 'csvHeader' | null>(null)
  const [decisions, setDecisions] = useState<Decisions>(emptyDecisions)
  const [leftoverActions, setLeftoverActions] = useState<Record<number, LeftoverAction>>({})
  const [published, setPublished] = useState<api.PublishSummary | null>(null)

  const lines = useMemo(() => parsed?.lines ?? [], [parsed])
  const rows = useMemo(() => toRows(lines, decisions), [lines, decisions])
  const nightOk = isIsoDate(noche)
  const ready = rows.length > 0 && nightOk && !published

  const catalog = useQuery({ queryKey: ['catalog'], queryFn: api.fetchCatalog })
  const seasons = useQuery({ queryKey: ['seasons'], queryFn: api.fetchSeasons })
  const preview = useQuery({
    queryKey: ['import-preview', noche, rows],
    queryFn: () => api.previewGrid(noche, rows),
    enabled: ready,
    placeholderData: keepPreviousData,
  })
  const leftovers = useQuery({
    queryKey: ['import-leftovers', noche, rows],
    queryFn: () => api.fetchLeftovers(noche, rows),
    enabled: ready,
    placeholderData: keepPreviousData,
  })

  const reviewed = useMemo(
    () => review(lines, decisions, preview.data),
    [lines, decisions, preview.data],
  )
  const pending = useMemo(
    () => unmatched(lines, decisions, preview.data),
    [lines, decisions, preview.data],
  )

  const publish = useMutation({
    mutationFn: () =>
      api.publishGrid(
        toPublishRequest(lines, decisions, {
          noche,
          fuente: fuente.trim(),
          fuenteUrl: fuenteUrl.trim(),
          leftovers: Object.entries(leftoverActions)
            .filter(([, action]) => action !== 'dejar')
            .map(([id, action]) => ({ id: Number(id), accion: action as 'suspender' | 'borrar' })),
        }),
      ),
    onSuccess: (summary) => {
      setPublished(summary)
      void queryClient.invalidateQueries()
    },
  })

  const reset = (next: ParseResult | null) => {
    setParsed(next)
    setDecisions(emptyDecisions)
    setLeftoverActions({})
    setPublished(null)
    publish.reset()
  }

  const read = (result: ParseResult) => {
    setReadError(result.lines.length === 0 && result.unread.length === 0 ? 'empty' : null)
    reset(result)
  }

  const onReadText = () => read(parseGridText(text))

  const onCsvFile = async (file: File | undefined) => {
    if (!file) return
    try {
      read(parseGridCsv(await file.text()))
    } catch (cause) {
      if (!(cause instanceof CsvHeaderError)) throw cause
      reset(null)
      setReadError('csvHeader')
    }
  }

  const setChoice = (kind: 'stages' | 'groups', key: string, choice: Choice | undefined) =>
    setDecisions((prev) => {
      const next = { ...prev[kind] }
      if (choice) next[key] = choice
      else delete next[key]
      return { ...prev, [kind]: next }
    })

  const toggleExcluded = (n: number) =>
    setDecisions((prev) => ({
      ...prev,
      excluded: prev.excluded.includes(n)
        ? prev.excluded.filter((x) => x !== n)
        : [...prev.excluded, n],
    }))

  const counts = useMemo(() => {
    const total: Record<LineStatus, number> = {
      nueva: 0,
      cambia: 0,
      igual: 0,
      sin_coincidencia: 0,
      duplicada: 0,
    }
    for (const item of reviewed) total[item.status] += 1
    return total
  }, [reviewed])

  const inSeason =
    !seasons.data || seasons.data.some((s) => s.fecha_inicio <= noche && noche <= s.fecha_fin)
  const otherDates = (parsed?.dates ?? []).filter((date) => date !== noche)
  const emptyNames = [...Object.values(decisions.stages), ...Object.values(decisions.groups)].some(
    (choice) => choice.kind !== 'existing' && !choice.nombre.trim(),
  )
  const blocked =
    !fuente.trim() ||
    !preview.data ||
    preview.isFetching ||
    counts.sin_coincidencia > 0 ||
    counts.duplicada > 0 ||
    emptyNames

  const groupsByStage = useMemo(() => {
    const groups: { key: string; items: ReviewedLine[] }[] = []
    for (const item of reviewed) {
      const key = nameKey(item.line.escenario)
      const last = groups[groups.length - 1]
      if (last?.key === key) last.items.push(item)
      else groups.push({ key, items: [item] })
    }
    return groups
  }, [reviewed])

  const excludedLines = lines.filter((line) => decisions.excluded.includes(line.n))

  return (
    <>
      <PageTitle title={t('import.title')} intro={t('import.intro')} />

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('import.night')} hint={nightOk ? formatNight(noche) : undefined}>
            <input
              type="date"
              className={inputClass}
              value={noche}
              onChange={(event) => setNoche(event.target.value)}
            />
          </Field>
          <Field label={t('import.source')} hint={t('import.sourceHint')}>
            <input
              className={inputClass}
              value={fuente}
              onChange={(event) => setFuente(event.target.value)}
            />
          </Field>
          <Field label={t('import.sourceUrl')}>
            <input
              type="url"
              className={inputClass}
              value={fuenteUrl}
              onChange={(event) => setFuenteUrl(event.target.value)}
            />
          </Field>
        </div>

        <Field label={t('import.text')} hint={t('import.textHint')}>
          <textarea
            className={`${inputClass} h-56 font-mono`}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onReadText} disabled={!text.trim()}>
            {t('import.read')}
          </Button>
          <label className="text-sm text-slate-700">
            {t('import.csv')}{' '}
            <input
              type="file"
              accept=".csv,text/csv"
              className="text-sm"
              onChange={(event) => {
                void onCsvFile(event.target.files?.[0])
                event.target.value = ''
              }}
            />
          </label>
          <a href={templateHref} download="grilla.csv" className="text-sm text-slate-700 underline">
            {t('import.template')}
          </a>
        </div>
        {readError && <Notice kind="error">{t(`import.readError.${readError}`)}</Notice>}
      </section>

      {published && (
        <section className="space-y-3">
          <Notice kind="ok">
            {t('import.published', { ...published, noche: formatNight(noche) })}
          </Notice>
          {(published.conjuntos_creados > 0 ||
            published.escenarios_creados > 0 ||
            published.alias_agregados > 0) && (
            <Notice>{t('import.publishedCatalog', { ...published })}</Notice>
          )}
          <div className="flex flex-wrap gap-3">
            <Link to={`/grilla?noche=${noche}`} className="text-sm underline">
              {t('import.seeNight')}
            </Link>
            <Button variant="secondary" onClick={() => reset(null)}>
              {t('import.another')}
            </Button>
          </div>
        </section>
      )}

      {parsed && !published && (
        <>
          {parsed.unread.length > 0 && (
            <section className="space-y-2">
              <Notice kind="warn">
                {t('import.unread.title', { count: parsed.unread.length })}
              </Notice>
              <ul className="space-y-1 text-sm">
                {parsed.unread.map((item) => (
                  <li key={item.sourceLine} className="rounded-lg bg-white px-3 py-1.5">
                    <span className="text-slate-500">
                      {t('import.unread.line', { line: item.sourceLine })}
                    </span>{' '}
                    <span className="font-mono">{item.text}</span>{' '}
                    <span className="text-slate-600">
                      · {t(`import.unread.reason.${item.reason}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {lines.length > 0 && !nightOk && <Notice kind="error">{t('import.nightMissing')}</Notice>}
          {lines.length > 0 && nightOk && !inSeason && (
            <Notice kind="warn">{t('import.outOfSeason', { noche: formatNight(noche) })}</Notice>
          )}
          {otherDates.length > 0 && (
            <Notice kind="warn">
              {t('import.otherDates', { dates: otherDates.join(', '), noche })}
            </Notice>
          )}
          {preview.isError && <Notice kind="error">{t('import.previewFailed')}</Notice>}

          {(pending.stages.length > 0 || pending.groups.length > 0) && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t('import.unmatched.title')}</h2>
              <p className="text-sm text-slate-600">{t('import.unmatched.intro')}</p>
              {pending.stages.map((item) => (
                <NameResolver
                  key={`stage-${item.key}`}
                  kind="stage"
                  item={item}
                  choice={decisions.stages[item.key]}
                  options={catalog.data?.stages ?? []}
                  hasStop={lines.some((l) => nameKey(l.escenario) === item.key && l.direccion)}
                  onChange={(choice) => setChoice('stages', item.key, choice)}
                />
              ))}
              {pending.groups.map((item) => (
                <NameResolver
                  key={`group-${item.key}`}
                  kind="group"
                  item={item}
                  choice={decisions.groups[item.key]}
                  options={catalog.data?.groups ?? []}
                  onChange={(choice) => setChoice('groups', item.key, choice)}
                />
              ))}
            </section>
          )}

          {groupsByStage.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t('import.preview.title')}</h2>
              <p role="status" className="text-sm text-slate-700">
                {t('import.preview.summary', { ...counts, total: reviewed.length })}
              </p>
              {groupsByStage.map(({ key, items }) => {
                const first = items[0]!
                const showStop = first.itinerant || Boolean(first.line.direccion)
                const stop = stopOf(first.line, decisions)
                return (
                  <article
                    key={`${key}-${first.line.n}`}
                    className="rounded-xl border border-slate-200 bg-white"
                  >
                    <header className="space-y-2 border-b border-slate-200 px-4 py-3">
                      <h3 className="font-semibold">
                        {first.line.escenario}
                        {first.stageName && nameKey(first.stageName) !== key && (
                          <span className="font-normal text-slate-600"> → {first.stageName}</span>
                        )}
                        {first.stageMissing && (
                          <span className="ml-2 rounded bg-red-100 px-2 py-0.5 text-xs font-normal text-red-900">
                            {t('import.preview.stageMissing')}
                          </span>
                        )}
                      </h3>
                      {showStop && (
                        <Field
                          label={t('import.preview.stop', { name: first.line.escenario })}
                          hint={!stop.trim() ? t('import.preview.stopMissing') : undefined}
                        >
                          <input
                            className={inputClass}
                            value={stop}
                            onChange={(event) =>
                              setDecisions((prev) => ({
                                ...prev,
                                stops: { ...prev.stops, [key]: event.target.value },
                              }))
                            }
                          />
                        </Field>
                      )}
                    </header>
                    <table className="w-full text-sm">
                      <tbody>
                        {items.map((item) => (
                          <tr key={item.line.n} className="border-b border-slate-100 last:border-0">
                            <td className="w-16 px-4 py-2 font-mono">{item.line.hora}</td>
                            <td className="px-2 py-2">
                              {item.line.conjunto}
                              {item.groupName &&
                                nameKey(item.groupName) !== nameKey(item.line.conjunto) && (
                                  <span className="text-slate-600"> → {item.groupName}</span>
                                )}
                            </td>
                            <td className="px-2 py-2">
                              <span
                                className={`rounded px-2 py-0.5 text-xs ${statusStyles[item.status]}`}
                              >
                                {t(`import.status.${item.status}`)}
                              </span>
                              {item.status === 'cambia' && item.preview?.inicio_actual && (
                                <span className="ml-2 text-xs text-slate-600">
                                  {t('import.preview.was', {
                                    hora: formatTime(item.preview.inicio_actual),
                                  })}
                                </span>
                              )}
                              {item.preview?.estado_actual === 'suspendida' && (
                                <span className="ml-2 text-xs text-slate-600">
                                  {t('import.preview.suspended')}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                className="text-xs text-slate-600 underline"
                                onClick={() => toggleExcluded(item.line.n)}
                              >
                                {t('import.preview.exclude', {
                                  hora: item.line.hora,
                                  conjunto: item.line.conjunto,
                                })}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </article>
                )
              })}
            </section>
          )}

          {excludedLines.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">{t('import.excluded.title')}</h2>
              <ul className="space-y-1 text-sm">
                {excludedLines.map((line) => (
                  <li
                    key={line.n}
                    className="flex items-center gap-3 rounded-lg bg-white px-3 py-1.5"
                  >
                    <span className="flex-1">
                      {line.escenario} · {line.hora} · {line.conjunto}
                    </span>
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() => toggleExcluded(line.n)}
                    >
                      {t('import.excluded.restore', { hora: line.hora, conjunto: line.conjunto })}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(leftovers.data?.length ?? 0) > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold">{t('import.leftovers.title')}</h2>
              <p className="text-sm text-slate-600">{t('import.leftovers.intro')}</p>
              <ul className="space-y-1 text-sm">
                {leftovers.data!.map((item) => (
                  <li
                    key={item.actuacion_id}
                    className="flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-1.5"
                  >
                    <span className="flex-1">
                      {item.escenario_nombre} · {formatTime(item.inicio)} · {item.conjunto_nombre}
                      {item.estado === 'suspendida' && ` · ${t('status.suspendida')}`}
                    </span>
                    <select
                      aria-label={t('import.leftovers.action', {
                        conjunto: item.conjunto_nombre,
                        escenario: item.escenario_nombre,
                      })}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
                      value={leftoverActions[item.actuacion_id] ?? 'dejar'}
                      onChange={(event) =>
                        setLeftoverActions((prev) => ({
                          ...prev,
                          [item.actuacion_id]: event.target.value as LeftoverAction,
                        }))
                      }
                    >
                      <option value="dejar">{t('import.leftovers.keep')}</option>
                      <option value="suspender">{t('import.leftovers.suspend')}</option>
                      <option value="borrar">{t('import.leftovers.delete')}</option>
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {lines.length > 0 && (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              {!fuente.trim() && <Notice kind="warn">{t('import.sourceMissing')}</Notice>}
              {(counts.sin_coincidencia > 0 || counts.duplicada > 0) && (
                <Notice kind="warn">{t('import.blocked', { ...counts })}</Notice>
              )}
              {counts.cambia > 0 && (
                <Notice>{t('import.willNotify', { count: counts.cambia })}</Notice>
              )}
              {publish.isError && (
                <Notice kind="error">
                  {t('import.publishFailed', { message: publish.error.message })}
                </Notice>
              )}
              <Button onClick={() => publish.mutate()} disabled={blocked || publish.isPending}>
                {publish.isPending ? t('import.publishing') : t('import.publish')}
              </Button>
            </section>
          )}
        </>
      )}
    </>
  )
}
