import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { BackButton } from '../../components/ui/BackButton'
import { ChevronRightIcon, ShieldIcon, TrashIcon } from '../../components/ui/icons'
import { Card } from '../../components/ui/primitives'
import { simulationAllowed } from '../../lib/clock'
import { privacyUrl } from '../../lib/site'
import { useSystemBars } from '../../lib/systemBars'
import { useDeleteMyData } from './useDeleteMyData'

const row = 'flex min-h-13 w-full items-center gap-3 px-4 py-3 text-left text-[1.0625rem] font-bold'
const rowIcon = 'inline-flex size-9 shrink-0 items-center justify-center rounded-[0.625rem]'

/** Un grupo de la lista, como en los ajustes del iPhone: su título chico y una tarjeta. */
function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2
        id={id}
        className="text-soft px-4 pb-2 text-[0.8125rem] font-extrabold tracking-[0.06em] uppercase"
      >
        {title}
      </h2>
      <Card>
        <div className="divide-line divide-y">{children}</div>
      </Card>
    </section>
  )
}

/** «Acerca de»: la política de privacidad, borrar mis datos, los créditos y la versión. */
export function AboutPage() {
  const { t, i18n } = useTranslation()
  useSystemBars('onLight')
  const [confirming, setConfirming] = useState(false)
  const remove = useDeleteMyData()

  const confirm = () => {
    remove.mutate(undefined, { onSettled: () => setConfirming(false) })
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 pt-3 pb-6">
      <BackButton fallback="/" />
      <header className="flex items-center gap-4">
        <img src="/favicon.png" alt="" className="shadow-card size-16 rounded-[1.125rem]" />
        <div>
          <p className="text-brand text-[0.8125rem] font-extrabold tracking-[0.08em] uppercase">
            {t('app.name')}
          </p>
          <h1 className="text-[1.875rem] leading-tight font-extrabold tracking-tight">
            {t('about.title')}
          </h1>
        </div>
      </header>

      <Group id="about-privacy" title={t('about.privacy.title')}>
        <p className="text-soft px-4 py-3 text-[0.9375rem]">{t('about.privacy.summary')}</p>
        <a href={privacyUrl(i18n.language)} target="_blank" rel="noreferrer" className={row}>
          <span aria-hidden="true" className={`${rowIcon} bg-brand-soft text-brand`}>
            <ShieldIcon className="size-5" />
          </span>
          <span className="text-brand min-w-0 flex-1">{t('about.privacy.link')}</span>
          <ChevronRightIcon className="text-soft size-5 shrink-0 opacity-50" />
        </a>
      </Group>

      <Group id="about-data" title={t('about.data.title')}>
        <p className="text-soft px-4 py-3 text-[0.9375rem]">{t('about.data.what')}</p>
        {remove.isSuccess && !confirming && (
          <p role="status" className="text-ok px-4 py-3 font-bold">
            {t('about.data.done')}
          </p>
        )}
        {remove.isError && !confirming && (
          <p role="alert" className="text-danger px-4 py-3 font-bold">
            {t('about.data.error')}
          </p>
        )}
        {confirming ? (
          <div className="bg-danger-soft/50 px-4 py-4">
            <p className="font-extrabold">{t('about.data.confirmTitle')}</p>
            <p className="text-soft mt-1 text-[0.9375rem]">{t('about.data.confirmBody')}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                onClick={confirm}
                disabled={remove.isPending}
                className="bg-danger! shadow-none!"
              >
                {remove.isPending ? t('about.data.deleting') : t('about.data.confirm')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirming(false)}
                disabled={remove.isPending}
              >
                {t('about.data.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={row}>
            <span aria-hidden="true" className={`${rowIcon} bg-danger-soft text-danger`}>
              <TrashIcon className="size-5" />
            </span>
            <span className="text-danger min-w-0 flex-1">{t('about.data.delete')}</span>
          </button>
        )}
      </Group>

      <Group id="about-credits" title={t('about.credits.title')}>
        <p className="text-soft px-4 py-3 text-[0.9375rem]">{t('about.credits.map')}</p>
        <p className="text-soft px-4 py-3 text-[0.9375rem]">{t('about.credits.data')}</p>
      </Group>

      <div className="text-center">
        <p className="text-soft text-sm font-semibold">
          {t('about.version', { version: __APP_VERSION__, build: __APP_BUILD__ })}
        </p>
        {simulationAllowed(import.meta.env) && (
          <Link to="/muestra" className="text-accent inline-flex min-h-11 items-center font-bold">
            {t('dev.sample')}
          </Link>
        )}
      </div>
    </main>
  )
}
