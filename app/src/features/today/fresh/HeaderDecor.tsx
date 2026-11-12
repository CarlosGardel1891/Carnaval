import type { Look } from '../../../design/looks'

/**
 * El adorno del encabezado de cada dirección (decisión 91). Es sólo dibujo: no lleva texto ni
 * se anuncia a los lectores de pantalla, y nunca pasa por encima del título.
 */

/** Tablado: una guirnalda de bombitas de colores, colgando de lado a lado. */
function Garland() {
  const bulbs = [
    { x: 14, y: 15, c: '#ffc247' },
    { x: 52, y: 22, c: '#ff7a70' },
    { x: 90, y: 26, c: '#4fd6cf' },
    { x: 128, y: 27, c: '#ffc247' },
    { x: 166, y: 25, c: '#ff7cc4' },
    { x: 204, y: 21, c: '#b79bff' },
    { x: 242, y: 16, c: '#ffc247' },
    { x: 280, y: 21, c: '#4fd6cf' },
    { x: 318, y: 25, c: '#ff7a70' },
    { x: 356, y: 26, c: '#ffc247' },
    { x: 394, y: 23, c: '#9bdc6a' },
  ]
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 408 44"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 top-[env(safe-area-inset-top)] h-11 w-full"
    >
      <path
        d="M-4 8 C 60 30, 180 32, 244 12 C 300 30, 370 30, 412 18"
        fill="none"
        stroke="rgb(255 248 234 / 0.35)"
        strokeWidth="1.2"
      />
      {bulbs.map((bulb) => (
        <g key={bulb.x}>
          <circle cx={bulb.x} cy={bulb.y} r="9" fill={bulb.c} opacity="0.22" />
          <circle cx={bulb.x} cy={bulb.y} r="4.2" fill={bulb.c} />
          <circle cx={bulb.x - 1.2} cy={bulb.y - 1.2} r="1.3" fill="#fff" opacity="0.8" />
        </g>
      ))}
    </svg>
  )
}

/** Festiva: serpentinas y papelitos, arriba a la derecha. */
function Confetti() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 150"
      className="pointer-events-none absolute top-0 right-12 h-[150px] w-[200px]"
    >
      <path
        d="M96 -6 C 120 22, 84 34, 112 56 S 100 92, 128 104"
        fill="none"
        stroke="#ffd23f"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M168 -8 C 150 18, 190 30, 170 54 S 196 78, 178 96"
        fill="none"
        stroke="#ff5c8a"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M206 30 C 186 40, 204 58, 184 66"
        fill="none"
        stroke="#7be0ff"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect
        x="136"
        y="18"
        width="9"
        height="9"
        rx="2"
        fill="#ffffff"
        transform="rotate(24 140 22)"
      />
      <rect
        x="64"
        y="14"
        width="8"
        height="8"
        rx="2"
        fill="#7be0ff"
        transform="rotate(-18 68 18)"
      />
      <rect
        x="148"
        y="66"
        width="9"
        height="9"
        rx="2"
        fill="#ffd23f"
        transform="rotate(40 152 70)"
      />
      <rect x="80" y="52" width="7" height="7" rx="2" fill="#ff5c8a" transform="rotate(12 84 56)" />
      <circle cx="122" cy="26" r="4" fill="#ff5c8a" />
      <circle cx="190" cy="112" r="4" fill="#ffffff" />
      <circle cx="144" cy="98" r="3.5" fill="#7be0ff" />
      <circle cx="46" cy="30" r="3" fill="#ffd23f" />
      <circle cx="104" cy="118" r="3" fill="#ffffff" opacity="0.8" />
    </svg>
  )
}

/** Clara: unos pocos papelitos, apenas, junto al borde. */
function Sprinkle() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 80"
      className="pointer-events-none absolute top-[env(safe-area-inset-top)] right-12 h-20 w-[120px] opacity-90"
    >
      <rect x="18" y="22" width="8" height="8" rx="2" fill="#e5484d" transform="rotate(20 22 26)" />
      <rect
        x="62"
        y="10"
        width="7"
        height="7"
        rx="2"
        fill="#0fa3a0"
        transform="rotate(-24 65 13)"
      />
      <rect x="88" y="44" width="8" height="8" rx="2" fill="#8e5bd9" transform="rotate(34 92 48)" />
      <circle cx="44" cy="46" r="3.5" fill="#e8a400" />
      <circle cx="100" cy="18" r="3" fill="#e0409f" />
      <circle cx="70" cy="62" r="3" fill="#0448a7" opacity="0.5" />
    </svg>
  )
}

export function HeaderDecor({ look }: { look: Look }) {
  if (look === 'tablado') return <Garland />
  if (look === 'festiva') return <Confetti />
  return <Sprinkle />
}
