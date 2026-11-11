# Prompt · Fase 5 (Calendario y Concurso)

Pegalo en Claude Code abierto en esta carpeta.

```text
Fase 5 · Calendario y Concurso

Este prompt tiene dos partes: primero cerrás lo pendiente (sección 0) y después hacés la Fase 5 de docs/PLAN.md. Si algo choca con docs/DECISIONES.md, docs/PLAN.md o CLAUDE.md, mandan ellos, en ese orden. Avisame del choque y seguí lo que dicen.

Con el primer commit de la Fase 5, guardá este prompt en prompts/fase-5-calendario-y-concurso.md.

0. ANTES DE LA FASE 5

0.1 Cerrar la Fase 4, en conjuntos-push:
- Ajuste a la decisión 49: un aviso de cambio o de suspensión que falla después de los reintentos no se puede perder en silencio. Que vuelva a intentarse en la pasada siguiente mientras la actuación no haya empezado, y que si igual falla quede registrado.
- Actualizá docs/competencia-carnaval-app.md con la decisión 53, y en el resumen mostrame el texto nuevo de posicionamiento para revisarlo.
- Integrá conjuntos-push a develop y pusheá.

0.2 Nombre y logo, en una rama nueva desde develop, renombre-carnavalero:
- La app se llama Carnavalero y el identificador es uy.carnavalero.app. Registralo como decisión, junto con el logo.
- Nombre visible «Carnavalero» en Capacitor, Android e iOS, en es.json y en.json, en el título de la web y en el admin.
- Identificador uy.carnavalero.app en Capacitor, en el applicationId y el namespace de Android (moviendo la carpeta del paquete Java) y en el bundle identifier de iOS. En project.pbxproj cambiá sólo esa línea.
- Los nombres internos (@cuerda/shared, el project_id de Supabase y los contenedores) quedan como están; anotá en CLAUDE.md que es a propósito.
- Que no quede «Cuerda» visible en ningún lado: buscalo en todo el repo y listame lo que quede a propósito.
- Las imágenes ya están en app/assets/:
  - icon-only.png: el logo, 1024×1024, cuadrado lleno.
  - icon-foreground.png e icon-background.png: las capas del ícono adaptativo de Android. El logo ya ocupa la zona visible de 72 dp, sobre el fondo #0448a7.
  - notificacion.svg: el ícono de los avisos de Android, un tambor blanco sobre transparente.
- Generá los íconos de Android e iOS con @capacitor/assets a partir de esas imágenes.
- Armá la pantalla de inicio con el logo al centro, sobre el color de fondo del tema oscuro de la app.
- Convertí notificacion.svg en un vector drawable de Android y usalo como ícono de los avisos.
- Hacé el favicon de la web y del admin a partir de icon-only.png.
- Verificá: chequeos de CLAUDE.md, pnpm test:db, y que la app abra en el emulador de Android desde PowerShell con el nombre y el ícono nuevos. Como cambia el identificador, es otra app: desinstalá la vieja.
- Integrá renombre-carnavalero a develop y pusheá.

0.3 Firebase: guiame paso a paso para crear el proyecto con uy.carnavalero.app y conseguir google-services.json y la cuenta de servicio. No me esperes: seguí con la Fase 5 y, cuando te los pase, probá un aviso real en el emulador.

Al terminar 0.1 y 0.2, pasame un resumen corto.

1. ANTES DE TOCAR CÓDIGO DE LA FASE 5

Trabajá en una rama nueva desde develop, calendario-concurso, y pusheala después de cada commit.

Leé:
- docs/DECISIONES.md entero, en especial la 15 (fechas puras en los eventos), la 25 (las Llamadas son un evento por noche) y la 53 (el Concurso entra completo).
- La Fase 5 de docs/PLAN.md, con sus pasos y su «Listo cuando». Mirá también qué dicen las fases 6 y 7 sobre el modo Llamadas y la carga de datos, para no cerrarles el camino.
- CLAUDE.md y context.md.
- En la base: eventos, etapas_concurso, orden_desfile, temporadas y las actuaciones del Teatro de Verano.
- research/calendario_2027.csv y cómo lo carga gen:seed.
- En la app: la navegación, el pizarrón y su parámetro ?noche.

Después presentame un plan y esperá mi OK antes de escribir código. El plan tiene que incluir:
a) Las pantallas: el calendario de la temporada y la sección del Concurso, y cómo entra la pestaña Calendario, que es la cuarta.
b) Cómo se muestra cada tipo de evento (desfiles, etapas del Concurso, corsos y pretemporada) y cómo se marcan las fechas estimadas.
c) El fixture del Teatro de Verano: cómo se modela por rueda y por noche, cómo se arma uno ficticio sólo local y cómo se va a cargar el real cuando se publique.
d) Los cambios de esquema que hagan falta, con su migración y sus tests en packages/db-tests, y cómo quedan preparados los resultados de la temporada y el historial sin construirlos todavía.
e) «Agregar al calendario del teléfono»: qué plugin hace falta, cuánto cuesta y si conviene dejarlo para después.
f) La lista de pasos, uno por commit.

2. REGLAS DE ESTA FASE

- Las fechas de los eventos son fechas puras, sin horas inventadas. Lo que dependa de «hoy» usa America/Montevideo y la noche lógica de @cuerda/shared.
- Ningún texto va escrito directo en la interfaz: todo pasa por es.json y en.json, incluidos los tipos de evento, las ruedas y los estados. Las fechas se formatean con el idioma activo.
- Las fechas estimadas se ven como estimadas, nunca como confirmadas.
- No inventes datos reales: el fixture ficticio va aparte, marcado como ficticio y sólo local, como la grilla ficticia.
- El modo Llamadas no se construye en esta fase: las noches de Llamadas se ven en el calendario y quedan listas para la Fase 6.

3. QUÉ TIENE QUE QUEDAR

Calendario:
- La pestaña Calendario, con los eventos de la temporada ordenados por fecha y agrupados por mes, incluida la pretemporada.
- El día de hoy marcado y los eventos que ya pasaron en segundo plano.
- Tocar un día lleva al pizarrón de esa noche (?noche=).
- La ficha de cada evento, con fecha, lugar, estado y fuente.

Concurso:
- Las ruedas (primera, segunda y liguilla) con sus noches, y qué conjuntos actúan cada noche en el Teatro de Verano y a qué hora.
- Desde una noche del Concurso se llega a las fichas de los conjuntos, y desde la ficha de un conjunto se ven sus noches en el Concurso.
- Mientras no esté el fixture real, se ve claro que todavía no se publicó.
- Con el fixture ficticio cargado en local, se ve completo.

Datos:
- El fixture ficticio, con su comando, como pnpm db:grilla.
- La forma de cargar el fixture real cuando se publique, documentada en CLAUDE.md.

4. FUERA DE ESTA FASE

Quedan afuera:
- Modo Llamadas.
- Resultados de la temporada e historial: sólo se deja el camino preparado.
- Panel admin e importador de la grilla.
- Interior del país.
- «Agregar al calendario del teléfono», salvo que te lo apruebe en el plan.

5. CÓMO TRABAJAR

- Cada paso del plan es un commit, en español.
- Antes de cada commit tienen que pasar los chequeos de CLAUDE.md y pnpm test:db. El CI sigue sin correr, así que mandan los chequeos locales.
- Tiene que haber tests de:
  - el orden y la agrupación de los eventos;
  - un evento de varios días y las dos noches de Llamadas;
  - las fechas estimadas;
  - el día de hoy marcado, con el reloj del sistema en otra zona;
  - el fixture: noches, conjuntos y horarios de cada rueda;
  - el estado vacío cuando el fixture no está publicado;
  - la navegación del calendario al pizarrón, y entre el Concurso y las fichas.
- Probalo en el navegador con pnpm dev y el fixture ficticio, y en el emulador de Android desde PowerShell.

Pará y preguntame si:
- aparece una decisión de producto que no está escrita;
- a la base le falta algo que la pantalla necesita;
- un paso se va a llevar mucho más de lo previsto.

6. LISTO CUANDO

Esto se suma al «Listo cuando» de PLAN.md:
- La app se llama Carnavalero, tiene el ícono nuevo en Android y abre en el emulador.
- El calendario muestra todos los eventos de la temporada cargados desde research/, con las fechas estimadas marcadas.
- Tocar un día del calendario abre el pizarrón de esa noche.
- Con el fixture ficticio, el Concurso muestra cada rueda con sus noches y sus conjuntos, y desde ahí se llega a las fichas.
- Sin fixture, el Concurso avisa que todavía no se publicó.
- Toda la interfaz nueva está en español y en inglés, y el test de claves de i18n pasa.
- docs/DECISIONES.md, docs/PLAN.md, CLAUDE.md y context.md están al día.

Al terminar, pasame un resumen corto con:
- qué quedó hecho;
- qué decisiones se agregaron;
- qué quedó pendiente;
- qué necesita la Fase 6 que todavía falta.
```
