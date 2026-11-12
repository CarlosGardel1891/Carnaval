// Los textos del sitio público de Carnavalero (decisión 83), en español y en inglés. Las dos
// versiones de cada página tienen las mismas secciones, en el mismo orden: hay un test que lo
// controla. `{contacto}` se reemplaza por el mail de `site.config.json`.
//
// Si cambia qué datos maneja la app, cambia acá, en «Acerca de» (app/src/locales) y en las
// declaraciones de las dos tiendas (tiendas/).

export const VIGENCIA = { es: '12 de noviembre de 2026', en: 'November 12, 2026' }

/** Las páginas, con la ruta de cada idioma. */
export const PAGES = {
  home: { es: '/', en: '/en' },
  privacy: { es: '/privacidad', en: '/privacy' },
  deletion: { es: '/borrar-datos', en: '/delete-data' },
  support: { es: '/soporte', en: '/support' },
}

export const CHROME = {
  es: {
    lang: 'es',
    other: 'English',
    nav: {
      home: 'Inicio',
      privacy: 'Privacidad',
      deletion: 'Borrar mis datos',
      support: 'Soporte',
    },
    footer: 'Carnavalero es una app independiente. No es una app oficial del carnaval.',
  },
  en: {
    lang: 'en',
    other: 'Español',
    nav: { home: 'Home', privacy: 'Privacy', deletion: 'Delete my data', support: 'Support' },
    footer: 'Carnavalero is an independent app. It is not an official carnival app.',
  },
}

