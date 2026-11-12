/**
 * Las ilustraciones de los estados vacíos (decisión 92): simples, en los colores de la marca y
 * livianas (son dibujos, no imágenes). Todas son adorno: el texto de al lado dice lo que pasa.
 */

const frame = 'h-28 w-40'

/** Una noche sin actuaciones: un tablado vacío bajo la luna. */
export function EmptyStageArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 112" className={frame} fill="none">
      <ellipse cx="80" cy="100" rx="62" ry="8" fill="#e8f0fd" />
      <circle cx="122" cy="26" r="13" fill="#ffc83d" />
      <circle cx="127" cy="22" r="11" fill="#f4f6fb" />
      <path
        d="M34 92V44a6 6 0 0 1 6-6h80a6 6 0 0 1 6 6v48"
        fill="#ffffff"
        stroke="#0448a7"
        strokeWidth="3"
      />
      <path
        d="M34 50c14 0 22-6 30-12M126 50c-14 0-22-6-30-12"
        stroke="#2f80ed"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M24 92h112" stroke="#0448a7" strokeWidth="4" strokeLinecap="round" />
      <path d="M52 30h56" stroke="#56ccf2" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="30" r="3.5" fill="#ffc83d" />
      <circle cx="80" cy="30" r="3.5" fill="#db2777" />
      <circle cx="100" cy="30" r="3.5" fill="#16a34a" />
      <rect
        x="20"
        y="20"
        width="7"
        height="5"
        rx="2.5"
        fill="#7c3aed"
        transform="rotate(-24 23 22)"
      />
      <rect
        x="140"
        y="58"
        width="7"
        height="5"
        rx="2.5"
        fill="#ea580c"
        transform="rotate(30 143 60)"
      />
    </svg>
  )
}

/** Sin conjuntos seguidos: un corazón con papelitos. */
export function EmptyHeartArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 112" className={frame} fill="none">
      <ellipse cx="80" cy="100" rx="52" ry="7" fill="#e8f0fd" />
      <path
        d="M80 90S44 68 44 42a18 18 0 0 1 36-6 18 18 0 0 1 36 6c0 26-36 48-36 48Z"
        fill="#ffffff"
        stroke="#0448a7"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M62 40a8 8 0 0 1 8-7" stroke="#56ccf2" strokeWidth="3" strokeLinecap="round" />
      <rect
        x="24"
        y="30"
        width="8"
        height="5"
        rx="2.5"
        fill="#ffc83d"
        transform="rotate(-30 28 32)"
      />
      <rect
        x="128"
        y="24"
        width="8"
        height="5"
        rx="2.5"
        fill="#db2777"
        transform="rotate(26 132 26)"
      />
      <rect
        x="134"
        y="66"
        width="7"
        height="5"
        rx="2.5"
        fill="#16a34a"
        transform="rotate(-18 137 68)"
      />
      <circle cx="30" cy="68" r="3.5" fill="#7c3aed" />
      <circle cx="112" cy="12" r="3" fill="#2f80ed" />
    </svg>
  )
}

/** No se pudo cargar: una nube sin señal. */
export function OfflineArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 112" className={frame} fill="none">
      <ellipse cx="80" cy="100" rx="52" ry="7" fill="#e8f0fd" />
      <path
        d="M52 78a20 20 0 0 1 2-39.900A26 26 0 0 1 104 34a22 22 0 0 1 6 44H52Z"
        fill="#ffffff"
        stroke="#0448a7"
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="m70 50 20 20M90 50 70 70" stroke="#c81e1e" strokeWidth="4" strokeLinecap="round" />
      <circle cx="132" cy="24" r="3.500" fill="#ffc83d" />
      <rect
        x="22"
        y="26"
        width="8"
        height="5"
        rx="2.500"
        fill="#56ccf2"
        transform="rotate(-24 26 28)"
      />
    </svg>
  )
}

/** Nada que coincida con los filtros o con la búsqueda: una lupa. */
export function EmptySearchArt() {
  return (
    <svg aria-hidden="true" viewBox="0 0 160 112" className={frame} fill="none">
      <ellipse cx="80" cy="100" rx="52" ry="7" fill="#e8f0fd" />
      <circle cx="72" cy="50" r="27" fill="#ffffff" stroke="#0448a7" strokeWidth="3.500" />
      <path d="m93 71 22 22" stroke="#0448a7" strokeWidth="6" strokeLinecap="round" />
      <path d="M60 44a13 13 0 0 1 12-9" stroke="#56ccf2" strokeWidth="3" strokeLinecap="round" />
      <rect
        x="126"
        y="28"
        width="8"
        height="5"
        rx="2.500"
        fill="#ffc83d"
        transform="rotate(24 130 30)"
      />
      <circle cx="26" cy="36" r="3.500" fill="#db2777" />
    </svg>
  )
}

/** El tambor del encabezado de Llamadas. */
export function DrumArt() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 96 110"
      className="h-[6.5rem] w-[5.75rem] shrink-0"
      fill="none"
    >
      <path d="M22 6 66 34M74 6 30 34" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
      <path d="M10 40v44c0 9 17 16 38 16s38-7 38-16V40" fill="#ffc83d" />
      <ellipse cx="48" cy="40" rx="38" ry="14" fill="#fff6dc" stroke="#ffffff" strokeWidth="3" />
      <path
        d="M12 52 30 92 48 58l18 34 18-40"
        stroke="#0448a7"
        strokeWidth="3.500"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M10 84c0 9 17 16 38 16s38-7 38-16" stroke="#e0a400" strokeWidth="3" />
    </svg>
  )
}
