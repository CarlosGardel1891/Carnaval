import { useEffect, useState } from 'react'

/**
 * El instante actual, renovado cada `intervalMs` y al volver a la app (los timers se
 * frenan con la app en segundo plano). De acá salen la noche lógica, «ahora en escena»
 * y «actualizado hace X».
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])

  return now
}
