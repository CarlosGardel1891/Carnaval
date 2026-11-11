import { useTranslation } from 'react-i18next'
import type { GroupSeason } from '../../lib/api'

const badge = 'border-line text-soft rounded-md border px-2 py-0.5 text-sm font-semibold'

/** Marcas de la temporada: en concurso, pendiente de la Prueba de Admisión y en Llamadas. */
export function GroupBadges({ season }: { season: GroupSeason | null }) {
  const { t } = useTranslation()
  if (!season) return null
  const labels = [
    season.en_concurso === true && t('groups.inContest'),
    season.en_concurso === null && t('groups.pendingAdmission'),
    season.en_llamadas && t('groups.inLlamadas'),
  ].filter((label): label is string => Boolean(label))
  if (labels.length === 0) return null
  return (
    <ul className="mt-1 flex flex-wrap gap-2">
      {labels.map((label) => (
        <li key={label} className={badge}>
          {label}
        </li>
      ))}
    </ul>
  )
}
