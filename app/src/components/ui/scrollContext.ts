import { createContext, useContext, useEffect, useState, type RefObject } from 'react'

/**
 * El contenedor que scrollea (lo pone `AppLayout`). Lo usan el título que se achica al hacer
 * scroll y «tirar para actualizar».
 */
export const ScrollContext = createContext<RefObject<HTMLElement | null> | null>(null)

/** Si la pantalla ya se scrolleó más que esos píxeles. */
export function useScrolledPast(pixels: number): boolean {
  const scrollRef = useContext(ScrollContext)
  const [past, setPast] = useState(false)
  useEffect(() => {
    const element = scrollRef?.current
    if (!element) return
    const update = () => setPast(element.scrollTop > pixels)
    update()
    element.addEventListener('scroll', update, { passive: true })
    return () => element.removeEventListener('scroll', update)
  }, [scrollRef, pixels])
  return past
}
