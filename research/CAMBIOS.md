# CAMBIOS — normalización de los CSV de Fase 0 para seed

Fecha: 2026-10-22. Los CSV se editaron en su lugar y ahora son la fuente de verdad: el script `gen_csv.py` que los generó en la Fase 0 ya no se usa y no está en el repo. Para chequearlos: `python research/validate.py`.

## Carteleras y fuentes revisadas para este cambio

- El Observador, 2026-02-28, lista del fin de semana: <https://www.elobservador.com.uy/cultura-y-espectaculos/la-lista-tablados-y-espectaculos-carnaval-este-fin-semana-n6035835>
- Montevideo Portal, 2026-01-30, conjuntos en los tablados: <https://www.montevideo.com.uy/Tiempo-libre/Los-conjuntos-del-Carnaval-estaran-en-los-tablados-este-fin-de-semana-dias-y-horarios-uc951477>
- El Observador, fin de semana y feriado de carnaval (14 al 17 de febrero de 2026): <https://www.elobservador.com.uy/cultura-y-espectaculos/los-tablados-el-fin-semana-y-el-feriado-carnaval-privados-populares-gratuitos-y-teatro-verano-n6034369>
- El Observador, 2026-02-16, tablados sin entrada: <https://www.elobservador.com.uy/cultura-y-espectaculos/la-lista-tablados-donde-se-puede-ver-carnaval-pagar-entrada-n6034632>
- El Observador, enero de 2026, seis tablados con el Concurso en pausa: <https://www.elobservador.com.uy/cultura-y-espectaculos/con-el-concurso-carnaval-del-teatro-verano-pausa-hoy-abren-seis-tablados-y-uno-no-se-cobra-entrada-n6032589>
- El Observador, los 26 tablados de 2026 (7 privados y 19 populares): <https://www.elobservador.com.uy/cultura-y-espectaculos/carnaval-los-barrios-estos-son-los-26-tablados-que-podes-visitar-2026-n6033142>
- DAECPU, widget «Seguí a tu conjunto» (listas de escenarios y de conjuntos): <https://www.daecpu.uy/segui-a-tu-conjunto.html>
- DAECPU, «La guía de Tablados del carnaval 2026» (2026-01-20): <https://www.daecpu.uy/daecpu/escenarios.html>

## Cambios en los tres CSV

- UTF-8 **sin BOM** y fin de línea LF.
- **Celdas limpias:** sin espacios al principio o al final, sin dobles espacios, booleanos en minúscula.
- **Columna `slug` agregada como primera.** Se arma con minúsculas, sin tildes, sin apóstrofes y con guiones, y es única en cada archivo. En escenarios se ignora lo que está entre paréntesis (por ejemplo `tablado-del-parque`). En el calendario los slugs se armaron a mano, cortos y con el sufijo de la edición (por ejemplo `desfile-inaugural-2027`).
- **`fuente_url`:** el separador es siempre ` | ` y no hay URLs repetidas. Cada dato nuevo agregó su URL.
- **«Sin dato» ahora es un campo vacío.** En la columna `precio_texto` de escenarios se sacaron los textos «Sin dato 2026» y las notas internas que venían pegadas. Donde había información de venta («Venta en RedTickets o boletería…») se dejó.

## escenarios.csv (33 → 42 filas; 39 activas)

Activos por tipo: 1 Teatro de Verano, 7 privados, 19 populares, 2 móviles, 8 Carnaval de a Pie, 1 Barrio a Barrio y 1 sin tipo (Escenario en Canelones). Los 7 privados y 19 populares coinciden con el conteo de El Observador.

- **Columnas nuevas:** `activo`, `itinerante` y `alias` (nombres alternativos separados por `|`).
- **`activo=false`** para Sala Nelly Goitiño (Sodre), Centro Cultural Alba Roballo y Club Salus. Una aclaración: no es exacto que sólo tuvieran fuentes de 2020 a 2024.
  - Los tres figuran en la **Guía de Tablados 2026 de DAECPU** y en la lista de escenarios del widget.
  - Pero **no aparecen en ninguna de las cinco carteleras 2026** revisadas ni entre los 26 de El Observador.
  - Siguiendo el criterio («aparecen en alguna cartelera 2026») quedaron en false, y se sumaron las dos URL de DAECPU a su `fuente_url`. Están en pendientes.
