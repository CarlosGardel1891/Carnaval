import { useEffect, useState } from 'react'
import { focusManager } from '@tanstack/react-query'
import { now as clockNow } from './clock'

/**
 * El instante actual según el reloj de la app (`lib/clock.ts`), renovado cada `intervalMs` y al volver a la app (los timers se
 * frenan con la app en segundo plano). De acá salen la noche lógica, «ahora en escena»
 * y «actualizado hace X».
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(clockNow)

  useEffect(() => {
    const tick = () => setNow(clockNow())
    const id = setInterval(tick, intervalMs)
    // El mismo «al frente» que usa la caché: ver `initLifecycle`.
    const unsubscribe = focusManager.subscribe((focused) => {
      if (focused) tick()
    })
    return () => {
      clearInterval(id)
      unsubscribe()
    }
  }, [intervalMs])

  return now
}
