import { EmptyHeartArt } from '../../components/ui/illustrations'
import { EmptyState } from '../../components/ui/primitives'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

/** «Mis conjuntos» sin ningún conjunto seguido: explica cómo seguir uno y lleva a la lista. */
export function EmptyMine() {
  const { t } = useTranslation()
  return (
    <EmptyState
      illustration={<EmptyHeartArt />}
      action={
        <Link
          to="/conjuntos"
          className="pressable bg-brand shadow-button inline-flex min-h-13 items-center rounded-2xl px-6 text-[1.0625rem] font-bold text-white"
        >
          {t('mine.browse')}
        </Link>
      }
    >
      <p className="text-ink text-base font-semibold">{t('mine.none')}</p>
    </EmptyState>
  )
}