export const CONTENT = {
  es: {
    home: {
      title: 'Carnavalero',
      description: 'El carnaval de Uruguay en tu teléfono: qué hay hoy, dónde y a qué hora.',
      lead: 'Qué hay de carnaval hoy, cerca tuyo y gratis. Y la guía de las Llamadas.',
      sections: [
        {
          h: 'Qué es',
          p: [
            'Carnavalero es una app para iPhone y Android con la información del carnaval en Uruguay: qué conjunto actúa hoy, en qué escenario y a qué hora, el calendario de la temporada, el Concurso Oficial y un modo especial para el Desfile de Llamadas.',
            'Es gratis, no tiene publicidad y no pide registro.',
          ],
        },
        {
          h: 'Dónde está',
          p: [
            'En el App Store y en Google Play, desde antes del Desfile Inaugural de 2027. Este sitio no es una versión web de la app: sólo tiene su política de privacidad, el soporte y cómo borrar tus datos.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Política de privacidad',
      description: 'Qué datos maneja Carnavalero, para qué, con quién y cómo se borran.',
      lead: 'En corto: Carnavalero no te pide nombre, mail ni registro, no usa tu ubicación fuera de tu teléfono, no tiene publicidad y no vende ni comparte datos para publicidad.',
      sections: [
        {
          h: 'Quiénes somos',
          p: [
            'Carnavalero es una app independiente sobre el carnaval de Uruguay. No es una app oficial ni depende de DAECPU ni de la Intendencia de Montevideo. Por cualquier consulta sobre esta política, escribinos a {contacto}.',
          ],
        },
        {
          h: 'Qué guardamos',
          p: [
            'Mientras sólo mirás la app, no guardamos nada tuyo. Recién cuando tocás «Seguir» en un conjunto se crea una sesión anónima: un identificador al azar, sin nombre, mail ni teléfono. A partir de ahí guardamos:',
          ],
          ul: [
            'La sesión anónima: el identificador al azar y cuándo se usó por última vez.',
            'Los conjuntos que seguís.',
            'Si activaste los avisos: el identificador que tu teléfono usa para recibir notificaciones, si es Android o iPhone, y el idioma de la app, para mandarte el aviso en ese idioma.',
            'Qué avisos ya te mandamos, para no repetirlos.',
          ],
        },
        {
          h: 'Qué no guardamos',
          ul: [
            'Tu nombre, mail, teléfono, contactos, fotos o archivos.',
            'Tu ubicación.',
            'Identificadores de publicidad. La app no tiene publicidad ni te sigue entre apps o sitios.',
          ],
        },
        {
          h: 'Tu ubicación',
          p: [
            'La app te pide la ubicación sólo si tocás «Cerca mío» o si querés verte en el mapa. Se usa en tu teléfono, para ordenar los escenarios por cercanía: no se guarda ni se envía a nuestros servidores ni a nadie. Si no das el permiso, la app anda igual, sin distancias.',
          ],
        },
        {
          h: 'Qué queda en tu teléfono',
          p: [
            'Para abrir rápido y andar sin señal, la app guarda en tu teléfono la sesión anónima, la última grilla que bajó (hasta 24 horas; lo de las Llamadas, hasta una semana) y el idioma. Se borra al borrar tus datos desde la app o al desinstalarla.',
          ],
        },
        {
          h: 'Para qué usamos los datos',
          p: [
            'Sólo para que la app funcione: mostrarte «mis conjuntos» y avisarte cuando un conjunto que seguís actúa hoy, cambia de hora o de lugar, o se suspende. No armamos perfiles, no usamos los datos para publicidad y no los vendemos.',
          ],
        },
        {
          h: 'Con quién trabajamos',
          p: [
            'Para funcionar, la app usa los servicios de estas empresas, que procesan datos por cuenta nuestra:',
          ],
          ul: [
            'Supabase: guarda la base de datos y las sesiones anónimas, en servidores en San Pablo, Brasil.',
            'Google Firebase Cloud Messaging: entrega las notificaciones a tu teléfono. Para eso le asigna a la app instalada un identificador propio.',
            'MapTiler: sirve las imágenes del mapa. Cuando abrís el mapa, tu teléfono se las pide directamente y MapTiler ve tu dirección IP y la zona del mapa que estás mirando, no tu ubicación.',
            'Sentry: recibe los reportes de errores de la app (qué falló, en qué pantalla, la versión de la app y el modelo y sistema del teléfono), sin tu identidad y sin guardar tu dirección IP.',
            'Vercel: aloja este sitio.',
          ],
          after: [
            'Como cualquier servicio de internet, estos proveedores pueden registrar la dirección IP de cada pedido en sus registros técnicos, por seguridad y por un tiempo limitado. Nosotros no la usamos para identificarte.',
          ],
        },
        {
          h: 'Cuánto tiempo',
          p: [
            'Tus datos se guardan hasta que los borres. Además, las sesiones anónimas que pasan 13 meses sin usarse se borran solas, con todo lo suyo: es una temporada de carnaval y un mes, para que quien vuelve al carnaval siguiente encuentre sus conjuntos.',
          ],
        },
        {
          h: 'Cómo borrar tus datos',
          p: [
            'Desde la app: en «Hoy», tocá el ícono de información de arriba a la derecha y después «Borrar mis datos». Se borran en el momento la sesión anónima, los conjuntos que seguís, el registro de tu teléfono para los avisos y lo que la app tenía guardado. Hay una página con el paso a paso: {borrar}.',
            'Desinstalar la app borra lo que estaba en tu teléfono, pero no lo que estaba en nuestros servidores: eso se borra solo a los 13 meses, o antes si lo borrás desde la app.',
          ],
        },
        {
          h: 'Tus derechos',
          p: [
            'La ley uruguaya de protección de datos personales (Ley N.º 18.331) te da derecho a acceder a tus datos, corregirlos y borrarlos, y a reclamar ante la Unidad Reguladora y de Control de Datos Personales (URCDP). Como no sabemos quién sos, no podemos buscar tus datos a partir de un nombre o un mail: el acceso y el borrado se hacen desde la app, en tu teléfono. Si tenés un problema para hacerlo, escribinos a {contacto} y te ayudamos.',
          ],
        },
        {
          h: 'Menores',
          p: [
            'Carnavalero es para todo público y no pide datos personales a nadie, tampoco a menores.',
          ],
        },
        {
          h: 'Cambios en esta política',
          p: [
            'Si cambia qué datos maneja la app, vamos a actualizar esta página y la fecha de abajo antes de publicar el cambio.',
          ],
        },
        {
          h: 'Contacto',
          p: ['{contacto}'],
        },
      ],
    },
    deletion: {
      title: 'Borrar mis datos',
      description: 'Cómo borrar los datos que Carnavalero guarda de vos.',
      lead: 'Podés borrar todo lo que Carnavalero guarda de vos desde la app, en el momento y sin pedírselo a nadie.',
      sections: [
        {
          h: 'Desde la app',
          ol: [
            'Abrí Carnavalero.',
            'En «Hoy», tocá el ícono de información, arriba a la derecha.',
            'Tocá «Borrar mis datos» y confirmá.',
          ],
        },
        {
          h: 'Qué se borra',
          ul: [
            'Tu sesión anónima.',
            'Los conjuntos que seguís.',
            'El registro de tu teléfono para recibir avisos, y los avisos que te habíamos mandado.',
            'Lo que la app tenía guardado en tu teléfono.',
          ],
          after: [
            'Se borra en el momento y no se puede deshacer. No queda nada guardado: no hay datos que conservemos después.',
          ],
        },
        {
          h: 'Si ya desinstalaste la app',
          p: [
            'Carnavalero no sabe quién sos: no hay nombre ni mail con el que buscar tus datos, así que no podemos borrarlos por vos a partir de un pedido. Tenés dos caminos: volver a instalar la app en el mismo teléfono y borrarlos desde ahí, si la sesión se conservó, o esperar: las sesiones anónimas sin uso se borran solas a los 13 meses, con todo lo suyo.',
          ],
        },
        {
          h: 'Si necesitás ayuda',
          p: ['Escribinos a {contacto}. Más detalle en la política de privacidad: {privacidad}.'],
        },
      ],
    },
    support: {
      title: 'Soporte',
      description: 'Ayuda y contacto de Carnavalero.',
      lead: '¿Algo no anda, o un dato está mal? Escribinos.',
      sections: [
        {
          h: 'Contacto',
          p: [
            'Escribinos a {contacto}. Si es un dato mal cargado, contanos qué conjunto, qué escenario y qué noche. Si es un problema de la app, contanos qué teléfono tenés y qué estabas haciendo.',
          ],
        },
        {
          h: 'Preguntas frecuentes',
          dl: [
            [
              '¿De dónde sale la información?',
              'De fuentes públicas: DAECPU, la Intendencia de Montevideo y la prensa. La cargamos a mano cada día de la temporada. Si un escenario cambia algo a último momento, puede tardar en verse.',
            ],
            [
              '¿Por qué no veo nada en «Hoy»?',
              'Fuera de la temporada (de fines de enero a principios de marzo) no hay actuaciones. El calendario y los conjuntos se ven todo el año.',
            ],
            [
              '¿Por qué no me llegan los avisos?',
              'Tenés que seguir al menos un conjunto y haber aceptado las notificaciones. Fijate también que estén permitidas para Carnavalero en los ajustes del teléfono.',
            ],
            [
              '¿Cuesta algo?',
              'No. La app es gratis y no tiene publicidad. Las entradas a los escenarios pagos se compran aparte, a quien las vende.',
            ],
          ],
        },
      ],
    },
  },

  en: {
    home: {
      title: 'Carnavalero',
      description: "Uruguay's carnival on your phone: what's on tonight, where and at what time.",
      lead: "What's on in carnival tonight, near you and free. Plus a guide to the Llamadas parade.",
      sections: [
        {
          h: 'What it is',
          p: [
            'Carnavalero is an iPhone and Android app about carnival in Uruguay: which group performs tonight, on which stage and at what time, the season calendar, the Official Contest and a special mode for the Llamadas parade.',
            'It is free, has no ads and needs no sign-up.',
          ],
        },
        {
          h: 'Where to get it',
          p: [
            'On the App Store and Google Play, from before the 2027 Opening Parade. This site is not a web version of the app: it only holds its privacy policy, support and how to delete your data.',
          ],
        },
      ],
    },
    privacy: {
      title: 'Privacy policy',
      description: 'What data Carnavalero handles, what for, with whom, and how it is deleted.',
      lead: "In short: Carnavalero doesn't ask for your name, email or sign-up, doesn't use your location outside your phone, has no ads and doesn't sell or share data for advertising.",
      sections: [
        {
          h: 'Who we are',
          p: [
            'Carnavalero is an independent app about carnival in Uruguay. It is not an official app and is not run by DAECPU or the Montevideo city government. For any question about this policy, write to {contacto}.',
          ],
        },
        {
          h: 'What we store',
          p: [
            'While you only browse the app, we store nothing about you. Only when you tap “Follow” on a group is an anonymous session created: a random identifier, with no name, email or phone number. From then on we store:',
          ],
          ul: [
            'The anonymous session: the random identifier and when it was last used.',
            'The groups you follow.',
            'If you turned on notifications: the identifier your phone uses to receive notifications, whether it is Android or iPhone, and the app language, so the notification reaches you in that language.',
            'Which notifications we already sent you, so we do not repeat them.',
          ],
        },
        {
          h: "What we don't store",
          ul: [
            'Your name, email, phone number, contacts, photos or files.',
            'Your location.',
            'Advertising identifiers. The app has no ads and does not track you across apps or sites.',
          ],
        },
        {
          h: 'Your location',
          p: [
            'The app asks for your location only if you tap “Near me” or want to see yourself on the map. It is used on your phone, to sort stages by distance: it is never stored or sent to our servers or to anyone else. If you decline, the app works the same, without distances.',
          ],
        },
        {
          h: 'What stays on your phone',
          p: [
            'To open fast and work offline, the app keeps on your phone the anonymous session, the last schedule it downloaded (up to 24 hours; Llamadas data, up to a week) and the language. It is removed when you delete your data from the app or uninstall it.',
          ],
        },
        {
          h: 'What we use the data for',
          p: [
            'Only to make the app work: showing “my groups” and notifying you when a group you follow performs today, changes time or place, or is called off. We build no profiles, do not use the data for advertising and do not sell it.',
          ],
        },
        {
          h: 'Who we work with',
          p: [
            'To work, the app relies on services from these companies, which process data on our behalf:',
          ],
          ul: [
            'Supabase: hosts the database and the anonymous sessions, on servers in São Paulo, Brazil.',
            'Google Firebase Cloud Messaging: delivers notifications to your phone. To do so it assigns the installed app an identifier of its own.',
            'MapTiler: serves the map images. When you open the map, your phone requests them directly and MapTiler sees your IP address and the area of the map you are viewing, not your location.',
            'Sentry: receives the app’s error reports (what failed, on which screen, the app version and the phone model and system), without your identity and without storing your IP address.',
            'Vercel: hosts this site.',
          ],
          after: [
            'Like any internet service, these providers may record the IP address of each request in their technical logs, for security and for a limited time. We do not use it to identify you.',
          ],
        },
        {
          h: 'How long',
          p: [
            'Your data is kept until you delete it. In addition, anonymous sessions unused for 13 months are deleted automatically, with everything attached to them: that is one carnival season plus a month, so those who come back next carnival find their groups.',
          ],
        },
        {
          h: 'How to delete your data',
          p: [
            'From the app: on “Today”, tap the information icon at the top right and then “Delete my data”. The anonymous session, the groups you follow, your phone’s registration for notifications and what the app kept on your phone are deleted on the spot. There is a step-by-step page: {borrar}.',
            'Uninstalling the app removes what was on your phone, but not what was on our servers: that is deleted automatically after 13 months, or sooner if you delete it from the app.',
          ],
        },
        {
          h: 'Your rights',
          p: [
            "Uruguay's personal data protection law (Law No. 18,331) gives you the right to access, correct and delete your data, and to complain to the data protection authority (URCDP). Because we do not know who you are, we cannot look up your data from a name or an email: access and deletion happen from the app, on your phone. If you have trouble doing it, write to {contacto} and we will help.",
          ],
        },
        {
          h: 'Children',
          p: [
            'Carnavalero is suitable for everyone and asks no one for personal data, children included.',
          ],
        },
        {
          h: 'Changes to this policy',
          p: [
            'If the data the app handles changes, we will update this page and the date below before releasing the change.',
          ],
        },
        {
          h: 'Contact',
          p: ['{contacto}'],
        },
      ],
    },
    deletion: {
      title: 'Delete my data',
      description: 'How to delete the data Carnavalero stores about you.',
      lead: 'You can delete everything Carnavalero stores about you from the app, on the spot and without asking anyone.',
      sections: [
        {
          h: 'From the app',
          ol: [
            'Open Carnavalero.',
            'On “Today”, tap the information icon at the top right.',
            'Tap “Delete my data” and confirm.',
          ],
        },
        {
          h: 'What gets deleted',
          ul: [
            'Your anonymous session.',
            'The groups you follow.',
            'Your phone’s registration for notifications, and the notifications we had sent you.',
            'What the app kept on your phone.',
          ],
          after: [
            'It is deleted on the spot and cannot be undone. Nothing is kept: there is no data we retain afterwards.',
          ],
        },
        {
          h: 'If you already uninstalled the app',
          p: [
            'Carnavalero does not know who you are: there is no name or email to look your data up by, so we cannot delete it for you from a request. You have two options: reinstall the app on the same phone and delete it from there, if the session was kept, or wait: unused anonymous sessions are deleted automatically after 13 months, with everything attached to them.',
          ],
        },
        {
          h: 'If you need help',
          p: ['Write to {contacto}. More detail in the privacy policy: {privacidad}.'],
        },
      ],
    },
    support: {
      title: 'Support',
      description: 'Carnavalero help and contact.',
      lead: 'Something not working, or a detail is wrong? Write to us.',
      sections: [
        {
          h: 'Contact',
          p: [
            'Write to {contacto}. If a detail is wrong, tell us which group, which stage and which night. If it is a problem with the app, tell us which phone you have and what you were doing.',
          ],
        },
        {
          h: 'Frequently asked questions',
          dl: [
            [
              'Where does the information come from?',
              'From public sources: DAECPU, the Montevideo city government and the press. We enter it by hand every day of the season. If a stage changes something at the last minute, it may take a while to show.',
            ],
            [
              'Why is “Today” empty?',
              'Outside the season (late January to early March) there are no performances. The calendar and the groups are there all year.',
            ],
            [
              "Why don't I get notifications?",
              'You need to follow at least one group and to have accepted notifications. Also check they are allowed for Carnavalero in your phone settings.',
            ],
            [
              'Does it cost anything?',
              'No. The app is free and has no ads. Tickets for paid stages are bought separately, from whoever sells them.',
            ],
          ],
        },
      ],
    },
  },
}
