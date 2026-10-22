# Cuerda — Informe Fase 0 (investigación y validación)

Fecha de corte: 2026-10-22 (hora de Uruguay, America/Montevideo).
Archivos entregados: `conjuntos.csv`, `escenarios.csv`, `calendario_2027.csv` y este informe.

**En una línea:** seguir, con condiciones. Los datos base existen y son públicos, el hueco de producto es real (Llamadas, candombe y escenarios gratuitos) y la única app activa no lo cubre. El riesgo grande es la grilla diaria: hay que asegurarla con DAECPU antes de mediados de diciembre. El detalle está en la sección 9.

---

## 0. Cómo leer los CSV

### conjuntos.csv (102 filas)

| Categoría | Filas |
|---|---|
| comparsa | 47 |
| murga | 33 |
| parodistas | 9 |
| humoristas | 7 |
| revista | 6 |
| samba | 0 (pendiente, ver sección 8) |

- `en_concurso` y `en_llamadas` se refieren siempre al **Carnaval 2027**. Vacío quiere decir pendiente (todavía no se sabe).
  - `en_concurso = true`: 23 conjuntos con cupo directo (liguilla 2026).
  - `en_concurso = ""`: 34 conjuntos que van a la Prueba de Admisión del 10 al 16/11/2026, donde se pelean 16 cupos.
  - `en_concurso = false`: 45 conjuntos. Son las comparsas que sólo van a Llamadas, más Integración (renunció a su cupo), las bajas (Curtidores de Hongos, Los Adams) y los que no figuran en la prueba (Jorge, Herencia Ancestral).
  - `en_llamadas = true`: las 46 comparsas clasificadas a Llamadas 2027 (23 + 23). La lista está completa y es oficial.
- `temporada_lista` dice qué lista respalda la fila. `2027` es una lista 2027 oficial (cupos directos, fixture de la prueba 2027, clasificadas a Llamadas 2027). `2026` es una fila que sólo está respaldada por el Concurso 2026 (15 filas).
- Están los 40 conjuntos del Concurso 2026: 19 murgas, 5 parodistas, 5 humoristas, 5 revistas y 6 comparsas, según los fallos de la IM.
- `fuente_url` puede traer varias URL separadas por ` | `. La primera es la fuente de la lista. Las demás respaldan el barrio, el Instagram o el Facebook.
- Instagram encontrado: 42 de 102. Facebook: 17 de 102. Barrio: 36 de 102.
- `tipo_cuenta_ig = desconocido` en todas las filas. Sin abrir los perfiles (o sea, sin scraping) no se ve si una cuenta es Business, Creator o personal. Se puede resolver después con la API (sección 7): si `business_discovery` devuelve datos, la cuenta es profesional; si da error, es personal.

### escenarios.csv (33 filas, temporada 2026)

Hay 1 Teatro de Verano, 8 privados, 21 populares, 1 móvil (chatas de la IM), 1 gratuito (Carnaval de a Pie de DAECPU) y 1 Barrio a Barrio (Municipio A).

- Precios. El Teatro de Verano tiene precios 2026 completos. Para los populares se usó la entrada general de $120 que informó la prensa en febrero de 2026 (Red de Escenarios Populares). Para los privados no encontré precios 2026 por tablado: quedó «Sin dato 2026» y está anotado como pendiente.
- Móviles, Carnaval de a Pie y Barrio a Barrio son itinerantes. Llevan un ejemplo de ubicación de 2026, no una dirección fija.
- Faltan 4 direcciones (Anfiteatro Paso Carrasco, La Pólvora, Santiago Vázquez, Club Holanda) y 16 barrios.

### calendario_2027.csv (19 eventos: 14 confirmados, 5 estimados)

- Calendario oficial de la IM publicado el 2026-09-07 (actualizado el 2026-09-22): <https://montevideo.gub.uy/noticias/el-carnaval-ya-tiene-fechas-0>.
- Fechas clave confirmadas:
  - Desfile Inaugural: **jueves 2027-01-21**.
  - Escuelas de Samba: 2027-01-22.
  - Inicio del Concurso: lunes 2027-01-25.
  - **Llamadas: viernes 2027-02-05 y sábado 2027-02-06.**
