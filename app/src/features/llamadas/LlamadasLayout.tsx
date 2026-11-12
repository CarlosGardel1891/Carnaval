import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation, useSearchParams } from 'react-router'
import { paradeRules } from '@cuerda/shared'
import { MapPinIcon } from '../../components/ui/icons'
import { DrumArt, OfflineArt } from '../../components/ui/illustrations'
import { Card, EmptyState, PrimaryButton } from '../../components/ui/primitives'
import { CompactTitle } from '../../components/ui/scroll'
import { TabHeader } from '../../components/ui/TabHeader'
import type { ParadeEvent } from '../../lib/api'
import { formatNight } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { useNow } from '../../lib/useNow'
import { UpdatedLine } from '../today/UpdatedLine'
import type { LlamadasContext } from './llamadasContext'
import { useLlamadasSearch } from './llamadasSearch'
import { blocksOf } from './parade'
import { paradeRouteQuery, useLlamadas } from './useLlamadas'

const VIEWS = [
  { to: '/llamadas', key: 'order' },
  { to: '/llamadas/cuadra', key: 'block' },
  { to: '/llamadas/recorrido', key: 'route' },
  { to: '/llamadas/glosario', key: 'glossary' },
] as const

const chip = (active: boolean) =>
  `pressable flex min-h-11 items-center justify-center rounded-full border px-1.5 text-center text-[0.875rem] leading-tight font-bold ${
    active ? 'bg-brand border-brand shadow-button text-white' : 'bg-surface text-ink border-line'
  }`

const segment = (active: boolean) =>
  `flex min-h-11 items-center justify-center rounded-xl px-3 text-center text-[0.9375rem] font-bold ${
    active ? 'text-brand bg-white shadow-[0_1px_3px_rgb(15_23_42/0.14)]' : 'text-white'
  }`

/**
 * «Tu cuadra», montada sobre el borde del encabezado: la cuadra elegida (`?cuadra=`) y el
 * enlace para cambiarla. Con una cuadra elegida, el orden dice a qué hora pasa cada comparsa.
 */
function YourBlock({ night }: { night: ParadeEvent }) {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const search = useLlamadasSearch()
  const route = useQuery(paradeRouteQuery(night.id))
  const block =
    blocksOf(route.data ?? []).find((b) => String(b.number) === params.get('cuadra')) ?? null
  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        aria-hidden="true"
        className="bg-brand-soft text-brand inline-flex size-11 shrink-0 items-center justify-center rounded-full"
      >
        <MapPinIcon className="size-5.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-soft text-[0.6875rem] font-extrabold tracking-[0.08em] uppercase">
          {t('llamadas.yourBlock')}
        </p>
        <p className={`leading-snug ${block ? 'text-[1.0625rem] font-bold' : 'text-soft text-sm'}`}>
          {block
            ? t('llamadas.block.name', { street: block.street, from: block.from, to: block.to })
            : t('llamadas.yourBlockHint')}
        </p>
      </div>
      <Link
        to={{ pathname: '/llamadas/cuadra', search }}
        className="text-accent -my-1 inline-flex min-h-11 shrink-0 items-center text-[0.9375rem] font-bold"
      >
        {block ? t('llamadas.change') : t('llamadas.chooseBlock')}
      </Link>
    </Card>
  )
}

/**
 * El marco del modo Llamadas (decisión 92): el encabezado con el tambor y las dos noches en
 * un segmentado, «Tu cuadra» y las cuatro vistas (orden, por cuadra, recorrido y glosario).
 * La noche y la cuadra elegidas van en la URL y se conservan al cambiar de vista.
 */
export function LlamadasLayout() {
  const { t } = useTranslation()
  const locale = useLocale()
  const now = useNow()
  const [params] = useSearchParams()
  const { today, nights, night, isPending, isError, updatedAt, stale, retry } = useLlamadas()
  const search = useLlamadasSearch()
  const { pathname } = useLocation()
  // El glosario son textos de la app: no depende de que haya datos del desfile, ni de la red.
  const glossary = pathname === '/llamadas/glosario'
  const ready = !isError && !isPending && Boolean(night)
  const onOrder = pathname.replace(/\/$/, '') === '/llamadas'
  const showBlock = ready && onOrder

  return (
    <main className="mx-auto max-w-2xl pb-6">
      <CompactTitle title={t('llamadas.title')} />
      <TabHeader
        title={t('llamadas.title')}
        art={<DrumArt />}
        overlap={showBlock}
        subtitle={
          night && (
            <>
              <span>{formatNight(night.fecha_inicio, locale)}</span>
              {' · '}
              {t('llamadas.fromTime', { time: paradeRules(night).start.slice(0, 5) })}
            </>
          )
        }
      >
        {ready && night && nights.length > 1 && (
          <div
            role="group"
            aria-label={t('llamadas.nights')}
            className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl bg-white/20 p-1"
          >
            {nights.map((option, i) => {
              const next = new URLSearchParams(params)
              next.set('noche', option.fecha_inicio)
              return (
                <NavLink
                  key={option.id}
                  to={{ search: `?${next.toString()}` }}
                  replace
                  aria-current={option.id === night.id ? 'true' : undefined}
                  className={() => segment(option.id === night.id)}
                >
                  {t('llamadas.night', { number: i + 1 })}
                  {option.fecha_inicio === today && ` · ${t('calendar.today')}`}
                </NavLink>
              )
            })}
          </div>
        )}
      </TabHeader>

      <div className="px-4">
        {showBlock && night && (
          <div className="relative z-10 -mt-11">
            <YourBlock night={night} />
          </div>
        )}

        <nav
          aria-label={t('llamadas.views')}
          // Las cuatro a la vista, sin scroll: en un teléfono angosto el texto baja a dos líneas.
          className="grid grid-cols-4 gap-1.5 py-4"
        >
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

        {glossary ? (
          <Outlet />
        ) : isError ? (
          <div role="alert">
            <EmptyState
              illustration={<OfflineArt />}
              title={t('llamadas.error')}
              action={<PrimaryButton onClick={retry}>{t('today.retry')}</PrimaryButton>}
            />
          </div>
        ) : isPending ? (
          <p className="text-soft py-6 text-center">{t('llamadas.loading')}</p>
        ) : !night ? (
          <EmptyState illustration={<OfflineArt />}>{t('llamadas.noNights')}</EmptyState>
        ) : (
          <>
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
      </div>
    </main>
  )
}
