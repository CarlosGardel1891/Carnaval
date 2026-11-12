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
      pill: 'Datos de ejemplo',
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
      pill: 'Sample data',
      banner:
        "Test version: while the season hasn't started, tonight's lineup, the Llamadas order and the Contest schedule are sample data.",
    },
  },
  true,
  false,
)

/**
 * El aviso fijo, en toda la app, de que lo que se ve es de ejemplo: una píldora chica arriba,
 * que no empuja el contenido. El texto entero queda para los lectores de pantalla.
 */
export default function DemoBanner() {
  const { t } = useTranslation()
  return (
    <p
      role="note"
      data-demo={DEMO_MARKER}
      aria-label={t('demo.banner')}
      className="bg-sun text-ink shadow-float rounded-full px-3 py-1 text-xs font-extrabold tracking-wide uppercase"
    >
      {t('demo.pill')}
    </p>
  )
}
