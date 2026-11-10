# Prompt · Fase 3 (Hoy y escenarios)

Pegalo en Claude Code abierto en esta carpeta.

```text
Fase 3 · Hoy y escenarios

Vamos con la Fase 3 de docs/PLAN.md: el pizarrón «Hoy», el mapa y la ficha de cada escenario. Es la primera pantalla útil de la app y la que más se va a usar, porque responde «¿qué hay hoy de carnaval, dónde y a qué hora?». El plan la cierra el 23/11, y el envío a las tiendas es el 5/1 y no se mueve.

Arrancá desde develop con la Fase 2 ya mergeada (si no lo está, avisame) y trabajá en una rama nueva, hoy-escenarios. Si algo de este prompt choca con docs/DECISIONES.md, docs/PLAN.md o CLAUDE.md, mandan ellos, en ese orden. Avisame del choque y seguí lo que dicen.

Con el primer commit, guardá este prompt en prompts/fase-3-hoy-y-escenarios.md.

1. ANTES DE TOCAR CÓDIGO

Leé:
- docs/DECISIONES.md entero, incluidas las decisiones 22 a 28.
- La Fase 3 de docs/PLAN.md, con sus pasos y su «Listo cuando». Mirá también qué dicen las fases 4 a 6 sobre navegación, Seguir y modo Llamadas, para no cerrarles el camino.
- CLAUDE.md y context.md.
- La app actual en app/src: rutas, cliente de Supabase, i18n, la tarjeta de temporada y sus tests.
- En packages/shared: nocheLogica(), calendarDateInMontevideo() y modoLlamadasActivo().
- Las funciones de la base que va a usar la app (actuaciones_de_la_noche, escenarios_cercanos y las que hagan falta) y database.types.ts.
- La grilla ficticia de pnpm db:grilla.

Después presentame un plan y esperá mi OK antes de escribir código. El plan tiene que incluir:
a) Las pantallas y rutas de esta fase, y cómo queda la navegación para sumar después Conjuntos, Calendario y Llamadas.
b) Cómo se ve el pizarrón: agrupado por escenario, por hora o con las dos vistas. Sumá un boceto en texto de una noche de la grilla ficticia.
c) Los filtros (cercanía, gratuitos, categoría y «mis conjuntos»): dónde se resuelve cada uno, en la base o en la app, y cómo se guardan, por ejemplo en la URL.
d) El flujo de ubicación: cuándo se pide el permiso, qué pasa si se niega y cómo se ordena por cercanía.
e) La sesión anónima: cuándo se crea y dónde se guarda. Si según PLAN.md la sesión o «mis conjuntos» son de la Fase 4, decilo y dejalos para entonces.
f) Si conviene guardar la caché de TanStack Query en el teléfono para ver lo último cargado sin señal, y cuánto cuesta.
g) La lista de pasos, uno por commit.

2. REGLAS DE ESTA FASE

- La noche se calcula con nocheLogica() de @cuerda/shared y se le pasa a la base. A las 02:00, el pizarrón muestra la noche anterior.
- Las horas se muestran siempre en America/Montevideo, nunca en la zona del teléfono: un turista con el teléfono en otra zona tiene que ver la hora de Montevideo. Usá Intl.DateTimeFormat con timeZone explícito.
- Ningún texto va escrito directo en la interfaz. Todo pasa por es.json y en.json, incluidas categorías, tipos de escenario, estados y mensajes de error. Fechas y horas se formatean con el idioma activo.
- Las actuaciones suspendidas o cambiadas se muestran como tales; nunca desaparecen en silencio.
- El pizarrón muestra cuándo se cargó por última vez («actualizado hace X»).
- En los escenarios itinerantes, la ubicación de esa noche sale de la actuación, no del escenario.
- No inventes coordenadas. Hoy sólo los escenarios ficticios tienen ubicación: los reales aparecen en la lista y en su ficha, pero no en el mapa ni en «cerca mío».
- La categoría se filtra en la app. Gratuitos y «mis conjuntos» se resuelven con los parámetros de actuaciones_de_la_noche.

3. QUÉ TIENE QUE QUEDAR

Pizarrón «Hoy»:
- Todas las actuaciones de la noche en todos los escenarios, con hora, conjunto, categoría, escenario y estado.
- Los filtros. Con ubicación, cercanía muestra la distancia y ordena por ella.
- Estados de carga, de error con reintento y vacío.
- El estado vacío tiene que servir: fuera de temporada, cuenta cuándo arranca, con la tarjeta de temporada que ya existe; en una noche sin actuaciones, lo dice claro.
- Al volver la app al frente, se refresca. En Capacitor el foco de la ventana no siempre se dispara, así que usá el evento de @capacitor/app.

Mapa:
- MapLibre con los tiles de MapTiler y la key desde .env.
- Los escenarios con ubicación esa noche, fijos e itinerantes, con un marcador por tipo. Tocar un marcador lleva a la ficha.
- La posición del usuario, si dio permiso.
- Anotá en CLAUDE.md qué orígenes usa la app (desarrollo, iOS y Android), para restringir la key de MapTiler cuando se cree.

Ficha de escenario:
- Tipo, precio, si es gratis, dirección y barrio.
- Lo que hay esa noche ahí, sin una consulta nueva si alcanza con la del pizarrón.
- En los itinerantes, dónde están esa noche.
- Si tiene ubicación, un enlace para abrirla en la app de mapas del teléfono.

Ubicación:
- Con @capacitor/geolocation. El permiso se pide recién cuando el usuario activa «cerca mío», nunca al abrir la app.
- Los textos del permiso van en los dos idiomas: en iOS, NSLocationWhenInUseUsageDescription localizado, aunque no se pueda probar sin Mac; en Android, los permisos en el manifest.
- Si lo niega, la app sigue andando sin cercanía y se lo explica.

Sesión anónima, si va en esta fase:
- Se crea en silencio la primera vez, sin pantallas de registro.
- Guardala con @capacitor/preferences como storage de supabase-js, no en localStorage. El sistema puede borrar el localStorage del WebView, y con la sesión se perderían los favoritos y el registro de push.

4. FUERA DE ESTA FASE

Quedan afuera:
- Fichas de conjuntos y botón Seguir.
- Push.
- Calendario.
- Modo Llamadas.
- Panel admin.
- Coordenadas reales de los escenarios.
- Cualquier cambio de esquema que no sea imprescindible.

Si hace falta tocar la base, proponelo en el plan, con su migración y sus tests en packages/db-tests.

5. CÓMO TRABAJAR

- Cada paso del plan es un commit, en español.
- Antes de cada commit tienen que pasar los chequeos de CLAUDE.md, y pnpm test:db si tocaste la base. Si el CI todavía no corre, mandan los chequeos locales. Avisame cuando empiece a correr.
- Los tests van con Vitest y Testing Library, con la base mockeada en los de componentes. Tiene que haber tests de:
  - las horas con el reloj del sistema en otra zona (por ejemplo, Asia/Tokyo);
  - la noche a las 05:59 y a las 06:00;
  - cada filtro;
  - el estado vacío fuera de temporada;
  - una actuación suspendida.
- Probalo en el navegador con pnpm dev y pnpm db:grilla hoy. Si el JDK 21 ya está, probalo también en el emulador de Android con pnpm --filter app android:local.
- Pensalo para usar de noche y en la calle: texto legible, buen contraste y botones grandes.

Pará y preguntame si:
- aparece una decisión de producto que no está escrita;
- a la base le falta algo que la pantalla necesita;
- un paso se va a llevar mucho más de lo previsto.

6. LISTO CUANDO

Esto se suma al «Listo cuando» de PLAN.md:
- Con pnpm db:grilla hoy, el pizarrón muestra la noche ficticia completa y ordenada, con los filtros de esta fase andando.
- A las 02:00 de Montevideo muestra la noche anterior, aunque el teléfono esté en otra zona.
- El mapa muestra los escenarios ficticios y el móvil en su ubicación de esa noche, y desde cada marcador se llega a la ficha.
- Negar el permiso de ubicación no rompe nada.
- Toda la interfaz nueva está en español y en inglés, y el test de claves de i18n pasa.
- Si el JDK 21 ya está, la app abre en el emulador de Android.
- docs/DECISIONES.md, CLAUDE.md y context.md están al día.

Al terminar, pasame un resumen corto con:
- qué quedó hecho;
- qué decisiones se agregaron;
- qué quedó pendiente;
- qué necesita la Fase 4 que todavía falta.
```
