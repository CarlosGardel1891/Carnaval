import type { SVGProps } from 'react'

/**
 * Los íconos de la app: un solo juego, de trazo redondeado, todos sobre la misma grilla de
 * 24 px (decisión 92). Son adorno: el texto de al lado dice lo que hacen, o el botón lleva su
 * `aria-label`.
 */

type IconProps = SVGProps<SVGSVGElement>

function Icon({ children, className = 'size-6', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5Z" />
    <path d="M9.5 20.5v-5.5h5v5.5" />
  </Icon>
)

export const DrumIcon = (props: IconProps) => (
  <Icon {...props}>
    <ellipse cx="12" cy="9" rx="7.5" ry="3" />
    <path d="M4.5 9v6.5c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V9" />
    <path d="M8.5 11.7v6.2M15.5 11.7v6.2" />
  </Icon>
)

export const MapPinIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 21s7-5.9 7-11.3A7 7 0 0 0 5 9.7C5 15.1 12 21 12 21Z" />
    <circle cx="12" cy="9.7" r="2.4" />
  </Icon>
)

export const UsersIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="9" cy="8.2" r="3.4" />
    <path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0" />
    <path d="M15.8 5.1a3.4 3.4 0 0 1 0 6.2M17.6 14.1a6.2 6.2 0 0 1 3.6 5.4" />
  </Icon>
)

export const CalendarIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
)

export const InfoIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 7.6v.4" />
  </Icon>
)

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Icon>
)

export const ChevronRightIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
)

export const ChevronLeftIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
)

export const ShareIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 15V4M8 7.5 12 3.5l4 4" />
    <path d="M5.5 12v6.5A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V12" />
  </Icon>
)

export const HeartIcon = ({ filled = false, ...props }: IconProps & { filled?: boolean }) => (
  <Icon {...props} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7.5-4.5-7.5-10A4.2 4.2 0 0 1 12 7.4 4.2 4.2 0 0 1 19.5 10c0 5.5-7.5 10-7.5 10Z" />
  </Icon>
)

export const NearIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M20.5 3.5 3.5 10.6l7 2.9 2.9 7 7.1-17Z" />
  </Icon>
)

export const RefreshIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.3-5.4" />
    <path d="M19.5 4.5v4.2h-4.2" />
  </Icon>
)

export const CloseIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
  </Icon>
)

export const ClockIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
)

export const TicketIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h13A1.5 1.5 0 0 1 20 8.5V10a2 2 0 0 0 0 4v1.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.500V14a2 2 0 0 0 0-4V8.5Z" />
    <path d="M14 7.5v9" strokeDasharray="1.5 2.5" />
  </Icon>
)

export const InstagramIcon = (props: IconProps) => (
  <Icon {...props}>
    <rect x="4" y="4" width="16" height="16" rx="4.5" />
    <circle cx="12" cy="12" r="3.6" />
    <path d="M16.8 7.2v.1" />
  </Icon>
)

export const FacebookIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14.5 21v-7.5h2.6l.4-3h-3V8.700c0-.9.4-1.500 1.600-1.500H17.500V4.500a15 15 0 0 0-2.100-.2c-2.300 0-3.900 1.400-3.900 4v2.200H9v3h2.500V21" />
  </Icon>
)

export const BellIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M6 16.500V11a6 6 0 1 1 12 0v5.500l1.500 2h-15l1.500-2Z" />
    <path d="M10 20.500a2.200 2.200 0 0 0 4 0" />
  </Icon>
)

export const ShieldIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 3.500 5 6v5.500c0 4.300 2.900 7.400 7 9 4.100-1.600 7-4.700 7-9V6l-7-2.500Z" />
    <path d="m9 12 2.200 2.200L15.200 10" />
  </Icon>
)

export const TrashIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M4.500 7h15M9.500 7V4.500h5V7M6.500 7l.8 12a1.500 1.500 0 0 0 1.500 1.500h6.400a1.500 1.500 0 0 0 1.500-1.500l.8-12" />
  </Icon>
)
