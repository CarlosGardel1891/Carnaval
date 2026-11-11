# Prompt · Fase 6 (Modo Llamadas)

Pegalo en Claude Code abierto en esta carpeta.

```text
Fase 6 · Modo Llamadas

Este prompt tiene dos partes: primero cerrás la Fase 5 (sección 0) y después hacés la Fase 6 de docs/PLAN.md, el modo Llamadas, que es el sello de la app. Si algo choca con docs/DECISIONES.md, docs/PLAN.md o CLAUDE.md, mandan ellos, en ese orden. Avisame del choque y seguí lo que dicen.

Con el primer commit de la Fase 6, guardá este prompt en prompts/fase-6-modo-llamadas.md.

0. CERRAR LA FASE 5, en calendario-concurso

0.1 Entradas. El enlace a la venta oficial va como dato en la base, no en el código: la venta del Concurso arranca días antes de que empiece, después del envío a las tiendas del 5/1. Que se pueda cargar por evento y para el Concurso, que no se muestre mientras esté vacío, y que quede documentado en CLAUDE.md cómo se carga. En 2026 se vendió por Abitab (web y locales) y en la boletería del Teatro de Verano, desde tres días antes del Concurso. No lo cargues como dato de 2027 hasta que se anuncie.

0.2 Nombres de los eventos. Limpialos en research/calendario_2027.csv: el nombre corto queda en el nombre y las aclaraciones pasan a info. Corré validate.py y gen:seed.

0.3 Integrá calendario-concurso a develop y pusheá.

0.4 Prueba de Admisión. Cuando te avise que salió el resultado (se espera para el 17/11), buscalo en la prensa o en la IM, actualizá research/conjuntos.csv con su fuente, corré python research/validate.py --post-prueba y pnpm gen:seed --post-prueba, y mostrame la lista antes de commitear.

1. ANTES DE TOCAR CÓDIGO DE LA FASE 6

Trabajá en una rama nueva desde develop, llamadas, y pusheala después de cada commit.

Leé:
- docs/DECISIONES.md entero, en especial la del modo Llamadas por fechas, la de la hora estimada (primera comparsa a las 20:00; cada una sale 10 minutos y 150 metros después de la anterior; recorrido de nueve cuadras por Carlos Gardel e Isla de Flores) y la 25 (un evento por noche).
- La Fase 6 de docs/PLAN.md, con sus pasos y su «Listo cuando». Mirá también qué dicen v2 y v3 sobre «¿por dónde va el desfile?» y la ubicación en vivo, para no cerrarles el camino.
- CLAUDE.md y context.md.
- En la base: temporadas (modo_llamadas_desde y modo_llamadas_hasta), los eventos de Llamadas, orden_desfile y conjunto_temporada.en_llamadas.
- En @cuerda/shared: modoLlamadasActivo() y nocheLogica().
- En la app: la navegación, el mapa, la caché persistida y los avisos.

Después presentame un plan y esperá mi OK antes de escribir código. El plan tiene que incluir:
a) La navegación. Propongo una quinta pestaña, Llamadas, visible toda la temporada, y que mientras el modo esté activo la app abra ahí en vez de en Hoy, con Hoy siempre a un toque.
b) Las pantallas: la noche (orden de desfile con la hora estimada de salida de cada comparsa), la cuadra (a qué hora pasa cada comparsa por la cuadra elegida, con «cerca mío» para elegirla), el recorrido en el mapa con los cortes de calle, y el glosario.
c) El cálculo de la hora estimada según la decisión, como función pura en @cuerda/shared con sus tests, y cómo se muestra que es una estimación.
d) Los datos: el recorrido con sus cuadras, los cortes de calle y el orden de desfile. Todo lo que la IM o AUDECA publican cerca de la fecha tiene que poder cargarse en la base sin sacar otra versión de la app.
e) Los cambios de esquema, con su migración y sus tests en packages/db-tests. Entre ellos, una columna de fuente en orden_desfile para poder cargar un orden ficticio marcado.
f) Sin señal: en las Llamadas la red de celular se satura. Cómo queda todo el modo disponible sin conexión (orden, horas, recorrido, cortes y glosario), incluido el mapa sin tiles.
g) Si cuesta poco: sumar al aviso del día las comparsas seguidas que desfilan esa noche, con su hora estimada de salida.
h) La lista de pasos, uno por commit.

2. REGLAS DE ESTA FASE

- El modo se activa por las fechas de la temporada, con modoLlamadasActivo(), nunca por el tipo de evento.
- Las horas son estimaciones y se muestran como tales, en America/Montevideo. Lo que pasa después de medianoche sigue siendo de esa noche (noche lógica).
- No inventes datos reales. El orden de desfile ficticio va aparte, marcado y sólo local, como la grilla ficticia.
- El recorrido, hasta que la IM publique el de 2027, va marcado como estimado y con su fuente. Según la prensa de 2025, el desfile va por Carlos Gardel e Isla de Flores, y los desvíos de tránsito abarcan de Gutiérrez Ruiz a Magallanes, una cuadra más a cada extremo del recorrido (https://www.elobservador.com.uy/carnaval/cortes-transito-montevideo-el-desfile-llamadas-2025-mira-las-calles-afectadas-y-los-desvios-omnibus-n5983582). Armá las coordenadas con OpenStreetMap y contrastalo con la decisión.
- Ningún texto va escrito directo en la interfaz: todo pasa por es.json y en.json, incluido el glosario.

3. QUÉ TIENE QUE QUEDAR

Noche de Llamadas:
- El orden de desfile de cada noche, con número, comparsa, hora estimada de salida y enlace a la ficha.
- Las comparsas que el usuario sigue, marcadas.
- Mientras no esté el orden real, un aviso de que todavía no se publicó, con las comparsas clasificadas a las Llamadas.

Cuadra:
- Elegir una cuadra del recorrido, o la más cercana con «cerca mío», y ver a qué hora pasa cada comparsa.

Recorrido:
- En el mapa, con sus cuadras, la salida, la llegada y los cortes de calle de esa noche.
- Sin key de MapTiler o sin señal, el recorrido se ve igual sobre fondo liso.

Glosario:
- Unos 20 términos del candombe y de las Llamadas (por ejemplo: cuerda, chico, repique, piano, mama vieja, gramillero, escobero, vedette, estandarte, banderas, medialuna y estrella), en español y en inglés, pensado para el turista. Pasámelo para revisarlo antes de commitearlo.

Datos:
- El orden de desfile ficticio, con su comando, como pnpm db:grilla.
- El recorrido estimado en el seed, con su fuente.
- Cómo se cargan el orden real, el recorrido oficial y los cortes cuando se publiquen, documentado en CLAUDE.md.

4. FUERA DE ESTA FASE

Quedan afuera:
- «¿Por dónde va el desfile?» con reportes de la gente (v2).
- La ubicación en vivo de la comparsa y las salidas de tambores (v3).
- El panel admin.

5. CÓMO TRABAJAR

- Cada paso del plan es un commit, en español.
- Antes de cada commit tienen que pasar los chequeos de CLAUDE.md y pnpm test:db. El CI sigue sin correr, así que mandan los chequeos locales.
- Tiene que haber tests de:
  - la hora estimada de la primera comparsa, de una del medio, de la última y de una que pasa después de medianoche;
  - la cuadra elegida y la cuadra más cercana;
  - el modo activo e inactivo según las fechas, con el reloj del sistema en otra zona;
  - el orden ficticio, el orden vacío y el aviso de que todavía no se publicó;
  - todo el modo con la red cortada;
  - los textos en español y en inglés.
- Para probar fuera de fecha, sumá una forma de simular la fecha que funcione sólo en desarrollo.
- Probalo en el navegador con el orden ficticio, y en el emulador de Android desde PowerShell, también con la red apagada.

Pará y preguntame si:
- aparece una decisión de producto que no está escrita;
- a la base le falta algo que la pantalla necesita;
- un paso se va a llevar mucho más de lo previsto.

6. LISTO CUANDO

Esto se suma al «Listo cuando» de PLAN.md:
- En las fechas de las Llamadas la app abre en el modo Llamadas; fuera de ellas, en Hoy.
- Con el orden ficticio, cada noche muestra su orden con horas estimadas que siguen la decisión.
- Eligiendo una cuadra, se ve a qué hora pasa cada comparsa.
- El recorrido y los cortes se ven en el mapa, también sin key y sin señal.
- Con la red apagada en el emulador, todo el modo sigue andando con lo último descargado.
- Toda la interfaz nueva y el glosario están en español y en inglés, y el test de claves de i18n pasa.
- docs/DECISIONES.md, docs/PLAN.md, CLAUDE.md y context.md están al día.

Al terminar, pasame un resumen corto con:
- qué quedó hecho;
- qué decisiones se agregaron;
- qué quedó pendiente;
- qué necesita la Fase 7 que todavía falta.
```
