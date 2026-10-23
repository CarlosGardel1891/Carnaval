/** El emulador de Android llega a la máquina host por 10.0.2.2, no por 127.0.0.1. */
export function resolveSupabaseUrl(url: string, platform: string): string {
  if (platform !== 'android') return url
  const parsed = new URL(url)
  if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
    parsed.hostname = '10.0.2.2'
  }
  return parsed.toString().replace(/\/$/, '')
}
