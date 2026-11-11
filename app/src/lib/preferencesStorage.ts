import { Preferences } from '@capacitor/preferences'

/**
 * `@capacitor/preferences` con la forma de un storage asíncrono. En el teléfono guarda en
 * las preferencias nativas, que el sistema no borra como puede borrar el `localStorage`
 * del WebView; en el navegador, en `localStorage`. Lo usan la sesión de Supabase y la
 * caché de consultas.
 */
export const preferencesStorage = {
  getItem: async (key: string): Promise<string | null> => (await Preferences.get({ key })).value,
  setItem: (key: string, value: string): Promise<void> => Preferences.set({ key, value }),
  removeItem: (key: string): Promise<void> => Preferences.remove({ key }),
}
