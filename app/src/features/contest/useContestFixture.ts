import { useQuery } from '@tanstack/react-query'
import { nocheLogica } from '@cuerda/shared'
import { fetchContestFixture } from '../../lib/api'
import { useNow } from '../../lib/useNow'
import { useCurrentSeason } from '../season/useCurrentSeason'

/**
 * El fixture del Concurso de la temporada vigente (o de la próxima). Si la temporada no
 * tiene etapas cargadas viene vacío: todavía no se publicó. Puede cambiar una noche
 * (suspensiones): se refresca como la ficha de un conjunto.
 */
export function useContestFixture() {
  const today = nocheLogica(useNow())
  const season = useCurrentSeason(today)
  const year = season.data?.anio
  const fixture = useQuery({
    queryKey: ['fixture', year],
    queryFn: () => fetchContestFixture(year as number),
    enabled: year !== undefined,
    staleTime: 5 * 60_000,
  })
  return { today, season, fixture }
}
