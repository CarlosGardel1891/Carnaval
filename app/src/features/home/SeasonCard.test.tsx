import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import i18n from '../../i18n'
import { SeasonCard } from './SeasonCard'

const season = {
  id: 1,
  anio: 2027,
  fecha_inicio: '2027-01-21',
  fecha_fin: '2027-03-07',
  modo_llamadas_desde: '2027-02-05',
  modo_llamadas_hasta: '2027-02-06',
}

describe('SeasonCard', () => {
  afterEach(cleanup)

  it('muestra la temporada en español', async () => {
    await i18n.changeLanguage('es')
    render(<SeasonCard season={season} />)
    expect(screen.getByRole('heading', { name: 'Carnaval 2027' })).toBeInTheDocument()
    expect(screen.getByText('Del 21 de enero al 7 de marzo')).toBeInTheDocument()
    expect(screen.getByText('Desfile de Llamadas: 5 de febrero y 6 de febrero')).toBeInTheDocument()
  })

  it('muestra la temporada en inglés', async () => {
    await i18n.changeLanguage('en')
    render(<SeasonCard season={season} />)
    expect(screen.getByRole('heading', { name: 'Carnival 2027' })).toBeInTheDocument()
    expect(screen.getByText('From January 21 to March 7')).toBeInTheDocument()
  })

  it('no muestra Llamadas si la temporada no tiene fechas', async () => {
    await i18n.changeLanguage('es')
    render(
      <SeasonCard season={{ ...season, modo_llamadas_desde: null, modo_llamadas_hasta: null }} />,
    )
    expect(screen.queryByText(/Llamadas/)).not.toBeInTheDocument()
  })
})
