import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { privacyUrl } from '../../lib/site'
import { useDeleteMyData } from './useDeleteMyData'

const link = 'text-accent inline-flex min-h-12 items-center underline'

/** «Acerca de»: la política de privacidad, borrar mis datos, los créditos y la versión. */
export function AboutPage() {
  const { t, i18n } = useTranslation()
  const [confirming, setConfirming] = useState(false)
  const remove = useDeleteMyData()

  const confirm = () => {
    remove.mutate(undefined, { onSettled: () => setConfirming(false) })
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-6">
      <header className="pt-4 pb-2">
        <p className="text-accent font-semibold tracking-wide uppercase">{t('app.name')}</p>
        <h1 className="text-3xl font-bold">{t('about.title')}</h1>
      </header>

      <section aria-labelledby="about-privacy" className="border-line border-t py-4">
        <h2 id="about-privacy" className="text-xl font-bold">
          {t('about.privacy.title')}
        </h2>
        <p className="text-soft mt-2">{t('about.privacy.summary')}</p>
        <a href={privacyUrl(i18n.language)} target="_blank" rel="noreferrer" className={link}>
          {t('about.privacy.link')}
        </a>
      </section>

      <section aria-labelledby="about-data" className="border-line border-t py-4">
        <h2 id="about-data" className="text-xl font-bold">
          {t('about.data.title')}
        </h2>
        <p className="text-soft mt-2">{t('about.data.what')}</p>

        {remove.isSuccess && !confirming && (
          <p role="status" className="mt-3 font-semibold">
            {t('about.data.done')}
          </p>
        )}
        {remove.isError && !confirming && (
          <p role="alert" className="mt-3 font-semibold">
            {t('about.data.error')}
          </p>
        )}

        {confirming ? (
          <div className="bg-raised border-line mt-3 rounded-xl border p-4">
            <p className="font-semibold">{t('about.data.confirmTitle')}</p>
            <p className="text-soft mt-1">{t('about.data.confirmBody')}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button onClick={confirm} disabled={remove.isPending}>
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
          <Button variant="secondary" className="mt-3" onClick={() => setConfirming(true)}>
            {t('about.data.delete')}
          </Button>
        )}
      </section>

      <section aria-labelledby="about-credits" className="border-line border-t py-4">
        <h2 id="about-credits" className="text-xl font-bold">
          {t('about.credits.title')}
        </h2>
        <p className="text-soft mt-2">{t('about.credits.map')}</p>
        <p className="text-soft mt-2">{t('about.credits.data')}</p>
      </section>

      <p className="text-soft border-line border-t pt-4">
        {t('about.version', { version: __APP_VERSION__, build: __APP_BUILD__ })}
      </p>
    </main>
  )
}
