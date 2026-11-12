import { useInfiniteQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, inputClass, Notice, PageTitle } from '../../components/ui'
import * as api from '../../lib/api'
import { formatDateTime, isIsoDate } from '../../lib/format'
import { changedFields, rowLabel, showValue } from './describe'

// Las tablas que llevan registro, en el orden en que se cargan.
const TABLES = [
  'actuaciones',
  'conjuntos',
  'conjunto_temporada',
  'escenarios',
  'eventos',
  'etapas_concurso',
  'orden_desfile',
  'desfile_esquinas',
  'cortes_calle',
  'temporadas',
]

const operationStyles = {
  alta: 'bg-emerald-100 text-emerald-900',
  cambio: 'bg-amber-100 text-amber-900',
  baja: 'bg-red-100 text-red-900',
}

/** Quién cambió qué y cuándo (decisión 73). Sólo se lee: lo escribe un trigger en la base. */
export function LogPage() {
  const { t } = useTranslation()
  const [tabla, setTabla] = useState('')
  const [noche, setNoche] = useState('')
  const [email, setEmail] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  const filter = {
    ...(tabla ? { tabla } : {}),
    ...(isIsoDate(noche) ? { noche } : {}),
    ...(email.trim() ? { email: email.trim() } : {}),
  }

  const log = useInfiniteQuery({
    queryKey: ['log', filter],
    queryFn: ({ pageParam }) =>
      api.fetchChangeLog({ ...filter, ...(pageParam ? { beforeId: pageParam } : {}) }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.length === api.LOG_PAGE_SIZE ? last[last.length - 1]!.id : undefined,
  })
  const entries = log.data?.pages.flat() ?? []

  return (
    <>
      <PageTitle title={t('log.title')} intro={t('log.intro')} />

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <Field label={t('log.filter.table')}>
          <select className={inputClass} value={tabla} onChange={(e) => setTabla(e.target.value)}>
            <option value="">{t('log.filter.all')}</option>
            {TABLES.map((name) => (
              <option key={name} value={name}>
                {t(`log.tables.${name}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('log.filter.night')} hint={t('log.filter.nightHint')}>
          <input
            type="date"
            className={inputClass}
            value={noche}
            onChange={(e) => setNoche(e.target.value)}
          />
        </Field>
        <Field label={t('log.filter.who')}>
          <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </section>

      {log.isError && <Notice kind="error">{t('log.loadFailed')}</Notice>}
      {log.isPending && <p className="text-sm text-slate-600">{t('app.loading')}</p>}
      {log.data && entries.length === 0 && <Notice>{t('log.empty')}</Notice>}

      <ul className="space-y-1">
        {entries.map((entry) => {
          const changes = changedFields(entry)
          const row = entry.despues ?? entry.antes ?? {}
          return (
            <li
              key={entry.id}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-mono text-xs text-slate-500">
                  {formatDateTime(entry.hecho_en)}
                </span>
                <span className={`rounded px-2 py-0.5 text-xs ${operationStyles[entry.operacion]}`}>
                  {t(`log.operation.${entry.operacion}`)}
                </span>
                <span className="font-medium">
                  {t(`log.tables.${entry.tabla}`, { defaultValue: entry.tabla })} ·{' '}
                  {rowLabel(entry)}
                </span>
                <span className="flex-1 text-right text-slate-600">
                  {entry.usuario_email ?? t('log.system')}
                </span>
              </div>
              {changes.length > 0 && (
                <ul className="mt-1 space-y-0.5 text-xs text-slate-700">
                  {changes.map((change) => (
                    <li key={change.field}>
                      <span className="font-mono">{change.field}</span>: {change.before} →{' '}
                      <span className="font-medium">{change.after}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                className="mt-1 text-xs text-slate-600 underline"
                onClick={() => setOpen(open === entry.id ? null : entry.id)}
              >
                {open === entry.id ? t('log.hideRow') : t('log.showRow')}
              </button>
              {open === entry.id && (
                <dl className="mt-1 grid gap-x-3 gap-y-0.5 text-xs sm:grid-cols-[12rem_1fr]">
                  {Object.keys(row)
                    .sort()
                    .map((field) => (
                      <div key={field} className="contents">
                        <dt className="font-mono text-slate-500">{field}</dt>
                        <dd className="break-all">{showValue(row[field])}</dd>
                      </div>
                    ))}
                </dl>
              )}
            </li>
          )
        })}
      </ul>

      {log.hasNextPage && (
        <Button
          variant="secondary"
          disabled={log.isFetchingNextPage}
          onClick={() => void log.fetchNextPage()}
        >
          {t('log.more')}
        </Button>
      )}
    </>
  )
}
