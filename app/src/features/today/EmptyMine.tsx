import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

/** «Mis conjuntos» sin ningún conjunto seguido: explica cómo seguir uno y lleva a la lista. */
export function EmptyMine() {
  const { t } = useTranslation()
  return (
    <div className="space-y-3 py-2">
      <p className="text-lg">{t('mine.none')}</p>
      <Link
        to="/conjuntos"
        className="bg-accent text-accent-ink inline-flex min-h-12 items-center rounded-xl px-5 font-semibold"
      >
        {t('mine.browse')}
      </Link>
    </div>
  )
}