- Eventos estimados según el patrón 2026:
  - San Baltasar (6/1).
  - Avant Premiere de DAECPU.
  - Temporada de tablados (22/1 al 7/3).
  - Concurso completo hasta la noche de fallos (2027-03-03).
  - Corsos barriales (3/2 al 26/2).

### Discrepancias entre fuentes

- **Prueba de Admisión al Concurso.** La IM dice del 10 al 18/11. El fixture de 34 conjuntos dice del 10 al 16/11. Usé el fixture. Puede que el 17 y el 18 sean para fallos o reserva.
- **Montevideo Portal** pone a La Nueva Milonga como parodistas en el fixture 2026. Los fallos de la IM la ubican en murgas, y así quedó.
- **La Nueva Escuela** ganó las Llamadas de Admisión (está en Llamadas 2027) y además aspira al Concurso en la prueba. Tiene `en_llamadas = true` y `en_concurso` vacío.
- **Integración** tenía cupo directo al Concurso 2027 y anunció que no lo usa. Sí desfila en Llamadas.
- **Más que Lonja** está clasificada a Llamadas 2027 pero tiene que pasar por la prueba para el Concurso.
- **Direcciones.** Teatro Flor de Maroñas y Tablado del Parque aparecen con variantes según la fuente. Usé la de DAECPU o Montevideo Portal.
- **Corsos 2026.** El listado de prensa tenía inconsistencias entre fecha y día de la semana, por eso los corsos 2027 quedaron como estimados por rango.

---

## 4. Fuentes de la grilla diaria

### Qué hay y cómo se publica

