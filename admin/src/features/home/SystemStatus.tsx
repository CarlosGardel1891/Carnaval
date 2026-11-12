import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import * as api from '../../lib/api'
import { Notice } from '../../components/ui'

/** Cada cuánto se vuelve a mirar, con el panel abierto. */
const REFRESH_MS = 60_000

/**
 * Si las tareas programadas vienen corriendo (decisión 89): los avisos de cambios, el aviso del
 * día y la purga de usuarios anónimos. En el Supabase local no hay tareas programadas, así que
 * ahí siempre figuran sin correr.
 */
export function SystemStatus() {
  const { t } = useTranslation()
  const status = useQuery({
    queryKey: ['systemStatus'],
    queryFn: api.fetchSystemStatus,
    refetchInterval: REFRESH_MS,
  })

  if (status.isError) return <Notice kind="error">{t('home.status.loadFailed')}</Notice>
  if (!status.data || status.data.length === 0) return null

  const down = status.data.filter((task) => !task.al_dia)
  const dryRun = status.data.some((task) => task.detalle?.simulacro === true)

  return (
    <section
      aria-labelledby="system-status"
      className="mb-6 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h2 id="system-status" className="font-medium">
        {t('home.status.title')}
      </h2>
      {down.length === 0 ? (
        <p role="status" className="mt-1 text-sm text-emerald-700">
          {t('home.status.allGood')}
        </p>
      ) : (
        <p role="alert" className="mt-1 text-sm font-medium text-red-700">
          {t('home.status.down', { count: down.length })}
        </p>
      )}
      <ul className="mt-2 space-y-1 text-sm">
        {status.data.map((task) => (
          <li key={task.tarea} className="flex flex-wrap gap-x-2">
            <span className={task.al_dia ? 'text-emerald-700' : 'text-red-700'} aria-hidden="true">
              {task.al_dia ? '●' : '○'}
            </span>
            <span className="font-medium">{t(`home.status.task.${task.tarea}`, task.tarea)}</span>
            <span className="text-slate-600">
              {task.minutos === null
                ? t('home.status.never')
                : t('home.status.ago', { count: task.minutos })}
            </span>
          </li>
        ))}
      </ul>
      {dryRun && <p className="mt-2 text-sm text-slate-600">{t('home.status.dryRun')}</p>}
      {down.length > 0 && <p className="mt-2 text-sm text-slate-600">{t('home.status.help')}</p>}
    </section>
  )
}
