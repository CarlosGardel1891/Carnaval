# Fichas y declaraciones de las tiendas

Lo que hay que cargar en Play Console y en App Store Connect, con la respuesta de cada formulario. Los textos de las fichas están en `tiendas/fichas.json` (un test controla sus largos); los gráficos, en `tiendas/graficos/` (`pnpm gen:tiendas`).

Si cambia qué datos maneja la app, cambian juntos este archivo, la política (`sitio/content.mjs`), «Acerca de» (`app/src/locales`) y el manifest de iOS (`app/ios/App/App/PrivacyInfo.xcprivacy`).

Reglas verificadas en las fuentes oficiales el 2026-11-12; los enlaces están al final.

## Datos comunes

| Campo | Valor |
| --- | --- |
| Nombre de la app | Carnavalero |
| Identificador | `uy.carnavalero.app` |
| Categoría | Entretenimiento (en App Store, secundaria: Viajes) |
| Precio | Gratis, sin compras dentro de la app y sin publicidad |
| Mail de contacto | martincastaldi12@gmail.com |
| Política de privacidad | <https://carnavalero.vercel.app/privacidad> (en inglés: `/privacy`) |
| Soporte | <https://carnavalero.vercel.app/soporte> (en inglés: `/support`) |
| Borrado de datos | <https://carnavalero.vercel.app/borrar-datos> (en inglés: `/delete-data`) |
| Idiomas | Español (principal) e inglés |
| Países | Todos |

## Google Play

### Ficha (Presencia en Play Store → Ficha principal)

- Idioma predeterminado: español (Latinoamérica). Agregar la traducción al inglés (Estados Unidos).
- Título, descripción corta y descripción completa: `googlePlay.es` y `googlePlay.en` de `fichas.json`.
- Ícono: `tiendas/graficos/play-icono-512.png`.
- Gráfico destacado: `tiendas/graficos/play-destacado-1024x500.png`.
- Capturas de teléfono: entre 2 y 8 por idioma; para que Google pueda promocionar la app, al menos 4 de 1080 px o más.

### Contenido de la app

| Formulario | Respuesta |
| --- | --- |
| Política de privacidad | La dirección de arriba |
| Acceso a la app | Toda la app está disponible sin restricciones (no hay inicio de sesión) |
| Anuncios | No contiene anuncios |
| Clasificación de contenido (IARC) | Categoría «Referencia, noticias o educación» o «Utilidad». Todas las respuestas de contenido en «No»: sin violencia, sexo, lenguaje, drogas, apuestas; no hay contenido generado por usuarios ni interacción entre usuarios; no comparte la ubicación |
| Público objetivo | 13 años o más. No está dirigida a niños |
| App de noticias | No |
| Salud, finanzas, gobierno | No aplica |
| ID de publicidad | La app no lo usa |

### Seguridad de los datos

- ¿La app recopila o comparte datos del usuario? **Sí** (recopila; no comparte).
- ¿Todos los datos se cifran en tránsito? **Sí.**
- ¿Hay una forma de pedir que se borren los datos? **Sí.** Dirección: <https://carnavalero.vercel.app/borrar-datos>.

Tipos de datos que se declaran como **recopilados** (ninguno como compartido, todos para «Funcionalidad de la app», ninguno obligatorio salvo donde se indica):

| Tipo | Qué es | Vinculado al usuario | Obligatorio |
| --- | --- | --- | --- |
| ID de dispositivo u otros IDs | El identificador de la instalación que usa Firebase para las notificaciones y el identificador de la sesión anónima | Sí | Opcional: sólo si se sigue un conjunto o se activan los avisos |
| Actividad en la app → Otras acciones | Los conjuntos que se siguen | Sí | Opcional |
| Información y rendimiento de la app → Registros de fallos | Los reportes de errores (Sentry), sin identidad | No | Se recopila siempre |

**No se declara** la ubicación: se usa sólo en el teléfono y no se envía (decisión 90). El permiso de ubicación igual aparece en la ficha, porque la app lo pide.

### Cuenta y borrado

La app no tiene cuentas creadas por el usuario. Aun así ofrece borrar los datos desde la app («Acerca de» → «Borrar mis datos») y explica cómo en la dirección de borrado.

### Prueba cerrada y producción

Si Play Console muestra el requisito para cuentas personales nuevas: prueba cerrada con al menos 12 testers inscriptos durante 14 días seguidos y, después, el pedido de acceso a producción. Las respuestas del pedido salen de `docs/QA.md` (qué se probó, qué se cambió con lo que dijeron los testers).

## App Store

### Ficha (App Store Connect → la app → versión 1.0)