| Fuente | Qué cubre | Formato | Anticipación y frecuencia | ¿Fácil de procesar? |
|---|---|---|---|---|
| **DAECPU – «Seguí a tu conjunto»** (<https://www.daecpu.uy/segui-a-tu-conjunto.html>) | Grilla por fecha, conjunto o escenario. Incluye privados, populares, Teatro de Verano y también **Carnaval de a Pie 1–8, Escenarios Móviles IM 1–2 y Barrio a Barrio**. Tiene conjuntos fuera de concurso (Bafo da Onça, Bunny Show, Géminis, Los Buby's, etc.) | Web. La tabla se carga por JavaScript y no aparece en el HTML estático, así que probablemente haya un endpoint JSON detrás (**pendiente**: verlo con DevTools cuando haya datos 2027) | Los tablados compran conjuntos **por semana** en DAECPU («Se compra por semana y así se va definiendo la programación», Forbes). El horizonte real es de unos 7 días, con cambios de último momento | Sí, si se confirma el endpoint o si DAECPU pasa una planilla. Es la fuente más completa |
| **DAECPU – «La guía de Tablados del carnaval 2026»** (<https://www.daecpu.uy/daecpu/escenarios.html>, 2026-01-20) | Nómina de tablados con dirección | HTML estático, una vez por temporada | Sale días antes del Inaugural | Sí, para la tabla de escenarios |
| **DAECPU – redes** (IG [@daecpu_oficial](https://www.instagram.com/daecpu_oficial/), [FB daecpuoficial](https://www.facebook.com/daecpuoficial/), [X @daecpu_oficial](https://twitter.com/daecpu_oficial)) | Novedades y piezas gráficas | **No verificado.** Por la regla de no hacer scraping no abrí los feeds, así que no sé si publican la grilla como imagen | Pendiente | Si es imagen, no se puede procesar sin OCR |
| **IM – escenarios móviles** | Programación de las chatas | Comunicado de prensa o noticia. En 2025 la IM dijo que confirmaba la programación «en los días previos a la actividad» ([Montevideo Portal 2025](https://www.montevideo.com.uy/Archivo/De-aqui-para-alla-IM-difundio-la-programacion-de-los-escenarios-moviles-del-Carnaval-2025-uc913788); [Radio 36, 2026-02-11](https://radio36.com.uy/2026/02/11/continuan-los-escenarios-moviles-de-la-intendencia-de-montevideo/)) | Por tandas, unos días antes | Texto en noticia, se procesa a mano |
| **IM – corsos barriales** | 12 corsos en 2026 | Noticia con lista de fechas y lugares, una vez por temporada ([El Observador](https://www.elobservador.com.uy/cultura-y-espectaculos/los-12-corsos-barriales-que-se-haran-esta-zafra-carnaval-y-sus-ubicaciones-n6032736)) | Antes del inicio de la zafra | Sí, es un listado chico |
| **IM – portal «Carnaval y Llamadas»** (<https://montevideo.gub.uy/area-tematica/cultura-y-tiempo-libre/carnaval-y-llamadas>) | Calendario, fallos, desfiles | Noticias HTML | Por hito | Bien para calendario y resultados, no para la grilla diaria |
| **Municipio A – «Viví el carnaval en el oeste»** (<https://municipioa.montevideo.gub.uy/viv%C3%AD-el-carnaval-en-el-oeste-1>) | Paradas de Barrio a Barrio | Página HTML | Por temporada | Sí |
| **El Observador** | Lista diaria o de fin de semana de qué hay en cada tablado, móviles y Carnaval de a Pie, «con base en la grilla de cartelera de tablados informada desde Daecpu» ([ej. 2026-02-28](https://www.elobservador.com.uy/cultura-y-espectaculos/la-lista-tablados-y-espectaculos-carnaval-este-fin-semana-n6035835)) | Nota HTML | Sale el mismo día (5:00) o el viernes para el fin de semana | Texto libre. Es derivada de DAECPU |
| **Montevideo Portal** | Cronogramas de fin de semana ([ej.](https://www.montevideo.com.uy/Tiempo-libre/Los-tablados-comienzan-a-recibir-a-los-conjuntos-el-cronograma-para-este-fin-de-semana-uc950352)) | Nota HTML | Semanal o fin de semana | Texto libre |

### Cuál usar

- **La más confiable y fácil de procesar es DAECPU.** La prensa reconoce que arma sus listas con la grilla de DAECPU, y es la única fuente que junta pagos y gratuitos en un mismo lugar. Hay dos formas de traerla:
  1. **Acuerdo** para recibir una planilla o CSV semanal (borrador en la sección 8). Es la mejor opción.
  2. **El endpoint del widget**, si existe y DAECPU lo permite. No conviene depender de él sin permiso.
- **IM** para móviles y corsos, con carga manual o semimanual. El volumen es chico.
- **Prensa** como verificación cruzada diaria, no como fuente primaria.

---

## 5. Competencia

| Producto | Qué hace | Qué le falta | ¿Activa? |
|---|---|---|---|
| **Carnaval App** (Pedro Franco). [iOS](https://apps.apple.com/uy/app/carnaval-app/id6457516375), [Android](https://play.google.com/store/apps/details?id=com.carnavalappuy&hl=es_US), [web](https://carnavalapp.uy) | Tablados, conjuntos, programación diaria, resultados, pencas con premios, botón de compra en RedTickets (v13.4.0, 2025-11-02) y consulta de los tablados de un conjunto por fecha (v10.0.1, 2024-01) | Una reseña del 2026-02-14 dice que «no tiene la programación de todos los tablados, le falta el carrusel, tablados móviles, carnaval de a pie» y que «debería darnos información carnavalera todo el año (ensayos, pases, actuaciones especiales)». También menciona fallas puntuales. No encontré un modo Llamadas ni una agenda de comparsas | **Sí.** Versión 13.11.2 (28-sep-2026). En Google Play tiene 5K+ descargas, 4,7★ (49 opiniones) y anuncios. **Es el competidor directo** |
| **DAECPU – «Seguí a tu conjunto»** | La grilla más completa, con gratuitos incluidos | Sólo web y sólo búsqueda: sin app, favoritos, alertas, mapa ni contenido de Llamadas | Sí, cada temporada |
| **App «Intendencia de Montevideo»** ([iOS](https://apps.apple.com/uy/app/intendencia-de-montevideo/id1130550991), Montevideo DTI, categoría Utilidades) | Trámites y servicios municipales | No encontré una sección de carnaval | Sí, pero no compite |
| **IM web «Carnaval y Llamadas»** | Calendario, noticias, fallos | No tiene grilla diaria ni personalización | Sí |
| **El Observador / Montevideo Portal** (Montevideo Portal tiene además [Cartelera](https://www.cartelera.com.uy/), de espectáculos en general) | Listas diarias o de fin de semana, crónicas | Contenido editorial, sin búsqueda por conjunto ni alertas | Sí, en temporada |
| **Latido Afro** (<https://latidoafro.uy/agenda.php>) | «Agenda de comparsas»: sedes, horarios de toques y ensayos | Sólo agenda, sin grilla de carnaval. **Pendiente** verificar cada cuánto se actualiza | Aparentemente sí |
| **Cooltivarte** ([tablados y locales 2026](https://cooltivarte.com/portal/tablados-y-locales-de-conjuntos-carnaval-2026/), [Llamadas 2025](https://cooltivarte.com/portal/desfile-de-llamadas-2025/)) | Notas con tablados, locales de ensayo y desfiles | Editorial, sin app | Sí |
| **Carnaval del Futuro** (X [@carnavaldfuturo](https://twitter.com/carnavaldfuturo)) | Información y archivo de conjuntos | Sin grilla diaria verificada | Activo en redes |

**Lectura.** Hay una sola app activa con tracción moderada (5K+ descargas en Android). Está centrada en el Concurso, los tablados y las pencas, y sus propios usuarios piden lo que Cuerda quiere hacer: gratuitos, móviles, Carnaval de a Pie e información de todo el año. **Nadie tiene un modo Llamadas** (orden, hora estimada por comparsa, recorrido, cortes) ni una agenda de candombe integrada con el carnaval.

---

## 6. Llamadas

### Quién maneja el orden de desfile

**La IM, no AUDECA.** El desfile lo organiza la Intendencia de Montevideo, que coordina con AUDECA (Asociación Uruguaya de Candombe) y DAECPU.

- En 2026, de las 44 comparsas en concurso, 33 eran de AUDECA y 11 de DAECPU. Las dos invitadas eran de AUDECA ([El Observador, 2026-02-04](https://www.elobservador.com.uy/cultura-y-espectaculos/desfile-llamadas-el-orden-las-comparsas-cada-noche-y-las-curiosidades-el-reglamento-n6033082)).
- Para las Llamadas de Admisión 2027, cada comparsa necesitaba el aval de AUDECA o de DAECPU al inscribirse. El orden de Admisión se **sorteó el 2026-09-28 en la Sala Roja de la IM**, con directores y representantes de las dos asociaciones ([DAECPU](https://www.daecpu.uy/prensa/las-llamadas-de-admision-para-el-carnaval-2027-llevaran-el-nombre-rafael-martinez-crosa.html); [El Observador](https://www.elobservador.com.uy/cultura-y-espectaculos/todos-los-detalles-las-llamadas-admision-que-se-haran-el-prado-y-32-comparsas-n6058759)).
- Patrón 2026 del desfile oficial:
  - El viernes desfilaron las clasificadas por el desfile anterior. Abrió la campeona, C 1080.
  - El sábado desfilaron las clasificadas en Admisión. Abrió Zumbaé, ganadora de Admisión.
  - Cada noche cerró una invitada.
  - El orden completo salió en prensa el 2026-02-04, dos días antes.
  - **Pendiente:** confirmar en el reglamento 2027 cómo se fija el resto del orden (no lo encontré explícito).

### 2027

- 46 comparsas: 35 de Montevideo y 11 del interior.
  - Noche 1, viernes 2027-02-05: las 23 mejor ubicadas en 2026. Cuareim 1080 ganó 2026 y quedó tricampeona.
  - Noche 2, sábado 2027-02-06: las 23 de Admisión. La Nueva Escuela salió 1ª, Samburú Morán 2ª y Malanque 3ª.
  - La asignación de noches sigue el patrón 2026 y hay que confirmarla cuando la IM publique el orden ([fallos de Admisión](https://mediospublicos.uy/se-conocieron-los-fallos-de-las-llamadas-de-admision-2027/)).

### Recorrido y dinámica (edición 2026)

- **Recorrido.** Carlos Gardel e Isla de Flores, desde Zelmar Michelini hasta Minas. Son nueve cuadras, en los barrios Sur y Palermo.
- **Horario.** La primera comparsa sale a las **20:00** y la última poco antes de la medianoche.
- **Reglamento 2026:**
  - Entre 75 y 150 componentes.
  - De 42 a 70 tamborileros.
  - Cada comparsa larga **10 minutos y 150 metros** después de la anterior.
  - **Máximo de 66 minutos** para completar el recorrido.
- Con estas reglas se puede calcular la **hora estimada de paso por cuadra** de cada comparsa. Ese es el diferencial del modo Llamadas.

### Cortes de tránsito (2026, IM vía [El Observador, 2026-01-31](https://www.elobservador.com.uy/cultura-y-espectaculos/la-intendencia-montevideo-presento-el-detalle-varios-cortes-el-transito-el-desfile-llamadas-n6032942))

- **No estacionar desde las 8:00** de cada día de desfile en siete tramos:
  - Martínez Trueba entre Isla de Flores y Durazno.
  - Martínez Trueba entre Isla de Flores y San Salvador.
  - Ejido entre Durazno y Gonzalo Ramírez.
  - Ejido entre Isla de Flores y Durazno.
  - Magallanes entre Durazno e Isla de Flores.
  - Magallanes entre San Salvador e Isla de Flores.
  - Francisco Reduello entre Isla de Flores y Gonzalo Ramírez.
- **Pintura de Isla de Flores** con cortes cuadra a cuadra, del 1 al 5 de febrero:
  - Domingo 1: Minas a Salto.
  - Lunes 2: Salto a Barrios Amorín.
  - Martes 3: Barrios Amorín a Ejido.
  - Miércoles 4: Aquiles Lanza a Zelmar Michelini.
  - Jueves 5: Ejido y Aquiles Lanza.
- **Viernes desde las 7:00:** cerrado Aquiles Lanza e Isla de Flores.
- **Sábado desde las 12:00:** Isla de Flores cortada en todo el tramo del desfile.
- **Cruces de Ejido y Martínez Trueba:** abiertos sólo hasta las 17:00.
- **Vecinos del trayecto:** sus vehículos no pueden entrar ni salir de 16:00 a 3:00. Los autos estacionados se reubican, y se consulta al **1950 4000, opción 1**.

### Servicios para el público (2026)

- **Gradas y palcos** los monta la IM.
- **Localidades:** entre **$300 y $700**, **sólo en Abitab**. Los palcos se agotaron antes de que empezara la venta general.
- Premios 2026: $8.526.651 en total. Es un dato útil para dar contexto en la app.
- **Baños, sillas, accesibilidad y puestos de salud: no encontré información pública.** Queda pendiente: preguntarlo a la IM o a AUDECA.

---

## 7. API de Instagram (Business Discovery)

### Requisitos

- **Tipo de app.** Una app de Meta (tipo Business) con el producto **«Instagram API with Facebook Login»**. Business Discovery **no** está disponible en la variante «Instagram API with Instagram Login» ([referencia](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery)).
- **Cuenta propia.** Necesitás **tu propia cuenta de Instagram profesional** (Business o Creator) **vinculada a una Página de Facebook**. Cada consulta se hace «desde» esa cuenta.
- **Endpoint:**
  `GET https://graph.facebook.com/<versión>/<TU_IG_USER_ID>?fields=business_discovery.username(<usuario>){followers_count,media_count,media{caption,media_type,media_url,permalink,timestamp,like_count,comments_count}}`
- **Permisos** (token de usuario de Facebook): `instagram_basic`, `instagram_manage_insights` y `pages_read_engagement`. Si tu rol en la Página viene de Business Manager, además `ads_management` o `ads_read`.

### App Review

La tabla oficial dice que si la app es «sólo para un negocio que tengo o administro», alcanza con **Standard Access y no hace falta App Review** ([App Review for Instagram API](https://developers.facebook.com/documentation/instagram-platform/app-review)).

- Cuerda encaja ahí si la consulta la hace **tu backend con tu token**, por ejemplo un cron en una Edge Function de Supabase. Los usuarios de la app no se loguean con Instagram.
- Si en algún momento otros usuarios se conectan con sus cuentas, pasás a Advanced Access, con App Review y verificación de negocio.
- Meta advierte que algunas funciones pueden no andar bien en Standard Access. **Conviene probar Business Discovery con 3 o 4 cuentas reales ya**, antes de diseñar sobre eso.

### Qué devuelve

- **Del perfil:** campos públicos (`username`, `name`, `biography`, `followers_count`, `follows_count`, `media_count`, `profile_picture_url`, `website`).
- **Del edge `media`:**
  - `id`, `caption`, `media_type`, `media_url`, `permalink`, `timestamp`.
  - `comments_count` y `like_count`. `like_count` no viene si el dueño ocultó los likes.
  - `children` para los carruseles y `view_count` en reels.
  - La paginación es con cursores `before` y `after`, a mano.

### Límites y restricciones

- **Cuota.** Business Discovery usa los **Platform Rate Limits** ([rate limiting](https://developers.facebook.com/docs/graph-api/overview/rate-limiting)), no los BUC del resto de Instagram.
  - Con token de app: **200 llamadas × cantidad de usuarios, por hora móvil**.
  - Con token de usuario, Meta no publica la cifra por usuario.
  - Con un solo usuario (vos), refrescar unas 100 cuentas cada hora queda justo. Mejor cada 3 a 6 horas, y priorizando.
- **Cuentas sin datos:** las personales dan error y las cuentas con restricción de edad no devuelven nada.
- **Business vs. Creator:** no encontré un campo que los distinga en Business Discovery. Sí se puede distinguir profesional de personal.
- **`media_url` ausente** ([changelog](https://developers.facebook.com/documentation/instagram-platform/changelog)) en videos con audio con derechos o con licencia, y en reels con las descargas desactivadas. En esos casos hay que usar `permalink` o `thumbnail_url`. Afecta a muchos reels con música, que es justo lo que suben los conjuntos.

### Historias de cuentas ajenas: no se pueden leer

El endpoint `/{ig-user-id}/stories` sólo devuelve las historias de **tu propia** cuenta, y sólo las de las últimas 24 horas ([referencia](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/stories)). No hay un camino oficial para leer historias de terceros.

### Alternativas y contexto

- Desde el 2026-05-15, el **oEmbed de Instagram se puede llamar sin access token** ([changelog](https://developers.facebook.com/documentation/instagram-platform/changelog); [docs oEmbed](https://developers.facebook.com/documentation/instagram-platform/oembed)). Sirve para embeber un post a partir de su URL, aunque la cuenta sea personal.
- La Basic Display API se dio de baja el 2024-12-04 ([Meta](https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api/)). Ya no es opción.

**Recomendación.** Usar Business Discovery como un extra («últimos posts del conjunto»), nunca como fuente de la grilla. Pedir permiso a cada conjunto para mostrar su contenido (el DM de la sección 8 lo hace).

---

## 8. Borradores de contacto

### 8.1 DAECPU (mail a secretaria@daecpu.org.uy)

**Asunto:** Propuesta: app gratuita con la grilla oficial de DAECPU

> Hola, ¿cómo andan?
>
> Soy Emiliano, desarrollador uruguayo. Estoy armando **Cuerda**, una app gratuita para seguir el carnaval día a día: qué conjunto actúa, en qué escenario y a qué hora, con foco en las Llamadas y en los escenarios gratuitos.
>
> «Seguí a tu conjunto» es la grilla más completa que existe y la quiero usar como fuente oficial, citando a DAECPU en cada pantalla.
>
> ¿Sería posible recibirla en un formato simple, una planilla compartida o un CSV con fecha, hora, conjunto y escenario, aunque sea semana a semana como la arman hoy?
>
> A cambio les ofrezco atribución visible, links a sus abonos y tablados, y estadísticas de uso (qué conjuntos y escenarios se buscan más). No hay plata de por medio ni pido exclusividad.
>
> ¿Tienen 15 minutos para una llamada, o paso por la sede?
>
> Gracias,
> Emiliano · [celular]

### 8.2 AUDECA (por sus redes o por intermedio de la IM; no encontré un contacto directo)

> Hola, ¿qué tal?
>
> Soy Emiliano y estoy armando **Cuerda**, una app gratuita del carnaval con un modo especial para las Llamadas del 5 y 6 de febrero: orden de salida, hora estimada de paso de cada comparsa, recorrido, cortes y dónde sacar entradas.
>
> Les quería consultar dos cosas:
> 1. ¿Cuándo y por qué canal se publica el orden oficial de desfile? Lo quiero cargar apenas salga y sin errores.
> 2. ¿Les sirve que cada comparsa tenga una ficha (barrio, historia corta, días y lugar de salida o ensayo, redes)? Puedo armar un formulario sencillo para que lo completen ellas mismas, y si ustedes lo difunden, mejor.
>
> Es gratis para las comparsas y para el público, y la información va atribuida a AUDECA. ¿Con quién puedo hablar?
>
> Un abrazo,
> Emiliano · [celular]

### 8.3 DM genérico de Instagram (conjuntos y comparsas)

> ¡Hola! Soy Emiliano y estoy armando **Cuerda**, una app gratis para seguir el carnaval y las Llamadas: dónde actúa cada conjunto y cuándo salen las comparsas. Quiero que [NOMBRE] aparezca bien:
> • ¿Me confirman el barrio y, si tienen, días y lugar de ensayo o salida?
> • ¿Les parece bien que linkee su Instagram y muestre sus publicaciones en la ficha?
> No tiene costo ni compromiso. ¡Gracias y nos vemos en febrero! 🥁
>
> P.D.: si la cuenta es profesional (empresa o creador, es gratis cambiarla), la app puede mostrar sus últimos posts automáticamente.

---

## 9. Pendientes

**Datos**
1. **Resultado de la Prueba de Admisión al Concurso** (10 al 16/11). Cuando salga, completar `en_concurso` en las 34 filas pendientes y pasar las de `temporada_lista` 2026 a 2027.
2. **Instagram de 60 conjuntos** y **Facebook de 85**. Sobre todo los 21 aspirantes nuevos y las comparsas de Admisión.
3. **`tipo_cuenta_ig`** de todos. Se resuelve con Business Discovery una vez que esté la app de Meta.
4. **Barrio** de 66 conjuntos.
5. **Escuelas de samba** (categoría `samba`): no armé la lista. Buscarla con la IM, que organiza el desfile del 22/1.
6. **Precios 2026 de los tablados privados**, uno por uno.
7. **Escenarios.** Faltan 4 direcciones y 16 barrios. Revisar si Rincón del Cerro funcionó en 2026.
8. **Orden oficial de Llamadas 2027** y cómo se define en el reglamento (en 2026 salió dos días antes).
9. **Llamadas:** baños, sillas, accesibilidad, puestos de salud y fecha de venta en Abitab.

**Fuentes**

10. **Endpoint del widget de DAECPU:** inspeccionarlo con DevTools cuando cargue datos 2027 (enero).
11. **Formato de las publicaciones de DAECPU en redes:** ¿suben la grilla como imagen?
12. **Contacto de AUDECA.**
13. **Calendario estimado:** confirmar San Baltasar, Avant Premiere, corsos 2027 y la fecha de la noche de fallos.

---

## 10. Recomendación: **SEGUIR, con condiciones**

### Por qué seguir

1. **Los datos base existen y son públicos u oficiales.**
   - El calendario 2027 ya está publicado por la IM.
   - La lista de Llamadas 2027 está completa: 46 comparsas.
   - El Concurso tiene 23 conjuntos confirmados y el resto se define a mediados de noviembre.
   - La guía de tablados se publica cada año.
2. **Hay un hueco claro.**
   - La única app activa no cubre gratuitos, móviles, Carnaval de a Pie ni información fuera de temporada, y sus propios usuarios lo piden.
   - Nadie tiene un modo Llamadas.
   - Con el reglamento (10 minutos entre comparsas) se puede dar una hora estimada por cuadra, cosa que hoy no ofrece nadie.
3. **Es técnicamente viable con tu stack.**
   - Todo el seed cabe en tres tablas chicas.
   - La grilla diaria se puede cargar a mano en el peor caso, porque son unos pocos cientos de filas por semana.
   - Instagram es un extra sin App Review si lo consultás desde tu backend.
4. **Los plazos dan, pero ajustados:** 91 días al Desfile Inaugural (2027-01-21) y 106 a las Llamadas (2027-02-05).

### Riesgos

- **La grilla diaria es el riesgo número uno.** Sin un acuerdo con DAECPU o un endpoint estable, el «pizarrón» se arma a mano todos los días durante unas seis semanas.
- **Hay un competidor instalado** (Carnaval App) con usuarios y pencas. Pelearle de frente el Concurso y los tablados no tiene sentido.
- **Estacionalidad.** El uso fuerte dura unos 45 días, más dos picos (Inaugural y Llamadas).
- **Tiempos de revisión** en App Store y Google Play.

### Condiciones (o puntos de corte)

1. **Antes del 2026-12-15:** acuerdo con DAECPU o acceso estable a la grilla.
   - Si no se consigue, igual seguir, pero recortando: lanzar con calendario, conjuntos, escenarios, **modo Llamadas** y agenda de gratuitos, y dejar el pizarrón completo para cuando haya fuente.
2. **MVP enfocado en el diferencial:**
   - Modo Llamadas: orden, hora estimada, recorrido, cortes y entradas.
   - Gratuitos: móviles, Carnaval de a Pie y Barrio a Barrio.
   - Pizarrón diario y favoritos con alerta.
   - Quedan afuera pencas y reseñas.
3. **Mandar a revisión de las tiendas antes del 2027-01-05.** Así queda margen para un rechazo antes del Inaugural.
4. **Del 17 al 19/11:** actualizar `conjuntos.csv` con el resultado de la prueba y mandar los DM.

---

### Fuentes principales

- IM, calendario 2027: <https://montevideo.gub.uy/noticias/el-carnaval-ya-tiene-fechas-0>
- IM, fallos del Concurso 2026: <https://montevideo.gub.uy/noticias/fallos-del-concurso-oficial-del-carnaval-2026>
- DAECPU, «Seguí a tu conjunto»: <https://www.daecpu.uy/segui-a-tu-conjunto.html>
- DAECPU, «La guía de Tablados 2026»: <https://www.daecpu.uy/daecpu/escenarios.html>
- DAECPU, Llamadas de Admisión 2027: <https://www.daecpu.uy/prensa/las-llamadas-de-admision-para-el-carnaval-2027-llevaran-el-nombre-rafael-martinez-crosa.html>
- Medios Públicos, fallos de las Llamadas de Admisión 2027: <https://mediospublicos.uy/se-conocieron-los-fallos-de-las-llamadas-de-admision-2027/>
- El Observador, Prueba de Admisión 2027: <https://www.elobservador.com.uy/cultura-y-espectaculos/el-concurso-carnaval-pone-primera-rumbo-febrero-todos-los-detalles-la-prueba-admision-n6060452>
- Montevideo Portal, fixture de la Prueba 2027: <https://www.montevideo.com.uy/Tiempo-libre/Carnaval-2027-el-fixture-de-la-Prueba-de-Admision-con-34-conjuntos-uc978569>
- El Observador, orden y reglamento de Llamadas 2026: <https://www.elobservador.com.uy/cultura-y-espectaculos/desfile-llamadas-el-orden-las-comparsas-cada-noche-y-las-curiosidades-el-reglamento-n6033082>
- El Observador, cortes de tránsito de Llamadas 2026: <https://www.elobservador.com.uy/cultura-y-espectaculos/la-intendencia-montevideo-presento-el-detalle-varios-cortes-el-transito-el-desfile-llamadas-n6032942>
- El Observador, lista de tablados (grilla DAECPU): <https://www.elobservador.com.uy/cultura-y-espectaculos/la-lista-tablados-y-espectaculos-carnaval-este-fin-semana-n6035835>
- Forbes, cómo se arma la programación de los tablados: <https://www.forbesargentina.com/lifestyle/los-numeros-carnaval-cuanto-invierten-tablados-redito-obtienen-cada-febrero-n68217>
- Carnaval App: <https://play.google.com/store/apps/details?id=com.carnavalappuy&hl=es_US> · <https://apps.apple.com/uy/app/carnaval-app/id6457516375>
- Meta, Business Discovery: <https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery>
- Meta, App Review: <https://developers.facebook.com/documentation/instagram-platform/app-review>
- Meta, rate limits: <https://developers.facebook.com/docs/graph-api/overview/rate-limiting>
- Meta, changelog de Instagram: <https://developers.facebook.com/documentation/instagram-platform/changelog>
