import { useTranslation } from 'react-i18next'
import type { GroupSeason } from '../../lib/api'

interface GroupBadgesProps {
  season: GroupSeason | null
  /** Sobre el degradé de la ficha: píldoras translúcidas en vez de puntos. */
  onColor?: boolean
}

/**
 * Marcas de la temporada: en concurso, pendiente de la Prueba de Admisión y en Llamadas. En las
 * listas, un punto chico de color y el texto; en la ficha, píldoras sobre el degradé.
 */
export function GroupBadges({ season, onColor = false }: GroupBadgesProps) {
  const { t } = useTranslation()
  if (!season) return null
  const marks = [
    season.en_concurso === true && { label: t('groups.inContest'), dot: 'bg-ok' },
    season.en_concurso === null && { label: t('groups.pendingAdmission'), dot: 'bg-sun' },
    season.en_llamadas && { label: t('groups.inLlamadas'), dot: 'bg-brand-mid' },
  ].filter((mark): mark is { label: string; dot: string } => Boolean(mark))
  if (marks.length === 0) return null
  if (onColor) {
    return (
      <>
        {marks.map((mark) => (
          <li
            key={mark.label}
            className="rounded-full bg-white/20 px-3 py-1 text-[0.8125rem] font-bold text-white"
          >
            {mark.label}
          </li>
        ))}
      </>
    )
  }
  return (
    <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
      {marks.map((mark) => (
        <li
          key={mark.label}
          className="text-soft flex items-center gap-1.5 text-[0.8125rem] font-semibold"
        >
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${mark.dot}`} />
          {mark.label}
        </li>
      ))}
    </ul>
  )
}
