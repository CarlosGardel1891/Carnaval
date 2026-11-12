import { useId, useMemo, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { CategoriaConjunto } from '@cuerda/shared'
import { useLook } from '../../../design/looks'
import type { Act } from '../../../lib/api'
import { formatNight, formatTime } from '../../../lib/format'
import { joinParts, priceLabel } from '../../../lib/labels'
import { useLocale } from '../../../lib/useLocale'
import { groupPath } from '../../groups/groupPath'
import { useDistanceLabel } from '../../location/useDistanceLabel'
import { useStagePath } from '../../stages/stagePath'
import { groupByStage, sortByDistance, sortByFirstStart, type StageGroup } from '../board'
import type { BoardFilters, BoardView } from '../useBoardFilters'
import { HeaderDecor } from './HeaderDecor'

/**
 * La pantalla Hoy con el rediseño, para comparar las tres direcciones (decisión 91). Mismos
 * datos y mismas reglas que la de siempre: sólo cambia cómo se dibuja. Los colores salen de
 * `design/looks.css`, según la dirección elegida.
 */

const categoryColor = (category: CategoriaConjunto): CSSProperties => ({
  backgroundColor: `var(--cat-${category})`,
})

// ------------------------------------------------------------------ encabezado

interface FreshHeaderProps {
  noche: string
  isTonight: boolean
  view: BoardView
  onView: (view: BoardView) => void
  /** Sin grilla que mostrar, no hay nada que cambiar de vista. */
  showViews: boolean
}

export function FreshHeader({ noche, isTonight, view, onView, showViews }: FreshHeaderProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const look = useLook()
  return (
    <header
      className={`look-header -mt-[env(safe-area-inset-top)] px-4 pb-4 ${
        // La guirnalda cuelga arriba del todo: el título baja un poco para dejarle lugar.
        look === 'tablado'
          ? 'pt-[calc(env(safe-area-inset-top)+2.75rem)]'
          : 'pt-[calc(env(safe-area-inset-top)+0.75rem)]'
      }`}
    >
      {look && <HeaderDecor look={look} />}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold tracking-[0.14em] uppercase opacity-80">
            {t('app.name')}
          </p>
          <h1
            className="look-display text-[2.5rem] leading-[1.05] font-extrabold tracking-tight"
            style={{ color: 'var(--look-title)' }}
          >
            {isTonight ? t('today.title') : t('today.otherNight')}
          </h1>
          <p
            className="mt-1 text-[1.0625rem] font-medium first-letter:uppercase"
            style={{ color: 'var(--look-header-soft)' }}
          >
            {formatNight(noche, locale)}
          </p>
        </div>
        <Link
          to="/acerca"
          aria-label={t('about.open')}
          className="-mr-2 flex size-11 shrink-0 items-center justify-center rounded-full"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 11v5.5M12 7.5v.5" />
          </svg>
        </Link>
      </div>
      {!isTonight && (
        <Link to="/" className="relative mt-1 inline-flex min-h-11 items-center font-semibold">
          ‹ {t('today.backToTonight')}
        </Link>
      )}
      {showViews && (
        <div
          role="group"
          aria-label={t('filters.view')}
          className="look-seg relative mt-4 grid grid-cols-2 text-[0.9375rem] font-semibold"
        >
          <button type="button" aria-pressed={view === 'stage'} onClick={() => onView('stage')}>
            {t('filters.byStage')}
          </button>
          <button type="button" aria-pressed={view === 'time'} onClick={() => onView('time')}>
            {t('filters.byTime')}
          </button>
        </div>
      )}
    </header>
  )
}

// ------------------------------------------------------------------ filtros

interface FreshFiltersProps {
  filters: BoardFilters
  categories: CategoriaConjunto[]
  locating: boolean
  onToggleNearby: () => void
  onToggleFree: () => void
  onToggleMine: () => void
  onToggleCategory: (category: CategoriaConjunto) => void
}

function FilterChip({
  pressed,
  onClick,
  disabled = false,
  children,
}: {
  pressed: boolean
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="look-chip inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-[0.9375rem] font-semibold whitespace-nowrap disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export function FreshFilters({
  filters,
  categories,
  locating,
  onToggleNearby,
  onToggleFree,
  onToggleMine,
  onToggleCategory,
}: FreshFiltersProps) {
  const { t } = useTranslation()
  return (
    <div
      role="group"
      aria-label={t('filters.label')}
      className="flex gap-2 overflow-x-auto px-4 pt-3 pb-2 [scrollbar-width:none]"
    >
      <FilterChip pressed={filters.nearby} disabled={locating} onClick={onToggleNearby}>
        <svg
          viewBox="0 0 24 24"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 3 3 10.5l7.5 3L13.5 21 21 3Z" />
        </svg>
        {t('nearby.label')}
      </FilterChip>
      <FilterChip pressed={filters.onlyFree} onClick={onToggleFree}>
        {t('filters.free')}
      </FilterChip>
      <FilterChip pressed={filters.mine} onClick={onToggleMine}>
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
          <path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10Z" />
        </svg>
        {t('filters.mine')}
      </FilterChip>
      {categories.map((category) => (
        <FilterChip
          key={category}
          pressed={filters.categories.includes(category)}
          onClick={() => onToggleCategory(category)}
        >
          <span className="size-2.5 rounded-full" style={categoryColor(category)} />
          {t(`category.${category}`)}
        </FilterChip>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ pizarrón

interface FreshRowProps {
  act: Act
  onStage: boolean
  showStage?: boolean
  showDistance?: boolean
}

function FreshRow({ act, onStage, showStage = false, showDistance = false }: FreshRowProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const distanceLabel = useDistanceLabel()
  const stagePath = useStagePath()
  const suspended = act.estado === 'suspendida'

  const details = joinParts([
    t(`category.${act.conjunto_categoria}`),
    act.etapa_rueda && t(`round.${act.etapa_rueda}`),
    act.itinerante === true && act.direccion,
    showDistance && act.distancia_m !== null && distanceLabel(act.distancia_m),
  ])

  return (
    <li className={`relative flex gap-3 px-4 py-3 ${onStage ? 'look-live-row' : ''}`}>
      <time
        dateTime={act.inicio}
        className={`w-[4.25rem] shrink-0 pt-px text-[1.0625rem] font-bold tabular-nums ${
          suspended ? 'text-soft line-through' : ''
        }`}
      >
        {formatTime(act.inicio, locale)}
      </time>
      <div className="min-w-0 flex-1">
        <p className="text-[1.0625rem] leading-snug font-semibold">
          {/* Toda la fila lleva a la ficha del conjunto. */}
          <Link to={groupPath(act.conjunto_slug)} className="after:absolute after:inset-0">
            {suspended ? <s className="text-soft">{act.conjunto_nombre}</s> : act.conjunto_nombre}
          </Link>
        </p>
        <p className="text-soft mt-0.5 flex items-center gap-1.5 text-sm">
          <span
            className="size-2 shrink-0 rounded-full"
            style={categoryColor(act.conjunto_categoria)}
            aria-hidden="true"
          />
          <span className="min-w-0">{details}</span>
        </p>
        {showStage && (
          <p className="mt-0.5 text-sm">
            <Link
              to={stagePath(act.escenario_slug)}
              className="text-accent relative z-10 inline-flex min-h-6 items-center font-semibold"
            >
              {act.escenario_nombre}
            </Link>
          </p>
        )}
        {(onStage || act.estado !== 'programada') && (
          <p className="mt-1.5 flex flex-wrap gap-2 text-[0.8125rem] font-bold">
            {onStage && (
              <span className="look-live inline-flex items-center gap-2 rounded-full py-1 pr-3 pl-2.5">
                <span className="look-live-dot" aria-hidden="true" />
                {t('today.onStage')}
              </span>
            )}
            {suspended && (
              <span className="border-danger text-danger rounded-full border px-2.5 py-0.5">
                {t('status.suspendida')}
              </span>
            )}
            {act.estado === 'cambiada' && (
              <span className="text-ink bg-raised rounded-full px-2.5 py-1">
                {t('status.cambiada')}
              </span>
            )}
          </p>
        )}
      </div>
    </li>
  )
}

function FreshStageCard({ group, onStage }: { group: StageGroup; onStage: ReadonlySet<number> }) {
  const { t } = useTranslation()
  const distanceLabel = useDistanceLabel()
  const stagePath = useStagePath()
  const headingId = useId()

  const summary = joinParts([
    group.tipo && t(`stageType.${group.tipo}`),
    group.barrio,
    priceLabel(t, group.gratis, group.precio_texto),
  ])

  return (
    <section aria-labelledby={headingId} className="look-card overflow-hidden">
      <Link
        to={stagePath(group.slug)}
        className="flex min-h-14 items-center gap-3 px-4 pt-3.5 pb-3"
      >
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="look-card-title text-[1.25rem] leading-tight font-bold">
            {group.nombre}
          </h2>
          {summary && <p className="text-soft mt-0.5 text-sm">{summary}</p>}
          {group.distancia_m !== null && (
            <p className="text-accent mt-0.5 text-sm font-bold">
              {distanceLabel(group.distancia_m)}
            </p>
          )}
        </div>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="text-soft size-5 shrink-0 opacity-70"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Link>
      <ul className="divide-line border-line divide-y border-t">
        {group.acts.map((act) => (
          <FreshRow
            key={act.actuacion_id}
            act={act}
            onStage={onStage.has(act.actuacion_id)}
            showDistance={group.itinerante}
          />
        ))}
      </ul>
    </section>
  )
}

interface FreshBoardProps {
  acts: Act[]
  onStage: ReadonlySet<number>
  view?: BoardView
  byDistance?: boolean
}

export function FreshBoard({ acts, onStage, view = 'stage', byDistance = false }: FreshBoardProps) {
  const groups = useMemo(() => {
    const grouped = groupByStage(acts)
    return byDistance ? sortByDistance(grouped) : sortByFirstStart(grouped)
  }, [acts, byDistance])

  if (view === 'time') {
    return (
      <ul className="look-card divide-line divide-y overflow-hidden">
        {acts.map((act) => (
          <FreshRow
            key={act.actuacion_id}
            act={act}
            onStage={onStage.has(act.actuacion_id)}
            showStage
            showDistance={byDistance}
          />
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <FreshStageCard key={group.escenario_id} group={group} onStage={onStage} />
      ))}
    </div>
  )
}
