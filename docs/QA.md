# QA: plan de pruebas y lista de verificación

Qué se prueba antes de mandar un build a una tienda, en qué teléfonos y cómo quedó cada pasada (decisión 80 en adelante). Los tests automáticos (`pnpm test`, `pnpm test:db`) cubren la lógica; esto cubre lo que sólo se ve con la app en la mano.

## Dónde se prueba

| Teléfono | Sistema | Para qué |
| --- | --- | --- |
| Emulador de Android del equipo (1080×2400) | Android 15 | Pasada completa de cada build |
| Emulador chico (crear un AVD de 4,7", 720×1280) | Android 7 (API 24), el mínimo | Que nada se corte ni se rompa en lo más viejo y más chico que se soporta |
| Emulador grande (crear un AVD de 6,8" o una tablet chica) | Android 16 (API 36) | Pantalla grande y el sistema más nuevo |
| iPhone del equipo | El iOS que tenga (mínimo iOS 15) | Pasada completa por TestFlight |
| Simulador de iPhone en la Mac | iOS 15 y el más nuevo | El mínimo, y los tamaños de las capturas |

Los AVD se crean en Android Studio → Device Manager. Para instalar el build: `pnpm android:release beta --apk` y `adb install -r …\app-release.apk` (`CLAUDE.md`, «Publicación»).

## Condiciones que se repiten en cada pantalla

1. **Sin señal:** `adb shell svc wifi disable` y `adb shell svc data disable` (en iPhone, modo avión). Abrir la app una vez con red antes. Tiene que mostrar lo último que bajó, con su aviso, y no quedarse cargando para siempre. Volver a prender la red al terminar.
2. **En inglés:** poner el teléfono en inglés. Ningún texto en español, salvo los nombres propios.
3. **Letra grande:** Ajustes → Pantalla → Tamaño de fuente al máximo (en iPhone, Accesibilidad → Texto más grande). Nada cortado ni encimado; todo se puede tocar.
4. **Primer arranque:** con la app recién instalada (`adb shell pm clear uy.carnavalero.app`). No pide ningún permiso al abrir.
5. **Permisos negados:** negar la ubicación y las notificaciones cuando las pide. La app sigue andando y explica qué se pierde.

## Qué se prueba, por pantalla

### Hoy
- [ ] Abre en menos de 3 segundos con red y muestra la grilla (en la beta, la de ejemplo, con su franja).
- [ ] «Por escenario» y «Por hora» muestran las mismas actuaciones.
- [ ] «Gratis», cada categoría y «Mis conjuntos» filtran; «Mis conjuntos» sin seguir a nadie muestra su estado vacío.
- [ ] «Cerca mío» pide la ubicación recién al tocarlo, ordena por distancia y avisa cuántos escenarios quedaron afuera por no tener ubicación.
- [ ] Con la ubicación aproximada, las distancias salen redondeadas y lo dice.
- [ ] Una actuación suspendida se ve como suspendida; una cambiada, como cambiada.
- [ ] «Actualizar» trae lo nuevo; la línea «Actualizado…» cambia.
- [ ] Una actuación de pasada la medianoche aparece en la noche anterior.
- [ ] En producción, fuera de temporada: «Hoy» vacío dice que no hay actuaciones, sin error.

### Mapa
- [ ] Carga el mapa (con la key de MapTiler) y los marcadores de los escenarios con ubicación.
- [ ] Sin key o sin red: marcadores sobre fondo liso, con su aviso.
- [ ] Tocar un marcador abre el escenario. La leyenda distingue los tipos sin depender sólo del color.
- [ ] El mapa no pide la ubicación solo.

### Escenario
- [ ] Muestra dirección, precio y la grilla de la noche.
- [ ] «Cómo llegar» abre la app de mapas del teléfono.

### Conjuntos
- [ ] El buscador encuentra con y sin tildes y por alias.
- [ ] La ficha muestra categoría, barrio, redes y lo que le queda por actuar.
- [ ] «Seguir» funciona sin registro; al volver a abrir la app sigue seguido.
- [ ] Después del primer «Seguir» aparece la tarjeta de avisos, una sola vez.

### Calendario y Concurso
- [ ] Los eventos están por mes; una fecha estimada lleva su marca.
- [ ] La ficha de un evento muestra el enlace de entradas sólo si está cargado.
- [ ] El Concurso muestra el fixture por rueda y noche; si es de ejemplo, lo dice.

### Llamadas
- [ ] El orden de cada noche, con «≈» en todas las horas.
- [ ] «Por cuadra»: elegir una esquina cambia las horas de paso.
- [ ] El recorrido dibuja la ruta; si es estimado, lo dice. Los cortes de calle se listan.
- [ ] El glosario abre y se lee completo.
- [ ] **Sin señal**, con la app abierta antes: orden, recorrido y glosario siguen ahí.

### Acerca de
- [ ] Se llega desde el ícono de arriba a la derecha en Hoy.
- [ ] El enlace abre la política de privacidad en el idioma de la app.
- [ ] «Borrar mis datos» pide confirmar; después, «Mis conjuntos» queda vacío y no llegan más avisos.
- [ ] Sin red, «Borrar mis datos» avisa que no pudo y no borra a medias.
- [ ] La versión coincide con `app/version.json`.

### Avisos (cuando esté Firebase)
- [ ] Seguir un conjunto que actúa hoy → llega «actúa hoy» entre las 12:00 y las 19:00.
- [ ] Cambiarle la hora desde el panel → llega el aviso al minuto.
- [ ] Suspender la noche siguiendo dos conjuntos → llega **un** aviso.
- [ ] Tocar el aviso abre la pantalla correspondiente.
- [ ] El aviso llega en el idioma de la app.

### Sistema
- [ ] El botón «atrás» de Android vuelve a la pantalla anterior y, desde Hoy, sale de la app.
- [ ] Girar el teléfono no rompe nada.
- [ ] Mandar la app al fondo y volver después de un rato: refresca sola.
- [ ] El ícono y el nombre «Carnavalero» están bien en el launcher y en la pantalla de inicio.
- [ ] Las barras del sistema tienen el color de fondo de la app.

## Lista de verificación antes de cada envío

**Código**
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm test:db` en verde.
- [ ] `build` subió en `app/version.json` respecto del último envío.
- [ ] `app/.env.beta` (o `.env.produccion`) apunta al remoto. En producción, `VITE_DEMO` y `VITE_AHORA` vacíos.
- [ ] `VITE_PUSH_ENABLED=1` sólo si `google-services.json` está en su lugar.

**Remoto**
- [ ] `pnpm remoto:chequeo` da «Todo bien» (seed, nada de prueba, auth anónima, funciones, estado del sistema).
- [ ] No hay migraciones sin aplicar: `pnpm supabase db push --dry-run`.
- [ ] El panel publicado deja entrar y muestra «Todo anda».

**Build**
- [ ] `pnpm android:release <modo> --apk`, instalado en el emulador, abre y lee el remoto.
- [ ] En producción no aparece la franja de versión de prueba.
- [ ] El AAB es de `pnpm android:release <modo>` (sin `--apk`), firmado.
- [ ] iOS: Version y Build en Xcode coinciden con `app/version.json`; Archive sin advertencias de privacidad.

**Tiendas**
- [ ] Textos de `tiendas/fichas.json` cargados en los dos idiomas.
- [ ] Capturas al día con lo que muestra el build.
- [ ] Declaraciones de `tiendas/DECLARACIONES.md` cargadas y coinciden con la política publicada.
- [ ] Política de privacidad, soporte y borrado de datos responden (`https://carnavalero.vercel.app`).
- [ ] App Store: notas para la revisión y video adjuntos. Publicación **manual** en las dos tiendas.

**El 5/1, además**
- [ ] Calendario y catálogo reales cargados en el remoto; fixture del Concurso, si ya se publicó.
- [ ] Supabase en plan Pro.
- [ ] Monitor externo consultando la función `estado`.
- [ ] Copia de la clave de subida de Android guardada fuera de la máquina.

## Capturas y video

- **Capturas de Android:** con el build de la beta en el emulador de 1080×2400, en español y en inglés: Hoy, Mapa, ficha de un conjunto, Calendario y Llamadas. `adb exec-out screencap -p > captura.png`. En las capturas de la ficha no puede verse la franja de versión de prueba: se sacan con un build de producción apuntado al Supabase local con la noche real cargada (`pnpm db:noche-real hoy`), o se recorta la franja.
- **Capturas de iPhone:** en el simulador de la Mac, iPhone de 6,9" y de 6,3" (Cmd+S guarda la captura en el tamaño que pide Apple).
- **Video para el revisor:** grabar la pantalla del emulador con la noche real: `adb shell screenrecord --time-limit 60 /sdcard/demo.mp4` y `adb pull /sdcard/demo.mp4`. Recorrido: Hoy → un escenario → Mapa → seguir un conjunto → Mis conjuntos → Llamadas → Acerca de → Borrar mis datos.

## Pasadas hechas

| Fecha | Build | Dónde | Resultado |
| --- | --- | --- | --- |
| 2026-11-12 | 1.0.0 (1), `beta` sin demostración | Emulador Android 15 | Abre, lee el remoto (98 conjuntos). El emulador había quedado sin red de una prueba anterior: se documentó cómo volver a prenderla |
| 2026-11-12 | 1.0.0 (1), `beta` con demostración | Emulador Android 15, en inglés | Franja de versión de prueba visible; Hoy muestra la noche de ejemplo por escenario; Llamadas muestra el orden de ejemplo con su aviso y las horas con «≈» |

## Abierto

- El mapa de la beta no muestra escenarios hasta que se confirmen sus ubicaciones en el panel y esté la key de MapTiler.
- Falta la pasada completa de esta lista en el emulador chico (Android 7), en el grande y en el iPhone.
- Los avisos no se pueden probar hasta que esté Firebase.
- El formato de la tabla de DAECPU del importador no se probó con una muestra real.
