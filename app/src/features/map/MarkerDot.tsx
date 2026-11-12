import type { TipoEscenario } from '@cuerda/shared'
import { markerShape, MARKER_STROKE } from './markers'

/** El marcador de un tipo de escenario, como se ve en el mapa: para las referencias y la tarjeta. */
export function MarkerDot({
  tipo,
  className = 'size-6',
}: {
  tipo: TipoEscenario | null
  className?: string
}) {
  const shape = markerShape(tipo)
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ backgroundColor: shape.color }}
    >
      <svg viewBox="0 0 24 24" className="size-[55%]">
        <path d={shape.path} fill={MARKER_STROKE} />
      </svg>
    </span>
  )
}
