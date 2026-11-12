// Buscar una dirección con el geocoder de MapTiler (decisión 74). Usa la misma key que el
// mapa. Devuelve candidatos: el punto lo confirma una persona mirando el mapa.

export interface Coords {
  lat: number
  lng: number
}

export interface GeocodeResult extends Coords {
  label: string
}

/** El centro de Montevideo, como en la app (decisión 35). */
export const MONTEVIDEO_CENTER: Coords = { lat: -34.9058, lng: -56.1913 }

interface Feature {
  place_name?: string
  center?: [number, number]
}

export async function geocode(
  query: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<GeocodeResult[]> {
  const text = query.trim()
  if (!text) return []
  const params = new URLSearchParams({
    key: apiKey,
    country: 'uy',
    language: 'es',
    limit: '5',
    proximity: `${MONTEVIDEO_CENTER.lng},${MONTEVIDEO_CENTER.lat}`,
  })
  const response = await fetcher(
    `https://api.maptiler.com/geocoding/${encodeURIComponent(text)}.json?${params.toString()}`,
  )
  if (!response.ok) throw new Error(`El buscador de direcciones respondió ${response.status}.`)
  const body = (await response.json()) as { features?: Feature[] }
  return (body.features ?? []).flatMap((feature) =>
    feature.center && feature.place_name
      ? [{ label: feature.place_name, lng: feature.center[0], lat: feature.center[1] }]
      : [],
  )
}
