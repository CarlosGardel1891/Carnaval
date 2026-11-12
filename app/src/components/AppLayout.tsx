import { lazy, Suspense, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { useSessionSync } from '../features/follow/useFollow'
import { usePushSync } from '../features/push/usePush'
import { useOpenInLlamadas } from '../features/llamadas/useOpenInLlamadas'
import { usePrefetchLlamadas } from '../features/llamadas/useLlamadas'
import { LocationProvider } from '../features/location/LocationProvider'
import { formatNight, formatTime } from '../lib/format'
import { isClockSimulated } from '../lib/clock'
import { useLocale } from '../lib/useLocale'
import { useNow } from '../lib/useNow'
import { nocheLogica } from '@cuerda/shared'
import { TabBar } from './TabBar'
import { ScrollProvider } from './ui/scroll'

// Sólo en el build `beta` (decisión 85). Escrito así, entero, para que el empaquetador saque
// del build de producción la franja y todo el módulo de ejemplo.
const DemoBanner =
  import.meta.env.VITE_DEMO === '1' ? lazy(() => import('../demo/DemoBanner')) : null

/** Con el reloj corrido para probar (sólo en desarrollo), se dice bien a la vista. */
function SimulatedClock() {
  const { t } = useTranslation()
  const locale = useLocale()
  const now = useNow()
  if (!isClockSimulated()) return null
  return (
    <p
      role="status"
      className="bg-sun text-ink shadow-float rounded-full px-3 py-1 text-xs font-bold"
    >
      {t('dev.simulatedClock', {
        date: formatNight(nocheLogica(now), locale),
        time: formatTime(now.toISOString(), locale),
      })}
    </p>
  )
}

/**
 * Marco de todas las pantallas: el contenido scrollea por debajo de la barra de pestañas, que
 * flota. Cada pantalla se ocupa de su parte de arriba (el encabezado con degradé llega hasta el
 * borde); abajo se deja libre el lugar de la barra.
 */
export function AppLayout() {
  useSessionSync()
  usePushSync()
  useOpenInLlamadas()
  usePrefetchLlamadas()
  const scrollRef = useRef<HTMLDivElement>(null)
  return (
    <div className="relative h-dvh">
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto pt-[var(--safe-top)] pb-[var(--tabbar-space)]"
      >
        <ScrollProvider scrollRef={scrollRef}>
          <LocationProvider>
            <Outlet />
          </LocationProvider>
        </ScrollProvider>
      </div>
      {/* Avisos de desarrollo y de la beta: píldoras chicas arriba, que no empujan nada. */}
      <div className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+0.5rem)] z-50 flex flex-col items-center gap-1 px-16">
        <SimulatedClock />
        {DemoBanner && (
          <Suspense fallback={null}>
            <DemoBanner />
          </Suspense>
        )}
      </div>
      <TabBar />
    </div>
  )
}