- **Alba Roballo** pasó a llamarse `Centro Cultural Alba Roballo`. Se sacó «(Eduardo Lladó)» porque el widget de DAECPU lista «Eduardo Lladó» como un escenario aparte. El nombre que usó la prensa en 2024 («Centro Cultural Alba Roballo - Eduardo Lladó») quedó como alias.
- **Itinerantes partidos en una fila por unidad:** `Escenario Móvil IM 1`, `Escenario Móvil IM 2`, `Carnaval de a Pie 1` a `8` y `Barrio a Barrio` (antes «Barrio a Barrio (Municipio A)»).
  - Todas tienen `itinerante=true`, dirección y barrio vacíos (antes decían «Varios» o «Itinerante (ej. …)»), `gratis=true` y conservan las fuentes que tenían.
  - Ojo: DAECPU llama a la primera chata «ESCENARIOS MÓVILES IM», sin número, y a la segunda «ESCENARIOS MÓVILES IM 2». Quedaron como alias.
- **`barrio_a_barrio`** ya era un tipo válido y `validate.py` lo acepta.
- **Fila nueva: `Escenario en Canelones`**, que aparece en carteleras de El Observador del 2026-02-28 y del 14 al 17 de febrero, y en el widget de DAECPU como «ESCENARIO CANELONES».
  - Tiene `activo=true`.
  - Tipo, dirección, barrio, precio, gratis e itinerante quedaron vacíos porque no hay datos (está en pendientes).
- **Alias:** quedaron en 40 de las 42 filas.
  - Son todos los nombres publicados que difieren del `nombre`, incluidas las variantes en mayúsculas de la prensa. Por ejemplo, «ARBOLITO - EL TEJANO», como pediste.
  - No hay alias repetidos dentro de una misma fila, comparando sin tener en cuenta mayúsculas ni tildes.
  - Los nombres del widget de DAECPU se guardan en **mayúsculas**: el widget muestra «Escenarios MÓviles Im», «DoÑa Bastarda», etc., lo que indica que el dato de origen está en mayúsculas. **Al hacer el match, comparar sin mayúsculas y sin tildes.**
  - La prensa no numera las chatas ni el Carnaval de a Pie («ESCENARIOS MÓVILES DE LA IM», «Carnaval de a pie - Daecpu»), así que esos nombres no se asignaron a ninguna unidad para no generar choques.

## conjuntos.csv (102 → 110 filas)

- **Columnas nuevas:** `alias` y `verificado`. Las 102 filas que ya estaban tienen `verificado=true`.
- **Categoría `otro` agregada como valor válido.**
- **Ocho conjuntos fuera de concurso** que aparecen en la grilla 2026 de DAECPU y en carteleras. Todos con `temporada_lista=2026`, `en_concurso=false`, `en_llamadas=false` y `verificado=false`:

| Conjunto | Categoría | De dónde sale la categoría |
|---|---|---|
| Géminis | otro | Ninguna fuente le asigna categoría. El Observador lo cuenta como «fuera de concurso» con 46 contratos |
| Bafo da Onça | samba | El Observador, 2025-10-21: «icónica escuela de samba» |
| De Todas Partes | murga | Cartelera de Montevideo Portal: «Género: Murga» |
| Bunny Show | otro | Sin datos fuera de DAECPU |
| Los Buby's | humoristas | El Observador, 2025-01-26: «categoría de Humoristas» |
| El Show de la 8 | otro | Sin datos fuera de DAECPU |
| La Línea Maginot | otro | Sin datos fuera de DAECPU |
| La Venganza de los Utileros | murga | El Observador, 2020: nota con etiqueta «Murgas» que habla de «la murga» |

