import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router'
import { modoLlamadasActivo, nocheLogica } from '@cuerda/shared'
import { useNow } from '../../lib/useNow'
import { llamadasSeasonQuery } from './useLlamadas'

/**
 * Con el modo Llamadas activo, la app abre en Llamadas en vez de en Hoy (decisión 62).
 *
 * - El modo sale de las fechas de la temporada (`modoLlamadasActivo`), nunca del tipo de
 *   evento, y con la noche lógica de Montevideo.
 * - Vale sólo para el arranque en `/`, sin parámetros. Si se abrió otra pantalla, si un aviso
 *   push ya llevó a otro lado o si la persona ya navegó, no se toca: «Hoy» queda a un toque
 *   y no rebota.
 *
 * Se monta una sola vez, en el marco de la app.
 */
export function useOpenInLlamadas(): void {
  const now = useNow()
  const navigate = useNavigate()
  const location = useLocation()
  const season = useQuery(llamadasSeasonQuery(nocheLogica(now)))
  const decided = useRef(false)

  useEffect(() => {
    if (decided.current) return
    // `key` es `default` sólo en la primera pantalla: después de navegar, ya no.
    // `?ahora=` (el reloj simulado de desarrollo) no cuenta como parámetro de la pantalla.
    const params = new URLSearchParams(location.search)
    params.delete('ahora')
    const justOpened =
      location.key === 'default' && location.pathname === '/' && params.toString() === ''
    if (!justOpened || season.isError) {
      decided.current = true
      return
    }
    if (season.data === undefined) return
    decided.current = true
    if (season.data && modoLlamadasActivo(now, season.data)) {
      void navigate('/llamadas', { replace: true })
    }
  }, [location, season.data, season.isError, now, navigate])
}
