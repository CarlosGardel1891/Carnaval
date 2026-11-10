import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { formatDistance, formatRoughDistance } from '../../lib/format'
import { useLocale } from '../../lib/useLocale'
import { useUserLocation } from './locationContext'

/**
 * Cómo se escribe una distancia al usuario. Con la posición precisa, tal cual («350 m»,
 * «1,2 km»). Con la aproximada, redondeada al kilómetro («menos de 1 km», «aprox. 3 km»):
 * más detalle sería mostrar una precisión que no hay.
 */
export function useDistanceLabel(): (meters: number) => string {
  const { t } = useTranslation()
  const locale = useLocale()
  const { approximate } = useUserLocation()

  return useCallback(
    (meters: number) => {
      if (!approximate) return formatDistance(meters, locale)
      const distance = formatRoughDistance(meters, locale)
      return t(meters < 1000 ? 'nearby.underDistance' : 'nearby.aboutDistance', { distance })
    },
    [approximate, locale, t],
  )
}
