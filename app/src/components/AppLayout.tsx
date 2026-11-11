import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { useSessionSync } from '../features/follow/useFollow'
import { usePushSync } from '../features/push/usePush'
import { useOpenInLlamadas } from '../features/llamadas/useOpenInLlamadas'
import { LocationProvider } from '../features/location/LocationProvider'
import { formatNight, formatTime } from '../lib/format'
import { isClockSimulated } from '../lib/clock'
import { useLocale } from '../lib/useLocale'
import { useNow } from '../lib/useNow'
import { nocheLogica } from '@cuerda/shared'
import { TabBar } from './TabBar'

/** Con el reloj corrido para probar (sólo en desarrollo), se dice bien a la vista. */
function SimulatedClock() {
  const { t } = useTranslation()
  const locale = useLocale()
  const now = useNow()
  if (!isClockSimulated()) return null
  return (
    <p
      role="status"
      className="bg-accent text-accent-ink px-4 py-1 text-center text-sm font-semibold"
    >
      {t('dev.simulatedClock', {
        date: formatNight(nocheLogica(now), locale),
        time: formatTime(now.toISOString(), locale),
      })}
    </p>
  )
}

/** Marco de todas las pantallas: el contenido scrollea y la barra de pestañas queda fija abajo. */
export function AppLayout() {
  useSessionSync()
  usePushSync()
  useOpenInLlamadas()
  return (
    <div className="flex h-dvh flex-col">
      <SimulatedClock />
      <div className="relative min-h-0 flex-1 overflow-y-auto pt-[env(safe-area-inset-top)]">
        <LocationProvider>
          <Outlet />
        </LocationProvider>
      </div>
      <TabBar />
    </div>
  )
}
