import { Outlet } from 'react-router'
import { useSessionSync } from '../features/follow/useFollow'
import { usePushSync } from '../features/push/usePush'
import { LocationProvider } from '../features/location/LocationProvider'
import { TabBar } from './TabBar'

/** Marco de todas las pantallas: el contenido scrollea y la barra de pestañas queda fija abajo. */
export function AppLayout() {
  useSessionSync()
  usePushSync()
  return (
    <div className="flex h-dvh flex-col">
      <div className="relative min-h-0 flex-1 overflow-y-auto pt-[env(safe-area-inset-top)]">
        <LocationProvider>
          <Outlet />
        </LocationProvider>
      </div>
      <TabBar />
    </div>
  )
}
