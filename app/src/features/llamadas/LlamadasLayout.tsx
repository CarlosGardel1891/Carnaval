import { useTranslation } from 'react-i18next'
import { NavLink, Outlet, useSearchParams } from 'react-router'
import { Button } from '../../components/Button'
import { formatNight } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { useNow } from '../../lib/useNow'
import { UpdatedLine } from '../today/UpdatedLine'
import type { LlamadasContext } from './llamadasContext'
import { useLlamadas } from './useLlamadas'

const VIEWS = [
  { to: '/llamadas', key: 'order' },
  { to: '/llamadas/cuadra', key: 'block' },
  { to: '/llamadas/recorrido', key: 'route' },
  { to: '/llamadas/glosario', key: 'glossary' },
] as const

const chip = (active: boolean) =>
  `inline-flex min-h-12 shrink-0 items-center rounded-full border px-4 font-semibold whitespace-nowrap ${
    active ? 'bg-accent text-accent-ink border-accent' : 'bg-surface text-ink border-line'
  }`

/**
 * El marco del modo Llamadas: el título, el selector de noche y las cuatro vistas (orden,
 * por cuadra, recorrido y glosario). La noche elegida va en la URL (`?noche=`) y se
 * conserva al cambiar de vista.
 */
export function LlamadasLayout() {
  const { t } = useTranslation()
  const locale = useLocale()
  const now = useNow()
  const [params] = useSearchParams()
  const { today, nights, night, isPending, isError, updatedAt, stale, retry } = useLlamadas()
  const search = params.get('noche') ? `?noche=${params.get('noche')}` : ''

  return (
    <main className="mx-auto max-w-2xl px-4 pb-6">
      <header className="pt-4 pb-2">
        <h1 className="text-3xl font-bold">{t('llamadas.title')}</h1>
        {night && (
          <p className="text-soft text-lg first-letter:uppercase">
            {formatNight(night.fecha_inicio, locale)}
          </p>
        )}
      </header>

      <nav aria-label={t('llamadas.views')} className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1">
        {VIEWS.map((view) => (
          <NavLink
            key={view.key}
            to={{ pathname: view.to, search }}
            end
            replace
            className={({ isActive }) => chip(isActive)}
          >
            {t(`llamadas.view.${view.key}`)}
          </NavLink>
        ))}
      </nav>

      {isError ? (
        <div role="alert" className="space-y-3 py-4">
          <p className="text-lg">{t('llamadas.error')}</p>
          <Button onClick={retry}>{t('today.retry')}</Button>
        </div>
      ) : isPending ? (
        <p className="text-soft py-4">{t('llamadas.loading')}</p>
      ) : !night ? (
        <p className="py-4 text-lg">{t('llamadas.noNights')}</p>
      ) : (
        <>
          <div
            role="group"
            aria-label={t('llamadas.nights')}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-3 pb-1"
          >
            {nights.map((option, i) => (
              <NavLink
                key={option.id}
                to={{ search: `?noche=${option.fecha_inicio}` }}
                replace
                aria-current={option.id === night.id ? 'true' : undefined}
                className={() => chip(option.id === night.id)}
              >
                {t('llamadas.night', { number: i + 1 })}
                {option.fecha_inicio === today && ` · ${t('calendar.today')}`}
              </NavLink>
            ))}
          </div>
          <UpdatedLine
            updatedAt={updatedAt}
            now={now}
            isFetching={false}
            failed={stale}
            onRefresh={retry}
          />
          <Outlet context={{ night, today } satisfies LlamadasContext} />
        </>
      )}
    </main>
  )
}
