import { useTranslation } from 'react-i18next'
import { SectionHeader } from '../../components/ui/primitives'
import { glossaryGroups } from './glossary'

/**
 * El glosario del candombe y de las Llamadas, pensado para quien viene de afuera. Son textos
 * de la app (decisión 67): no pide nada a la red y se ve aunque no haya datos del desfile.
 * Cada término va en su tarjeta, agrupados por tema.
 */
export function GlossaryView() {
  const { t } = useTranslation()
  return (
    <section aria-labelledby="glosario">
      <SectionHeader id="glosario" title={t('glossary.title')} />
      <p className="text-soft px-1 pb-2 text-[0.9375rem]">{t('glossary.intro')}</p>
      {glossaryGroups().map(({ group, terms }) => (
        <div key={group}>
          <h3 className="text-brand px-1 pt-4 pb-2 text-[0.75rem] font-extrabold tracking-[0.08em] uppercase">
            {t(`glossary.groups.${group}`)}
          </h3>
          <dl className="grid gap-3 sm:grid-cols-2">
            {terms.map((key) => (
              <div key={key} className="bg-surface shadow-card rounded-[1.375rem] p-4">
                <dt className="text-[1.0625rem] font-extrabold tracking-tight">
                  {t(`glossary.terms.${key}.term`)}
                </dt>
                <dd className="text-soft mt-1 text-[0.9375rem]">
                  {t(`glossary.terms.${key}.text`)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  )
}
