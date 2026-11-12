import { useEffect, useSyncExternalStore } from 'react'
import { simulationAllowed } from '../lib/clock'

/**
 * Las tres direcciones visuales del rediseño, para elegir una (decisión 91). Sólo existen en
 * desarrollo: con `pnpm dev` o cuando la app apunta al Supabase local. Cuando se elija, las
 * otras dos y este selector se borran.
 */
export const LOOKS = ['clara', 'tablado', 'festiva'] as const
export type Look = (typeof LOOKS)[number]

const STORAGE_KEY = 'cuerda-look'
const listeners = new Set<() => void>()

const isLook = (value: unknown): value is Look =>
  typeof value === 'string' && (LOOKS as readonly string[]).includes(value)

/** Si el selector de direcciones se puede usar en este build. */
export function looksAllowed(env: ImportMetaEnv = import.meta.env): boolean {
  return simulationAllowed(env)
}

function read(): Look | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isLook(stored) ? stored : null
  } catch {
    return null
  }
}

/** Elige una dirección, o vuelve al diseño de siempre con `null`. */
export function setLook(look: Look | null): void {
  try {
    if (look) window.localStorage.setItem(STORAGE_KEY, look)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Sin dónde guardarlo, vale hasta cerrar la app.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** La dirección elegida, o null si no hay ninguna (o si este build no las permite). */
export function useLook(): Look | null {
  const look = useSyncExternalStore(subscribe, read, () => null)
  return looksAllowed() ? look : null
}

/**
 * Aplica la dirección a toda la ventana mientras la pantalla que la usa está a la vista, y
 * deja todo como estaba al salir. La barra del sistema no se toca todavía: su color se arregla
 * cuando se aplique la dirección elegida a toda la app.
 */
export function useApplyLook(look: Look | null): void {
  useEffect(() => {
    if (!look) return
    const root = document.documentElement
    root.dataset.look = look
    return () => {
      delete root.dataset.look
    }
  }, [look])
}
