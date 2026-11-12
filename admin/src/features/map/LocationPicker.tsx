import { lazy, Suspense, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, inputClass, Notice } from '../../components/ui'
import { geocode, type Coords, type GeocodeResult } from './geocode'

// MapLibre pesa: se baja recién cuando se abre un mapa.
const LocationMap = lazy(() => import('./LocationMap'))

interface Props {
  value: Coords | null
  onChange: (value: Coords | null) => void
  /** Con qué arranca el buscador: la dirección del escenario. */
  searchHint?: string
}

const round = (n: number) => Number(n.toFixed(6))

/**
 * Elegir la ubicación de un lugar (decisión 74): tocando el mapa, arrastrando el punto o
 * buscando la dirección. La búsqueda sólo propone: el punto lo confirma quien mira el mapa.
 */
export function LocationPicker({ value, onChange, searchHint = '' }: Props) {
  const { t } = useTranslation()
  const apiKey = import.meta.env.VITE_MAPTILER_KEY || undefined
  const [query, setQuery] = useState(searchHint)
  const [results, setResults] = useState<GeocodeResult[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [failed, setFailed] = useState(false)

  const set = (coords: Coords) => onChange({ lat: round(coords.lat), lng: round(coords.lng) })

  const onSearch = async (event: FormEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!apiKey || !query.trim()) return
    setSearching(true)
    setFailed(false)
    try {
      setResults(await geocode(query, apiKey))
    } catch {
      setResults(null)
      setFailed(true)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-3">
      {apiKey ? (
        // No es un <form>: este selector va adentro del formulario del escenario.
        <div
          role="search"
          className="flex flex-wrap gap-2"
          onKeyDown={(event) => {
            if (event.key === 'Enter') void onSearch(event)
          }}
        >
          <input
            aria-label={t('location.search')}
            placeholder={t('location.searchPlaceholder')}
            className={`${inputClass} flex-1`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button
            variant="secondary"
            disabled={searching || !query.trim()}
            onClick={(event) => void onSearch(event)}
          >
            {searching ? t('location.searching') : t('location.searchButton')}
          </Button>
        </div>
      ) : (
        <Notice kind="warn">{t('location.noKey')}</Notice>
      )}

      {failed && <Notice kind="error">{t('location.searchFailed')}</Notice>}
      {results?.length === 0 && <Notice>{t('location.noResults')}</Notice>}
      {results && results.length > 0 && (
        <ul className="space-y-1 text-sm">
          {results.map((result) => (
            <li key={`${result.lat},${result.lng},${result.label}`}>
              <button
                type="button"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left hover:border-slate-400"
                onClick={() => set(result)}
              >
                {result.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Suspense fallback={<p className="text-sm text-slate-600">{t('app.loading')}</p>}>
        <LocationMap value={value} onChange={set} apiKey={apiKey} label={t('location.map')} />
      </Suspense>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <p role="status" className="flex-1 text-slate-700">
          {value ? t('location.point', { lat: value.lat, lon: value.lng }) : t('location.none')}
        </p>
        {value && (
          <Button variant="secondary" onClick={() => onChange(null)}>
            {t('location.clear')}
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-500">{t('location.hint')}</p>
    </div>
  )
}
