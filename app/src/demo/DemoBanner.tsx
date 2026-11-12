import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
import { DEMO_MARKER } from './demo'

// Los textos del modo demostración viven acá y no en `locales/`: así tampoco quedan en el
// build de producción (decisión 85). Se suman al cargar este módulo.
i18n.addResourceBundle(
  'es',
  'translation',
  {
    demo: {
      banner:
        'Versión de prueba: mientras no hay temporada, la noche de hoy, el orden de las Llamadas y el fixture del Concurso son de ejemplo.',
    },
  },
  true,
  false,
)
i18n.addResourceBundle(
  'en',
  'translation',
  {
    demo: {
      banner:
        "Test version: while the season hasn't started, tonight's lineup, the Llamadas order and the Contest schedule are sample data.",
    },
  },
  true,
  false,
)

/** La franja fija que avisa, en toda la app, que lo que se ve es de ejemplo. */
export default function DemoBanner() {
  const { t } = useTranslation()
  return (
    <p
      role="note"
      data-demo={DEMO_MARKER}
      className="bg-accent text-accent-ink px-4 py-1 text-center text-sm font-semibold"
    >
      {t('demo.banner')}
    </p>
  )
}
