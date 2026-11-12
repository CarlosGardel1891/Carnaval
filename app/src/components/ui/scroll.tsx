import { useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshIcon } from './icons'
import { ScrollContext, useScrolledPast } from './scrollContext'

/** Le dice a las pantallas cuál es el contenedor que scrollea (lo pone `AppLayout`). */
export function ScrollProvider({
  scrollRef,
  children,
}: {
  scrollRef: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  return <ScrollContext.Provider value={scrollRef}>{children}</ScrollContext.Provider>
}

/**
 * El título grande, achicado: una barra translúcida que aparece arriba cuando el encabezado ya
 * se fue de la pantalla, como en las apps de iPhone. Es adorno: el título de verdad es el `h1`.
 */
export function CompactTitle({ title, after = 150 }: { title: string; after?: number }) {
  const visible = useScrolledPast(after)
  return (
    <div
      aria-hidden="true"
      className={`border-line/70 bg-ground/85 pointer-events-none fixed inset-x-0 top-0 z-30 border-b pt-[var(--safe-top)] backdrop-blur-xl transition-opacity duration-200 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <p className="flex h-11 items-center justify-center text-[1.0625rem] font-extrabold tracking-tight">
        {title}
      </p>
    </div>
  )
}

/** Cuánto hay que tirar para que actualice, y hasta dónde baja el indicador. */
const TRIGGER_PX = 72
const MAX_PX = 110

/**
 * Tirar hacia abajo para actualizar. Con la pantalla arriba de todo, arrastrar hacia abajo
 * muestra el indicador; soltar pasado el punto llama a `onRefresh`. El botón «Actualizar» sigue
 * estando: esto es un atajo, no la única forma.
 */
export function PullToRefresh({
  onRefresh,
  refreshing,
}: {
  onRefresh: () => void
  refreshing: boolean
}) {
  const { t } = useTranslation()
  const scrollRef = useContext(ScrollContext)
  const [pull, setPull] = useState(0)
  const start = useRef<number | null>(null)
  const pullRef = useRef(0)
  const refresh = useRef(onRefresh)
  useEffect(() => {
    refresh.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const element = scrollRef?.current
    if (!element) return

    const set = (value: number) => {
      pullRef.current = value
      setPull(value)
    }
    const onStart = (event: TouchEvent) => {
      start.current = element.scrollTop <= 0 ? (event.touches[0]?.clientY ?? null) : null
    }
    const onMove = (event: TouchEvent) => {
      if (start.current === null) return
      const delta = (event.touches[0]?.clientY ?? 0) - start.current
      if (delta <= 0 || element.scrollTop > 0) {
        set(0)
        return
      }
      // Con resistencia: cuesta cada vez más, como una goma.
      set(Math.min(MAX_PX, delta * 0.5))
    }
    const onEnd = () => {
      if (pullRef.current >= TRIGGER_PX) refresh.current()
      start.current = null
      set(0)
    }

    element.addEventListener('touchstart', onStart, { passive: true })
    element.addEventListener('touchmove', onMove, { passive: true })
    element.addEventListener('touchend', onEnd)
    element.addEventListener('touchcancel', onEnd)
    return () => {
      element.removeEventListener('touchstart', onStart)
      element.removeEventListener('touchmove', onMove)
      element.removeEventListener('touchend', onEnd)
      element.removeEventListener('touchcancel', onEnd)
    }
  }, [scrollRef])

  const shown = refreshing ? TRIGGER_PX : pull
  if (shown <= 0) return null
  const ready = pull >= TRIGGER_PX
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(var(--safe-top)+0.5rem)] z-40 flex justify-center"
      style={{ transform: `translateY(${Math.min(shown, MAX_PX) * 0.6}px)` }}
    >
      <span className="bg-surface shadow-float text-brand flex size-11 items-center justify-center rounded-full">
        <RefreshIcon
          className={`size-5 ${refreshing ? 'animate-spin' : ''}`}
          style={refreshing ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        />
        <span className="sr-only">
          {refreshing ? t('today.updating') : ready ? t('pull.release') : t('pull.pull')}
        </span>
      </span>
    </div>
  )
}
