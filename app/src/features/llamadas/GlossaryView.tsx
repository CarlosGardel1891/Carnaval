import { useTranslation } from 'react-i18next'
import { GLOSSARY_TERMS } from './glossary'

/**
 * El glosario del candombe y de las Llamadas, pensado para quien viene de afuera. Son textos
 * de la app (decisión 67): no pide nada a la red y se ve aunque no haya datos del desfile.
 */
export function GlossaryView() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="glosario" className="space-y-2 pt-3">
      <h2 id="glosario" className="text-xl font-bold">
        {t('glossary.title')}
      </h2>
      <p className="text-soft">{t('glossary.intro')}</p>
      <dl className="bg-surface border-line divide-line divide-y rounded-2xl border px-4">
        {GLOSSARY_TERMS.map((key) => (
          <div key={key} className="py-3">
            <dt className="text-lg font-semibold">{t(`glossary.terms.${key}.term`)}</dt>
            <dd className="text-soft">{t(`glossary.terms.${key}.text`)}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
