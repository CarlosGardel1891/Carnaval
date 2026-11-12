# Prompt · Fase 8 (QA, beta y publicación)

Pegalo en Claude Code abierto en esta carpeta.

```text
Fase 8 · QA, beta y publicación

Este prompt tiene dos partes: primero cerrás lo que quedó de la Fase 7 (sección 0) y después hacés la Fase 8 de docs/PLAN.md: llevar la app a las tiendas. Las fechas que mandan: beta cerrada desde el 14/12 (o antes, ver abajo), envío a revisión el 5/1, que no se mueve, y la app publicada antes del Desfile Inaugural del 21/1. Si algo choca con docs/DECISIONES.md, docs/PLAN.md o CLAUDE.md, mandan ellos, en ese orden. Avisame del choque y seguí lo que dicen.

Trabajá en una rama nueva desde develop, publicacion, y pusheala después de cada commit. Con el primer commit, guardá este prompt en prompts/fase-8-qa-beta-y-publicacion.md.

0. CERRAR LA FASE 7

0.1 Límites de auth por IP. Subí, en supabase/config.toml y en el remoto, las altas anónimas a 1000 por hora y los refrescos de sesión a 1500 cada 5 minutos. Los inicios de sesión quedan en 30 cada 5 minutos. Registralo como decisión, con el motivo: en las Llamadas y en los tablados muchos teléfonos comparten IP.

0.2 MapTiler. Cuando te pase la key, ponela en los .env de la app y del panel, locales y remotos, y volvé a publicar el panel.

1. ANTES DE TOCAR CÓDIGO

Leé:
- docs/DECISIONES.md entero, incluida la 78 (las keys nuevas de Supabase).
- La Fase 8 de docs/PLAN.md, con sus pasos y su «Listo cuando», y la Fase 9 (operación en temporada).
- CLAUDE.md y context.md.

Verificá en las fuentes oficiales de hoy, no de memoria, y anotá el enlace de cada una:
- el target API que exige Google Play para apps nuevas;
- la prueba cerrada que Google pide a las cuentas personales nuevas antes de producción (12 testers durante 14 días seguidos, y la revisión del pedido de producción);
- el SDK y el Xcode mínimos de App Store Connect;
- el privacy manifest de iOS (PrivacyInfo.xcprivacy) y las razones de las APIs que usamos, como UserDefaults por Preferences;
- las declaraciones de datos (Data safety en Google Play y App Privacy en Apple), la clasificación por edad y el cifrado (export compliance);
- las reglas de las dos tiendas sobre borrar la cuenta y los datos del usuario.

Después presentame un plan y esperá mi OK antes de escribir código. El plan tiene que incluir:
a) Builds de release. Android: AAB firmado, Play App Signing y versionado. iOS: cómo compilar, firmar y subir sin Mac propia (por ejemplo Codemagic, un runner macOS o una Mac alquilada), con tu recomendación.
b) La política de privacidad: qué datos maneja la app (sesión anónima, seguidos, token e idioma del dispositivo, ubicación que no se guarda), dónde se publica como página pública y en los dos idiomas.
c) Borrar mis datos: una opción en la app que borre los seguidos, el dispositivo y la sesión anónima, y una forma de pedirlo por web, según lo que exijan las tiendas.
d) La beta cerrada. Propongo adelantarla: arrancar la prueba cerrada de Android apenas esté la cuenta de Google Play, sin esperar al 14/12, para tener margen con los 14 días y la revisión antes del 5/1. TestFlight cuando esté la cuenta de Apple. Armá el calendario día por día hasta el 5/1.
e) El contenido fuera de temporada: la beta corre antes de que haya grilla real, y sin nada que usar los testers no van a usar la app. Propongo un modo demostración con una noche de ejemplo empaquetada dentro de la app, marcada como ejemplo, que nunca toca el remoto y que se apaga en el build de producción.
f) Las fichas de las tiendas: textos en español y en inglés (en App Store, nombre «Carnavalero» y subtítulo «Carnaval de Montevideo»; en Google Play, título «Carnavalero: Carnaval Uruguay»), capturas y con qué datos, el ícono de 512 y el gráfico destacado de 1024×500 de Google Play a partir del logo.
g) QA: un plan de pruebas por pantalla y por dispositivo (Android 7 en adelante con varios tamaños de pantalla, iOS 15 en adelante), sin señal, en inglés y con letra grande, y una lista de verificación antes de cada envío.
h) El reporte de errores en producción: si conviene sumar uno y qué implica en la política de privacidad.
i) La operación en temporada: un manual para el equipo (cargar la grilla de cada noche, suspender, cargar el atraso de las Llamadas, qué hacer si algo falla), alertas si el cron o las funciones fallan, y los backups.
j) La lista de pasos, uno por commit, separando lo que depende de mí (cuentas, testers y pagos).

2. REGLAS DE ESTA FASE

- Nada se publica sin mi OK: cada envío a una tienda y cada cambio en el remoto me lo confirmás antes.
- Sin keys ni archivos de firma en el repo. El keystore, las contraseñas y los certificados quedan afuera; documentá en CLAUDE.md dónde están y cómo se recuperan.
- Nada ficticio en el remoto. El modo demostración vive dentro de la app de beta y no existe en el build de producción.
- Las fichas, la política de privacidad y los textos nuevos van en español y en inglés.

3. QUÉ TIENE QUE QUEDAR

- Builds de release reproducibles de Android y de iOS, documentados en CLAUDE.md.
- La política de privacidad publicada y enlazada desde la app y desde las fichas.
- Borrar mis datos, en la app y por web.
- El modo demostración para la beta, si te lo apruebo.
- Las fichas de las dos tiendas listas: textos, capturas y gráficos.
- El plan de QA ejecutado, con lo que falló y cómo quedó.
- El manual de operación en docs/ y las alertas andando.
- La prueba cerrada de Android y TestFlight armados, con el calendario hasta el 5/1.

4. FUERA DE ESTA FASE

Quedan afuera:
- Lo de v2 y v3.
- El interior del país.

5. CÓMO TRABAJAR

- Cada paso del plan es un commit, en español.
- Antes de cada commit tienen que pasar los chequeos de CLAUDE.md y pnpm test:db. El CI sigue sin correr, así que mandan los chequeos locales.
- Tiene que haber tests de:
  - borrar mis datos, incluido que no quede nada del usuario en la base;
  - que el modo demostración no exista en el build de producción;
  - que el build de producción apunte al remoto y no a local.
- Probá los builds de release en el emulador de Android, desde PowerShell, antes de subirlos.

Pará y preguntame si:
- aparece una decisión de producto que no está escrita;
- algo necesita una cuenta o un pago que todavía no existe;
- un paso se va a llevar mucho más de lo previsto.

6. LISTO CUANDO

Esto se suma al «Listo cuando» de PLAN.md:
- Hay un build de Android en la prueba cerrada de Google Play y uno de iOS en TestFlight, los dos con el nombre y el ícono de Carnavalero.
- La política de privacidad está publicada y enlazada desde la app y desde las fichas.
- Desde la app se pueden borrar los datos propios.
- Las fichas de las dos tiendas están completas en español y en inglés.
- El plan de QA está hecho y lo que quedó abierto está anotado.
- El manual de operación está en docs/ y las alertas andan.
- El envío a revisión del 5/1 tiene su lista de verificación y su calendario.
- docs/DECISIONES.md, docs/PLAN.md, CLAUDE.md y context.md están al día.

Al terminar, pasame un resumen corto con:
- qué quedó hecho;
- qué decisiones se agregaron;
- qué quedó pendiente, separando lo que depende de mí;
- qué hay que hacer el 5/1 y qué durante la temporada.
```