- **Supuesto sobre el widget de DAECPU:** no muestra el año. Se asumió que es la temporada 2026 porque su lista de conjuntos tiene exactamente los 40 del Concurso 2026 más estos 8.
- **Alias** (sólo cuando difieren del nombre más allá de las mayúsculas; quedaron en 15 filas):
  - MAS QUE LONJA
  - DON BOCHINCHE Y CIA
  - LA SARA DEL CORDON
  - CAYO LA CABRA
  - UN TITULO VIEJO
  - ZINGAROS
  - ADAMS (Los Adams)
  - C 1080 y C1080 (Cuareim 1080)
  - Las Lonjas de Cuareim
  - Ay Q'darle (Hay Q'Darle)
  - Samburu Morán (Samburú Morán)
  - GEMINIS
  - BAFO DA ONCA
  - LOS BUBY´S y Los Bubys
  - LA LINEA MAGINOT
- **Más que Lonja:** se sacó de `fuente_url` la nota de Caras y Caretas sobre Falta y Resto.

## calendario_2027.csv

- **Llamadas de San Baltasar** pasó de tipo `llamadas` a `otro` y sigue con `estado=estimado`. Ahora sólo las dos noches del Desfile Oficial (5 y 6 de febrero) tienen tipo `llamadas`.

## validate.py (nuevo)

Chequea:
- Codificación (UTF-8, sin BOM, avisa si hay CRLF).
- Columnas exactas y en orden.
- Espacios sobrantes.
- Valores válidos por columna.
- Slugs con formato correcto y únicos.
- Nombres y alias que no choquen entre filas (comparando sin mayúsculas ni tildes).
- `fuente_url` con separador ` | `, URLs válidas y sin repetir.
- Formato de las URL de Instagram y Facebook.
- En conjuntos: que `en_llamadas=true` sólo esté en comparsas y que `en_concurso=true` sólo esté en filas de `temporada_lista=2027`.
- En escenarios: que los itinerantes no tengan dirección.
- Fechas en formato AAAA-MM-DD, válidas y con `fecha_fin >= fecha_inicio`. Avisa si hay un tipo `llamadas` fuera de febrero.
- Conteo de **46 comparsas con `en_llamadas=true`**.

Imprime un resumen y sale con código 1 si hay errores. Las advertencias no cortan.

- **Para el 17/11:** completar `en_concurso` con el resultado de la Prueba de Admisión y correr `python research/validate.py --post-prueba`. Exige que no queden vacíos en filas con `verificado=true` y que haya **39** conjuntos con `en_concurso=true` (23 + 16).
- Los valores esperados (46 y 39) son constantes al principio del archivo.
- Lo probé metiendo errores a propósito (BOM, slug repetido, alias que choca, espacio sobrante, valor fuera de la lista, separador mal puesto, 45 comparsas, itinerante con dirección, fecha mal escrita, fin antes que inicio) y los detecta todos.

Resultado actual: **OK, sin errores**, con 5 advertencias:
- 8 conjuntos con `verificado=false`.
- 34 conjuntos con `en_concurso` pendiente.
- `tipo`, `gratis` e `itinerante` sin dato en Escenario en Canelones.

## Pendientes nuevos

1. **Escenario en Canelones:** averiguar ubicación, tipo (privado o popular), precio y si es un escenario fijo.
2. **Sala Nelly Goitiño, Alba Roballo y Club Salus:** confirmar con DAECPU si tuvieron funciones en 2026. Están en su guía 2026 pero no en las carteleras. Si las tuvieron, pasarlos a `activo=true`.
3. **Escenarios de la lista de DAECPU que no están en el CSV:** Costa de Oro, Eduardo Lladó, Esquinas Cultura, Hipódromo, La Bajada y Rincón del Cerro. Rincón del Cerro figura en la guía 2026 (Cibils esq. La Boyada) pero en ninguna cartelera 2026. Ver si funcionaron en 2026 y agregarlos.
4. **Eduardo Lladó:** confirmar si es el mismo lugar que el Centro Cultural Alba Roballo (la prensa de 2024 los junta y DAECPU los separa).
5. **Chatas y Carnaval de a Pie:** la prensa no las numera. Para asignar cada actuación a «Escenario Móvil IM 1 o 2» o a «Carnaval de a Pie N» hay que usar la grilla de DAECPU, o resolverlo por la ubicación de la noche.
6. **Categoría** de Géminis, Bunny Show, El Show de la 8 y La Línea Maginot (quedaron en `otro`).
7. **Los ocho conjuntos nuevos:** Instagram, Facebook y barrio. Pasarlos a `verificado=true` cuando se confirmen.
8. **Escuelas de samba (categoría `samba`):** El Observador tiene la lista de las 8 que desfilaron en 2026, para cargarlas en otra pasada:
   - Complejo Do Samba (Florida)
   - GRES Asabranca
   - Imperatriz
   - Urusamba
   - Mocidade Unida
   - Imperio Preto y Branco
   - Unidos do Norte
   - Barrio Cerrito

   Fuente: <https://www.elobservador.com.uy/cultura-y-espectaculos/show-escuelas-samba-18-julio-horarios-precios-y-cortes-transito-el-segundo-desfile-carnaval-n6031819/amp>. Bafo da Onça no figura en ese desfile.
