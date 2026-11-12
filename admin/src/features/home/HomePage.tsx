import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PageTitle } from '../../components/ui'
import { sections } from '../../nav'
import { SystemStatus } from './SystemStatus'

export function HomePage() {
  const { t } = useTranslation()
  return (
    <>
      <PageTitle title={t('home.title')} intro={t('home.intro')} />
      <SystemStatus />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sections
          .filter(({ to }) => to !== '/')
          .map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400"
              >
                <span className="font-medium">{t(`nav.${label}`)}</span>
                <span className="mt-1 block text-sm text-slate-600">
                  {t(`home.cards.${label}`)}
                </span>
              </Link>
            </li>
          ))}
      </ul>
    </>
  )
}
