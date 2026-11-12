import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { ChevronLeftIcon } from './icons'
import { RoundButton } from './primitives'

/**
 * Volver, en un botón redondo blanco. Vuelve a la pantalla anterior; si la app abrió directo
 * en ésta (no hay anterior), va a `fallback`.
 */
export function BackButton({ fallback, className }: { fallback: string; className?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const back = () => void (location.key === 'default' ? navigate(fallback) : navigate(-1))
  return (
    <RoundButton label={t('stage.back')} onClick={back} className={className}>
      <ChevronLeftIcon className="size-6" />
    </RoundButton>
  )
}