9. **Widget de DAECPU:** el HTML no expone de dónde se carga la tabla de programación. Sigue pendiente revisarlo con DevTools en temporada.
10. **17/11:** cargar el resultado de la Prueba de Admisión y correr `validate.py --post-prueba`.
11. **`informe_fase0.md`:** la sección 0 tiene los conteos de antes de este cambio (33 escenarios, 102 conjuntos, San Baltasar como `llamadas`). No se modificó; los valores actuales son los de este archivo.

## 2026-11-10 · Aspirantes de la Prueba de Admisión con lista 2027

Once conjuntos que van a la Prueba de Admisión 2027 tenían `temporada_lista=2026`, porque la fila venía del Concurso 2026. Como figuran en el fixture de la Prueba 2027 (Montevideo Portal, 14/10/2026: <https://www.montevideo.com.uy/Tiempo-libre/Carnaval-2027-el-fixture-de-la-Prueba-de-Admision-con-34-conjuntos-uc978569>, revisado de nuevo el 2026-11-10), pasaron a `temporada_lista=2027` y esa URL quedó primera en `fuente_url`. `en_concurso` sigue vacío (pendiente) hasta el 17/11.

- La Margarita, Don Bochinche y Cía, A la Bartola, La Mojigata, Gente Grande, Mi Vieja Mula, Jardín del Pueblo, Carambola, House, Los Chobys y Social Club.
- Ahora los 34 aspirantes tienen `temporada_lista=2027`, y el seed les crea la fila de `conjunto_temporada` 2027 con `en_concurso` nulo (98 filas en total).
- Quedan 12 con `temporada_lista=2026`, sin fila 2027: Curtidores de Hongos, Los Adams, Jorge, Herencia Ancestral y los ocho fuera de concurso.
- `python research/validate.py`: OK, sin errores, con las mismas 5 advertencias.

## 2026-11-11 · Fixture del Concurso Oficial

Archivo nuevo: `fixture_2027.csv`, con el fixture del Concurso en el Teatro de Verano. **Está vacío, sólo con el encabezado: el fixture 2027 todavía no se publicó.**

- Columnas: `rueda` (primera, segunda o liguilla), `numero` (de etapa, dentro de la rueda), `fecha` (la noche, AAAA-MM-DD), `hora` (de Montevideo, HH:MM), `conjunto` (el slug de `conjuntos.csv`) y `fuente_url`.
- Una fila por conjunto y noche. Una hora anterior a las 06:00 es de la madrugada siguiente y sigue siendo de esa noche: no se le suma un día a `fecha`.
- `validate.py` controla que cada etapa tenga una sola fecha, que no haya dos etapas la misma noche, que un conjunto no esté dos veces en una etapa y que el slug exista; avisa si el conjunto no figura con `en_concurso = true`.
- Para revisar un borrador sin tocar el repo: `python research/validate.py --fixture <archivo>`.
- `pnpm gen:seed` lo carga como etapas y actuaciones del Teatro de Verano.
- `python research/validate.py`: OK, sin errores, con las mismas 5 advertencias.

