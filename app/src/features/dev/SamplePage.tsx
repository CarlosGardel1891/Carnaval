import { useState } from 'react'
import { Constants } from '@cuerda/shared'
import { useTranslation } from 'react-i18next'
import { HeartIcon, NearIcon, ShareIcon, ChevronLeftIcon } from '../../components/ui/icons'
import {
  DrumArt,
  EmptyHeartArt,
  EmptySearchArt,
  EmptyStageArt,
  OfflineArt,
} from '../../components/ui/illustrations'
import {
  Avatar,
  Card,
  CategoryPill,
  DateBadge,
  EmptyState,
  FilterChip,
  LivePill,
  Pill,
  PrimaryButton,
  RoundButton,
  RowLink,
  SectionHeader,
  Segmented,
} from '../../components/ui/primitives'
import { TabHeader } from '../../components/ui/TabHeader'

/**
 * La muestra del sistema de diseño (decisión 92): todas las piezas juntas, para mirarlas en el
 * teléfono. Sólo existe en desarrollo (`routes.tsx` no la registra contra el remoto), y por eso
 * sus rótulos, que son nombres de piezas y no textos de la app, no pasan por i18n.
 */
export default function SamplePage() {
  const { t } = useTranslation()
  const [view, setView] = useState<'a' | 'b'>('a')
  const [chip, setChip] = useState(true)
  const categories = Constants.public.Enums.categoria_conjunto

  return (
    <main className="mx-auto max-w-2xl pb-6">
      <TabHeader title={t('dev.sample')} subtitle={t('app.name')} art={<DrumArt />}>
        <Segmented
          onBrand
          label={t('dev.sample')}
          value={view}
          onChange={setView}
          options={[
            { value: 'a', label: 'Vie 5 de febrero' },
            { value: 'b', label: 'Sáb 6 de febrero' },
          ]}
        />
      </TabHeader>

      <div className="space-y-6 px-4 pt-5">
        <section>
          <SectionHeader title="Botones" action={{ label: 'Ver todo', to: '/' }} />
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton icon={<HeartIcon className="size-5" />}>Seguir</PrimaryButton>
            <RoundButton label="Volver">
              <ChevronLeftIcon />
            </RoundButton>
            <RoundButton label="Compartir">
              <ShareIcon className="size-5" />
            </RoundButton>
          </div>
        </section>

        <section>
          <SectionHeader title="Chips y segmentado" />
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-3">
            <FilterChip pressed={false} icon={<NearIcon className="size-4" />}>
              Cerca mío
            </FilterChip>
            <FilterChip pressed={chip} onClick={() => setChip(!chip)}>
              Gratis
            </FilterChip>
            {categories.slice(0, 3).map((category) => (
              <FilterChip key={category} pressed={false} category={category}>
                {t(`category.${category}`)}
              </FilterChip>
            ))}
          </div>
          <Segmented
            label="Vista"
            value={view}
            onChange={setView}
            options={[
              { value: 'a', label: 'Por escenario' },
              { value: 'b', label: 'Por hora' },
            ]}
          />
        </section>

        <section>
          <SectionHeader title="Categorías y avatares" />
          <Card className="p-4">
            <ul className="space-y-3">
              {categories.map((category) => (
                <li key={category} className="flex items-center gap-3">
                  <Avatar name={`Conjunto ${t(`category.${category}`)}`} category={category} />
                  <span className="flex-1 font-bold">{t(`category.${category}`)}</span>
                  <CategoryPill category={category}>{t(`category.${category}`)}</CategoryPill>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section>
          <SectionHeader title="Estados" />
          <Card className="flex flex-wrap gap-2 p-4">
            <LivePill>{t('today.onStage')}</LivePill>
            <Pill tone="amber">{t('status.cambiada')}</Pill>
            <Pill tone="danger">{t('status.suspendida')}</Pill>
            <Pill tone="ok">{t('price.free')}</Pill>
            <Pill>$ 300</Pill>
            <Pill tone="brand">En concurso</Pill>
          </Card>
        </section>

        <section>
          <SectionHeader title="Filas y fechas" />
          <Card>
            <ul className="divide-line divide-y">
              <li>
                <RowLink to="/">
                  <span className="flex items-center gap-3">
                    <DateBadge top="Hoy" bottom="21:30" today />
                    <span>
                      <span className="block font-bold">Tablado del Centro</span>
                      <span className="text-soft block text-sm">Privado · Centro · $ 300</span>
                    </span>
                  </span>
                </RowLink>
              </li>
              <li>
                <RowLink to="/">
                  <span className="flex items-center gap-3">
                    <DateBadge top="Vie 13" bottom="23:00" />
                    <span>
                      <span className="block font-bold">Tablado de la Unión</span>
                      <span className="text-soft block text-sm">Popular · Unión · $ 150</span>
                    </span>
                  </span>
                </RowLink>
              </li>
            </ul>
          </Card>
        </section>

        <section>
          <SectionHeader title="Estados vacíos" />
          <Card>
            <EmptyState illustration={<EmptyStageArt />} title={t('today.offSeason')} />
            <EmptyState illustration={<EmptyHeartArt />} title={t('mine.none')} />
            <EmptyState illustration={<EmptySearchArt />} title={t('filters.noResults')} />
            <EmptyState
              illustration={<OfflineArt />}
              title={t('today.error')}
              action={<PrimaryButton>{t('today.retry')}</PrimaryButton>}
            />
          </Card>
        </section>
      </div>
    </main>
  )
}
