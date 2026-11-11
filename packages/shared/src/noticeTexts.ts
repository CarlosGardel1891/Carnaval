/**
 * Los textos de los avisos push, en los dos idiomas. Es el i18n de los avisos: ningún texto
 * se escribe en la lógica (`notices.ts`). Las variables van entre llaves dobles. Los dos
 * catálogos tienen que tener las mismas claves (el tipo lo exige y hay un test).
 */
export const noticeTexts = {
  es: {
    /** Idioma con el que se formatean horas y fechas. */
    locale: 'es-UY',
    tonight: 'hoy',
    otherNight: 'el {{weekday}} {{date}}',
    slot: '{{time}} en {{stage}}',
    slotSeparator: ' · ',
    groupLine: '{{group}}: {{detail}}',
    more_one: 'y {{count}} más',
    more_other: 'y {{count}} más',

    dailyOneTitle: 'Hoy actúa {{group}}',
    dailyOneBody: 'A las {{time}} en {{stage}}.',
    dailyManyTitle: 'Hoy actúan {{count}} de tus conjuntos',

    suspendedTitle: '{{group}}: actuación suspendida',
    suspendedBody: 'Era {{when}} a las {{time}} en {{stage}}.',
    changedTitle: '{{group}}: cambió la actuación',
    changedBody: 'Ahora es {{when}} a las {{time}} en {{stage}}.',
    changedBodyWas: 'Ahora es {{when}} a las {{time}} en {{stage}} (antes, a las {{before}}).',
    resumedTitle: '{{group}}: vuelve a actuar',
    resumedBody: 'Actúa {{when}} a las {{time}} en {{stage}}.',
    changesTitle: 'Cambios en tus conjuntos',
    suspendedLine: '{{group}}: suspendida ({{when}}, {{time}} en {{stage}})',
    changedLine: '{{group}}: ahora {{when}}, {{time}} en {{stage}}',
  },
  en: {
    locale: 'en-US',
    tonight: 'tonight',
    otherNight: 'on {{weekday}}, {{date}}',
    slot: '{{time}} at {{stage}}',
    slotSeparator: ' · ',
    groupLine: '{{group}}: {{detail}}',
    more_one: 'and {{count}} more',
    more_other: 'and {{count}} more',

    dailyOneTitle: '{{group}} performs tonight',
    dailyOneBody: 'At {{time}} at {{stage}}.',
    dailyManyTitle: '{{count}} of your groups perform tonight',

    suspendedTitle: '{{group}}: show cancelled',
    suspendedBody: 'It was {{when}} at {{time}} at {{stage}}.',
    changedTitle: '{{group}}: show changed',
    changedBody: "It's now {{when}} at {{time}} at {{stage}}.",
    changedBodyWas: "It's now {{when}} at {{time}} at {{stage}} (it was at {{before}}).",
    resumedTitle: '{{group}}: back on',
    resumedBody: 'Performing {{when}} at {{time}} at {{stage}}.',
    changesTitle: 'Changes to your groups',
    suspendedLine: '{{group}}: cancelled ({{when}}, {{time}} at {{stage}})',
    changedLine: '{{group}}: now {{when}}, {{time}} at {{stage}}',
  },
} as const satisfies Record<string, Record<NoticeTextKey, string>>

type NoticeTextKey =
  | 'locale'
  | 'tonight'
  | 'otherNight'
  | 'slot'
  | 'slotSeparator'
  | 'groupLine'
  | 'more_one'
  | 'more_other'
  | 'dailyOneTitle'
  | 'dailyOneBody'
  | 'dailyManyTitle'
  | 'suspendedTitle'
  | 'suspendedBody'
  | 'changedTitle'
  | 'changedBody'
  | 'changedBodyWas'
  | 'resumedTitle'
  | 'resumedBody'
  | 'changesTitle'
  | 'suspendedLine'
  | 'changedLine'

export type NoticeLanguage = keyof typeof noticeTexts
export type NoticeTexts = Record<NoticeTextKey, string>