- Idioma principal: español (México o España; Apple no tiene español de Uruguay). Agregar inglés (EE. UU.).
- Nombre, subtítulo, texto promocional, palabras clave y descripción: `appStore.es` y `appStore.en` de `fichas.json`.
- URL de soporte y URL de la política de privacidad: las de arriba.
- Capturas de iPhone: un juego de 6,9" (1320×2868 o 1290×2796) y uno de 6,3" (1206×2622 o 1179×2556), por idioma. No hacen falta de iPad: la app es sólo para iPhone.
- Copyright: `2027 Carnavalero`.

### Privacidad de la app

- ¿Recopilan datos de esta app? **Sí.**

| Tipo de dato | Para qué | Vinculado al usuario | Rastreo |
| --- | --- | --- | --- |
| Identificadores → ID de usuario (el de la sesión anónima) | Funcionalidad de la app | Sí | No |
| Identificadores → ID de dispositivo (el de las notificaciones) | Funcionalidad de la app | Sí | No |
| Datos de uso → Interacción con el producto (los conjuntos seguidos) | Funcionalidad de la app | Sí | No |
| Diagnóstico → Datos de fallos (Sentry) | Funcionalidad de la app | No | No |

No se declara la ubicación: lo que se procesa sólo en el dispositivo no cuenta como recopilado. La app no rastrea: no hay pedido de seguimiento (ATT).

Es lo mismo que dice `PrivacyInfo.xcprivacy`.

### Clasificación por edad

Todas las respuestas en «No» o «Ninguno»: sin controles parentales ni verificación de edad que declarar, sin acceso web sin restricciones (los enlaces se abren en el navegador del teléfono), sin contenido generado por usuarios, sin mensajería ni publicidad, sin temas para adultos, médicos, de violencia ni de apuestas. Resultado esperado: **4+**.

### Cifrado

`ITSAppUsesNonExemptEncryption` está en `NO` en `Info.plist`: la app sólo usa el cifrado del sistema (HTTPS). App Store Connect no pregunta nada más.

### Borrado de la cuenta

Apple exige poder borrar también las cuentas que la app crea sola. Está en la app: «Hoy» → ícono de información → «Borrar mis datos». Decirlo en las notas para la revisión.

### Notas para la revisión (App Review Information)

Contacto: el mail de arriba y un teléfono. No hace falta usuario de prueba: la app no tiene inicio de sesión.

Texto de las notas (en inglés):

> Carnavalero is a guide to Uruguay's carnival. Its main content is seasonal: the nightly lineup of performances exists only during the carnival season, from late January to early March 2027. Before the season starts, the "Today" tab is empty by design and says so; the Calendar, Groups and Llamadas tabs already show real content.
>
> The attached video shows the app with a real night of the previous season (February 28, 2026), so you can see how "Today", the map, following a group and the Llamadas parade mode work in season.
>
> No account or sign-in is needed. An anonymous session is created only when the user taps "Follow" on a group. That anonymous data can be deleted in the app: Today → information icon (top right) → "Delete my data".
>
> Location is optional and is only used on the device to sort stages by distance; it is never sent to our servers. Notifications are optional and are only requested after the user follows a group.

Adjuntar el video de la noche real (`tiendas/graficos/`, ver `docs/QA.md`).

## Fuentes

- Target API de Google Play: <https://support.google.com/googleplay/android-developer/answer/11926878?hl=en>
- Prueba cerrada para cuentas personales nuevas: <https://support.google.com/googleplay/android-developer/answer/14151465?hl=en>
- Seguridad de los datos: <https://support.google.com/googleplay/android-developer/answer/10787469?hl=en>
- Borrado de cuentas en Google Play: <https://support.google.com/googleplay/android-developer/answer/13327111?hl=en>
- Clasificación de contenido en Google Play: <https://support.google.com/googleplay/android-developer/answer/9859655?hl=en>
- Recursos gráficos de Google Play: <https://support.google.com/googleplay/android-developer/answer/9866151?hl=en>
- Requisitos de Xcode y SDK: <https://developer.apple.com/news/upcoming-requirements/>
- Manifest de privacidad y APIs con motivo: <https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api>
- SDK de terceros que exigen manifest: <https://developer.apple.com/support/third-party-SDK-requirements/>
- Privacidad de la app en App Store: <https://developer.apple.com/app-store/app-privacy-details/>
- Clasificación por edad de Apple: <https://developer.apple.com/help/app-store-connect/reference/age-ratings-values-and-definitions>
- Cifrado y exportación: <https://developer.apple.com/documentation/security/complying-with-encryption-export-regulations>
- Borrado de cuentas en App Store: <https://developer.apple.com/support/offering-account-deletion-in-your-app/>
- Capturas de App Store: <https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications>
- TestFlight: <https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview>
