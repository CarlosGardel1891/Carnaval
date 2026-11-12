# Plan: Carnavalero, la app del carnaval en Uruguay

Actualizado: 2026-10-22. Versión editable: <https://claude.ai/artifact/BaEsAAZw8mWdyUjJ7VSM2C>

> **Prioridad:** si algo de este plan choca con `docs/DECISIONES.md`, manda DECISIONES.md.
> Los datos semilla y sus conteos actuales están en `research/CAMBIOS.md`.

## Resumen

Objetivo: tener publicada en App Store y Google Play, antes del Desfile Inaugural del Carnaval 2027 (jueves 2027-01-21), una app que responda «¿qué hay hoy de carnaval, dónde y a qué hora?», con las Llamadas (5 y 6 de febrero de 2027) como sello. La app se llama **Carnavalero** (decisión 54; hasta el 2026-11-11 el nombre de trabajo fue Cuerda).

- **Qué es:** la guía del carnaval en Uruguay, sólo para iPhone y Android: no hay versión web para el público (decisión 50). Pizarrón diario de tablados, Concurso Oficial del Teatro de Verano, desfiles y un modo especial para las Llamadas. Fuera de temporada, mapa de salidas de tambores.
- **Alcance:** toda la información del carnaval en Uruguay. Se lanza con Montevideo y el área metropolitana; el interior se suma después del lanzamiento (decisión 52).
- **Para quién:** el carnavalero local (uso diario), el turista (pico de descargas en temporada) y los conjuntos (generan y validan la información).
- **Stack:** React + TypeScript + Vite + Capacitor + Supabase + Tailwind (el mismo de Travel).
- **Competencia:** existe Carnaval App (Pedro Franco), centrada en el Concurso, pencas y comunidad. Carnavalero también cubre el Concurso completo como información (fixture, resultados e historial; decisión 53), sin pencas ni comentarios, y se diferencia por alertas por conjunto, escenarios gratuitos, mapa, hora estimada en Llamadas, inglés, alcance nacional y uso todo el año. Ver `docs/competencia-carnaval-app.md`.
- **Plazo:** enviar a revisión de Apple y Google antes del 2027-01-05.

## Alcance por versión

El MVP cubre el carnaval de Montevideo y el área metropolitana con datos cargados desde un panel de admin; el interior, lo colaborativo y lo «en vivo» quedan para después. La app es sólo para iPhone y Android; el panel de admin es una web interna del equipo (decisiones 50 y 51).

| Funcionalidad | Versión | Cuándo |
| --- | --- | --- |
| Pizarrón «Hoy»: actuaciones del día en todos los escenarios, filtros cerca / gratis / mis conjuntos | MVP | Antes del Inaugural |
| Mapa de escenarios con ficha (tipo, precio, dirección, grilla de la noche) | MVP | Antes del Inaugural |
| Fichas de conjuntos por categoría y botón Seguir | MVP | Antes del Inaugural |
| Push «tu conjunto actúa hoy» y aviso de suspensión o cambio | MVP | Antes del Inaugural |
| Calendario del carnaval: desfiles, etapas del concurso, corsos | MVP | Antes del Inaugural |
| Concurso Oficial: fixture del Teatro de Verano por rueda y etapa | MVP | Antes del Inaugural |
| Modo Llamadas: orden por noche, **hora estimada de paso por cuadra**, fichas de comparsas, recorrido, cortes de calle, glosario | MVP | Antes del Inaugural |
| Panel admin web, interno, con importación de la grilla (CSV o texto de prensa) | MVP | Antes del Inaugural |
| Idiomas español e inglés | MVP | Antes del Inaugural |
| «¿Por dónde va el desfile?» con reportes de la gente | v2 | Durante el carnaval |
| Resultados del Concurso de la temporada, por rueda y categoría | v2 | Durante el carnaval |
| Ingesta asistida desde Instagram con aprobación manual | v2 | Durante el carnaval |
| Modo barrio: mapa de salidas de tambores | v3 | Desde marzo 2027 |
| «Seguí la cuerda»: ubicación en vivo de la comparsa | v3 | Desde marzo 2027 |
| Cuentas verificadas de conjuntos y comparsas | v3 | Desde marzo 2027 |
| Historial de resultados del Concurso (años anteriores) | v3 | Desde marzo 2027 |
| Carnaval del interior del país | A definir | Después del lanzamiento |
| Portugués | v3 | Antes del Carnaval 2028 |

Fuera de alcance: pencas, reseñas y comentarios (es el terreno de Carnaval App), y una versión web para el público.

Recorte de emergencia si no da el tiempo: Hoy + Conjuntos + Modo Llamadas, con el calendario como lista estática.

## Cronograma

| Fase | Fechas |
| --- | --- |
| 0 · Investigación y validación | 23 oct – 2 nov (hecha: `research/`) |
| 1 · Setup técnico | 3 – 5 nov |
| 2 · Modelo de datos | 6 – 9 nov |
| 3 · Hoy y escenarios | 10 – 23 nov |
| 4 · Conjuntos, Seguir y push | 24 – 30 nov |
| 5 · Calendario y Concurso | 1 – 7 dic |
| 6 · Modo Llamadas | 8 – 13 dic |
| 7 · Datos y panel admin | 1 dic – 10 ene (en paralelo) |
| 8 · QA, beta y publicación | 14 dic – 20 ene |
| Envío a revisión de tiendas | **2027-01-05** (fecha que no se mueve) |
| Desfile Inaugural | 2027-01-21 |
| 9 · Operación en temporada | 21 ene – 7 mar |
| Desfile de Llamadas | 2027-02-05 y 2027-02-06 |

Hitos externos: Prueba de Admisión al Concurso del 10 al 16 de noviembre (actualizar `research/conjuntos.csv` el 17/11, correr `python research/validate.py --post-prueba` y regenerar el seed con `pnpm gen:seed --post-prueba`). Acuerdo con DAECPU por la grilla: antes del 2026-12-15.

## Fase 0 · Investigación y validación (hecha)

Resultado en `research/`: `informe_fase0.md`, `conjuntos.csv` (110), `escenarios.csv` (42), `calendario_2027.csv` (19), `CAMBIOS.md` y `validate.py`. Pendientes de datos en `research/CAMBIOS.md`.

Pendiente con personas (lo hace Emiliano, no Claude Code):

- [ ] DAECPU: mail de alianza para recibir la grilla en CSV o planilla (borrador en `research/informe_fase0.md`, sección 8.1).
- [ ] AUDECA: orden de desfile y contenido de Llamadas (borrador 8.2).
- [ ] DM a conjuntos y comparsas (borrador 8.3).
- [ ] Cuenta de Instagram profesional vinculada a una Página de Facebook, para probar Business Discovery.

## Fase 1 · Setup técnico (3 – 5 nov)

Listo cuando: una app vacía corre en simulador iOS y emulador Android, muestra un mapa de Montevideo y lee una tabla de Supabase.

1. Monorepo con pnpm workspaces: `app/`, `admin/`, `supabase/`, `packages/shared/`. `research/` y `docs/` ya existen.
2. Supabase local (Docker) y remoto en São Paulo, con PostGIS y unaccent.
3. App: TypeScript estricto, Tailwind, React Router, TanStack Query.
4. Capacitor iOS y Android con un Bundle ID nuevo.
5. Mapa con MapLibre GL y tiles de MapTiler.
6. i18n con react-i18next, español e inglés desde el día uno.
7. Zona horaria fija `America/Montevideo`: las funciones pasan de medianoche (una actuación a las 00:40 cuenta para la noche anterior).
8. `CLAUDE.md` en la raíz.
9. CI en GitHub Actions: lint, typecheck y tests con Vitest.

Prompt listo: `prompts/fase-1-setup.md`.

## Fase 2 · Modelo de datos en Supabase (6 – 9 nov)

> Actualizada el 2026-11-10 con lo aprobado al arrancar la fase (decisiones 22 a 25 de `docs/DECISIONES.md`).

La tabla central es `actuaciones`: cada fila es «tal conjunto, en tal escenario, a tal hora», y de ahí salen el pizarrón, el mapa, las fichas y las push.

| Tabla | Campos clave | Versión |
| --- | --- | --- |
| `temporadas` | anio, fecha_inicio, fecha_fin, modo_llamadas_desde, modo_llamadas_hasta | MVP |
| `conjuntos` | slug, nombre, alias[], categoria (murga, parodistas, humoristas, revista, comparsa, samba, otro), barrio, bio, instagram, facebook, foto_url, verificado, fuente_url[], nombre_norm y alias_norm (generadas con `norm`) | MVP |
| `conjunto_nombres` | nombre_norm (clave primaria), conjunto_id. La mantiene un trigger; garantiza que un nombre o alias normalizado apunte a un solo conjunto | MVP |
| `conjunto_temporada` | conjunto_id, temporada_id, en_concurso (nullable = pendiente), en_llamadas | MVP |
| `escenarios` | slug, nombre, alias[], tipo (teatro_verano, privado, popular, movil, gratuito, barrio_a_barrio; nullable), direccion, barrio, ubicacion (PostGIS Point), precio_texto, gratis (nullable), activo, itinerante (nullable), fuente_url[], nombre_norm y alias_norm (generadas con `norm`) | MVP |
| `escenario_nombres` | nombre_norm (clave primaria), escenario_id. Igual que `conjunto_nombres` | MVP |
| `actuaciones` | escenario_id, conjunto_id, inicio, noche (fecha lógica, generada en la base), estado (programada, cambiada, suspendida), etapa_id, direccion_texto, ubicacion (para itinerantes), fuente, fuente_url. Clave natural para reimportar: (escenario_id, conjunto_id, noche) | MVP |
| `etapas_concurso` | temporada_id, rueda (primera, segunda, liguilla), numero, fecha | MVP |
| `eventos` | temporada_id, slug, tipo (inaugural, samba, llamadas, corso, admision, concurso, otro), nombre, fecha_inicio, fecha_fin (fechas puras), lugar, estado (confirmado, estimado), recorrido (PostGIS LineString), info, fuente_url[]. Cada noche de las Llamadas es un evento propio | MVP |
| `orden_desfile` | evento_id, conjunto_id, posicion (un orden por evento, o sea por noche) | MVP |
| `favoritos` | usuario_id, conjunto_id | MVP |
| `dispositivos_push` | usuario_id, token (único), plataforma, idioma | MVP |
| `reportes` | user_id, evento_id, conjunto_id, ubicacion, creado | v2 |
| `borradores_ingesta` | fuente_url, texto, datos_extraidos (jsonb), estado | v2 |
| `salidas` | conjunto_id, inicio, recurrencia, punto_partida, recorrido, estado | v3 |

**Reglas de acceso (RLS):** lectura pública de todo lo publicado; escritura sólo para el admin; `favoritos` y `dispositivos_push` sólo para su dueño. En el MVP todo lo que está en las tablas públicas está publicado (decisión 24). El admin es un usuario con el claim `app_metadata.rol = 'admin'`, que lee la función `es_admin()` (decisión 23).

**Usuarios:** auth anónima de Supabase, para que nadie tenga que registrarse para seguir conjuntos. Los usuarios anónimos tienen el rol `authenticated`, así que ese rol solo no habilita ninguna escritura sobre datos públicos.

**Funciones SQL (RPC):** todas reciben la noche lógica como parámetro (la app la calcula con `nocheLogica()`); ninguna usa el reloj de la base.

- `actuaciones_de_la_noche(noche, lat, lng, solo_gratis, solo_favoritos)` — alimenta la pantalla Hoy.
- `proximas_de_conjunto(conjunto_id, noche)` — para la ficha.
- `escenarios_cercanos(lat, lng, radio_m, noche)` — para el mapa; los itinerantes se ubican por sus actuaciones de esa noche.
- `buscar_por_nombre(texto)` — matching exacto normalizado contra nombre + alias (ver DECISIONES.md).
- `registrar_dispositivo_push(token, plataforma, idioma)` — alta o reasignación del token al usuario actual.

**Seed:** desde los CSV de `research/` (validados con `research/validate.py`), con un script que genera el SQL (`pnpm gen:seed`, decisión 26). Todos los conjuntos van al catálogo; la participación en la temporada (`conjunto_temporada`) sólo se carga para los que tienen una lista 2027 que la respalde. La grilla ficticia para desarrollo y tests va aparte (`pnpm db:grilla`, decisión 27) y sólo se carga en el Supabase local.

**Borrados:** un conjunto o un escenario con actuaciones no se puede borrar, ni un conjunto que está en un orden de desfile (decisión 28).

## Fases 3 a 6 · Funcionalidades del MVP (10 nov – 13 dic)

Cada fase termina con algo usable en el simulador y sus tests en verde; los datos de prueba salen de `research/`.

### Fase 3 · Pizarrón «Hoy» y escenarios (10 – 23 nov)

1. Pantalla Hoy: actuaciones de la noche agrupadas por escenario y ordenadas por hora.
2. Filtros: cerca mío (con permiso de ubicación), gratis y categoría. El filtro «mis conjuntos» va en la Fase 4, junto con Seguir.
3. Estados visibles: suspendida, cambiada, «ahora en escena» según la hora.
4. Mapa de escenarios con pines por tipo y lo que hay esa noche. Los itinerantes se ubican por la actuación de esa noche.
5. Ficha de escenario: dirección, precio, grilla de la noche y botón «cómo llegar» que abre el mapa del teléfono.

Listo cuando: con datos de una noche real de 2026 (ej. sábado 28 de febrero de 2026, cartelera de El Observador), la pantalla Hoy muestra lo mismo que la cartelera publicada.

Estado al 2026-11-10: los cinco puntos están hechos. La noche del 28/02/2026 se carga en el Supabase local con `pnpm db:noche-real` y se ve en `/?noche=2026-02-28`: entran 79 de las 82 líneas de la cartelera. Las tres que faltan son las de «ESCENARIOS MÓVILES», un encabezado que no dice cuál de los dos móviles de la IM es; quedan afuera a propósito (decisión 39) y el caso lo resuelve el importador de la Fase 7. Los escenarios reales no tienen coordenadas, así que aparecen en la lista y en su ficha, pero no en el mapa ni en «cerca mío».

### Fase 4 · Conjuntos, Seguir y push (24 – 30 nov)

1. Lista de conjuntos por categoría, con buscador.
2. Ficha: bio, próximas actuaciones, links a redes.
3. Seguir con auth anónima; favoritos sincronizados en Supabase. La sesión anónima se crea en esta fase (no antes) y se guarda con `@capacitor/preferences`.
4. Filtro «mis conjuntos» en el pizarrón «Hoy» (el parámetro `p_solo_favoritos` de `actuaciones_de_la_noche` ya existe).
5. Registro del token push (APNs y FCM) en `dispositivos_push`.
6. Edge Function programada al mediodía: «hoy actúa X a las 22:50 en Y» a quien lo sigue.
7. Edge Function disparada al cambiar `actuaciones.estado`: aviso de suspensión o cambio.

Listo cuando: seguir un conjunto en TestFlight y recibir la push de prueba en un teléfono real.

Estado al 2026-11-11: el código de los siete puntos está hecho en la rama `conjuntos-push`, con los ajustes de las decisiones 43 a 49 (el paso 5 usa FCM en las dos plataformas; el 6 suma repasos hasta las 19:00; el 7 es un trigger que encola y una función que vacía la cola). Probado en el navegador y en el emulador de Android con la grilla ficticia; las dos Edge Functions corren en local en simulacro. **Todavía no se cumple el «Listo cuando»:** falta el proyecto de Firebase (y confirmar el identificador de la app), una Mac y la cuenta de Apple para TestFlight, y el proyecto remoto de Supabase para programar las funciones. Hasta entonces no salió ningún aviso real.

### Fase 5 · Calendario y Concurso (1 – 7 dic)

1. Calendario de la temporada: desfiles, etapas del concurso y corsos, con vista por mes y por día. Los eventos estimados se marcan como tales.
2. Concurso Oficial: fixture por rueda y etapa, con link a la venta oficial de entradas (la app no vende).
3. Agregar al calendario del teléfono un evento o una etapa.

Listo cuando (agregado el 2026-11-11; el plan no lo traía):

- El calendario muestra todos los eventos de la temporada cargados desde `research/`, con las fechas estimadas marcadas, y tocar un día abre el pizarrón de esa noche.
- Con el fixture ficticio, el Concurso muestra cada rueda con sus noches y sus conjuntos, y desde ahí se llega a las fichas. Sin fixture, avisa que todavía no se publicó.
- Toda la interfaz nueva está en español y en inglés.

Estado al 2026-11-11: hecho en la rama `calendario-concurso`, con los ajustes de las decisiones 55 a 59. El calendario es una sola lista por mes y por día, sin grilla (decisión 55). El fixture usa el modelo que ya había, etapas y actuaciones del Teatro de Verano (decisión 57); el real se carga desde `research/fixture_2027.csv` cuando se publique. Probado en el navegador y en el emulador de Android con el fixture ficticio. El enlace a la venta oficial de entradas es un dato de la base que se carga cuando se anuncia la venta (decisión 60); todavía no hay venta 2027. **Quedó sin hacer:** el paso 3, «agregar al calendario del teléfono», que se postergó (decisión 59). Los resultados y el historial no se construyeron: sólo quedó escrito cómo van a colgar (decisión 58).

### Fase 6 · Modo Llamadas (8 – 13 dic)

1. La app cambia sola de pantalla principal entre `modo_llamadas_desde` y `modo_llamadas_hasta` de la temporada (nunca por tipo de evento).
2. Orden de desfile por noche y ficha de cada comparsa (barrio, cuerda, personajes).
3. **Hora estimada de paso por cuadra:** primera comparsa a las 20:00, cada una larga 10 minutos y 150 metros después de la anterior (reglamento 2026). Recorrido: Carlos Gardel e Isla de Flores, de Zelmar Michelini a Minas (nueve cuadras).
4. Mapa del recorrido con cortes de calle y servicios.
5. Glosario español e inglés: chico, repique, piano, cuerda, mama vieja, gramillero, escobero.
6. Ajuste manual desde el admin: marcar qué comparsa está pasando para corregir la estimación. En v2 lo alimentan los reportes de la gente.

Listo cuando (agregado el 2026-11-11; el plan no lo traía):

- En las fechas de Llamadas la app abre en modo Llamadas; fuera de esas fechas, en Hoy.
- Con el orden ficticio, cada noche muestra el orden de desfile con la hora estimada de cada comparsa, y eligiendo una cuadra se ve a qué hora pasa por ahí.
- El recorrido y los cortes se ven en el mapa, también sin key de MapTiler y sin señal.
- Con la red apagada, todo el modo funciona con lo último que se descargó.
- Toda la interfaz nueva y el glosario están en español y en inglés.

Estado al 2026-11-11: hecho en la rama `llamadas`, con las decisiones 62 a 68. Probado en el navegador y en el emulador de Android con el orden ficticio y la fecha simulada, también con la red del emulador apagada. Cómo quedó cada paso:

- **1 a 3:** hechos. La ficha de cada comparsa es la de conjuntos (Fase 4); la cuerda y los personajes de cada una no están en los datos.
- **4:** el recorrido y los cortes van como **estimados** (OpenStreetMap y la prensa de 2025), marcados así en la app, hasta que la IM publique los de 2027. No hay «servicios» (baños, puestos de salud): no hay de dónde sacarlos todavía.
- **5:** veinte términos.
- **6:** queda el dato (`eventos.desfile_atraso_min`, que corre todas las horas) pero no la pantalla: es del panel, Fase 7.
- **Además:** el aviso del día suma a las comparsas seguidas que desfilan esa noche (decisión 68).
- **Falta, y no es código:** el orden de desfile real de las dos noches, y el recorrido y los cortes oficiales. Sin key de MapTiler en la máquina de desarrollo, el mapa del recorrido sólo se vio sobre fondo liso.

## Fase 7 · Datos y panel admin (1 dic – 10 ene, en paralelo)

La app vale lo que vale su grilla: cada actuación guarda de dónde salió y la app muestra «actualizado hace X».

**Panel admin (web)**

1. Login por email con rol admin en Supabase.
2. Alta y edición de conjuntos, escenarios, eventos, etapas y actuaciones.
3. Importar la grilla de una noche desde CSV o pegando el texto tal como lo publica la prensa (nombre del escenario y debajo líneas «20:00 - CABALLEROS»), con vista previa y detección de conjuntos o escenarios desconocidos (matching por nombre + alias normalizados).
   - Cuando la cartelera agrupa bajo un encabezado genérico como «ESCENARIOS MÓVILES», sin decir cuál de los móviles es, la vista previa le pide al admin que elija el móvil. La parada de esa noche (por ejemplo, «Plaza Bob Marley, Ingavi y Canstatt») va en la actuación, no en el escenario. Caso de prueba: las tres líneas que quedaron afuera de la noche real del 28/02/2026 (decisión 39).
4. Botón «suspender noche» por escenario o global (lluvia), que marca las actuaciones y dispara la push.
5. Control del estado del desfile de Llamadas.

**Carga inicial**

- Seed desde `research/`: conjuntos, escenarios y calendario 2027.
- Fixture de la primera rueda del concurso apenas se publique.
- Orden oficial de Llamadas 2027 cuando lo publique la IM (en 2026 salió dos días antes).

**Rutina diaria en temporada**

- Ideal: DAECPU carga o manda la grilla en CSV.
- Plan B: cargarla a mano desde su web («Seguí a tu conjunto») y las carteleras de prensa, unos 20 minutos por noche.

**Ingesta asistida (v2)**

- Edge Function programada que lee posts recientes de los conjuntos por la Instagram Business Discovery API (nada de scraping).
- Un LLM extrae conjunto, escenario, fecha y hora, y guarda un borrador en `borradores_ingesta`.
- Aprobación o descarte manual desde el admin.

Listo cuando (agregado el 2026-11-12; el plan no lo traía):

- Desde el texto de la cartelera del 28/02/2026, una noche entera queda cargada y publicada en menos de 5 minutos, con los nombres resueltos. Reimportarla no cambia nada.
- Suspender la noche manda un solo aviso por dispositivo y la app la muestra suspendida.
- Se pueden cargar las coordenadas de un escenario desde el mapa, y el escenario aparece en «cerca mío».
- Un usuario que no es admin no puede escribir nada.
- El proyecto remoto tiene las migraciones, el seed, las funciones programadas y la auth anónima, y el panel está publicado.

Estado al 2026-11-12: el código está hecho en la rama `admin`, con las decisiones 69 a 77. Probado de punta a punta en el navegador contra el Supabase local: la cartelera real del 28/02/2026 queda publicada desde el texto pegado en menos de un minuto (82 líneas, con las tres de «ESCENARIOS MÓVILES» resueltas y un nombre corregido), reimportarla no cambia nada, suspender la noche arma un solo aviso por teléfono y la app la muestra suspendida, y deshacerlo la devuelve a como estaba. Cómo quedó cada paso:

- **1 y 2:** hechos. El login es con email y contraseña (decisión 69); los admins se dan de alta con `pnpm admin:alta`.
- **3:** hecho, con texto pegado y CSV. El formato de tabla de DAECPU se armó a partir de las columnas de su web: fuera de temporada no hay una muestra real para confirmarlo.
- **4:** hecho, por noche o por escenario, y se puede deshacer (decisión 72).
- **5:** hecho: orden de desfile, horario y atraso, recorrido y cortes.
- **Además:** registro de cambios (decisión 73), ubicación de los escenarios desde el mapa con buscador de direcciones (decisión 74) y los enlaces de entradas.
- **Panel publicado** (2026-11-12): <https://carnavalero-admin.vercel.app>, compilado contra el proyecto remoto y todavía sin la key de MapTiler.
- **Falta, y depende de cuentas:** armar el proyecto remoto de Supabase, que está creado y vacío (los pasos están en `CLAUDE.md`, «Proyecto remoto»). Las Edge Functions van a quedar en simulacro hasta que esté Firebase.
- **Carga inicial:** el seed ya está; el fixture del Concurso y el orden de las Llamadas, cuando se publiquen, por CSV o por el panel.

## Fase 8 · QA, beta y publicación (14 dic – 20 ene)

La fecha que no se mueve: enviar a revisión de Apple y Google antes del 5 de enero, para tener dos semanas de margen antes del Inaugural.

1. Tests unitarios de la lógica de fechas: noche lógica, zona horaria, «ahora en escena», modo Llamadas por fecha, hora estimada de paso.
2. QA en simulador y en teléfonos reales iOS y Android.
3. Beta cerrada en TestFlight y en Google Play (prueba interna) con 20 a 30 carnavaleros, desde el 14 de diciembre.
4. Fichas de tienda: nombre, descripción en español e inglés, capturas, categoría (Viajes o Entretenimiento), política de privacidad que explique ubicación y push. Mensaje: «Qué hay de carnaval hoy, cerca tuyo y gratis. Y la guía de las Llamadas.»
5. Envío a revisión: antes del 5 de enero.
6. Lanzamiento público en la semana del Inaugural: Instagram de la app, conjuntos que la compartan, DAECPU si hay alianza, hostels y hoteles de Ciudad Vieja y Barrio Sur.

Oportunidad: el 3 de diciembre es el Día Nacional del Candombe. Sirve para mostrar la beta o abrir una lista de espera.

## Fase 9 · Operación en temporada y después (21 ene en adelante)

**En temporada**

- Carga o chequeo diario de la grilla antes de las 18:00.
- Monitoreo de errores con Sentry y de uso con PostHog: aperturas por noche, conjuntos más seguidos, filtros más usados.
- Sacar v2 en partes: resultados del concurso, «¿por dónde va el desfile?» antes de las Llamadas, ingesta desde Instagram.
- Botón «esto está mal» en cada actuación.

**Después (marzo 2027)**

- Retro con métricas: usuarios, retención por semana, noches pico.
- Arrancar v3: el modo barrio con salidas de tambores y el historial de resultados del Concurso.
- Definir cuándo y cómo se suma el carnaval del interior.
- Cuentas verificadas de conjuntos y sponsors para el Carnaval 2028.

## Cómo trabajar con Claude Code

1. Un paso numerado de este plan = una tarea, con plan mode antes de tocar código y un commit al terminar.
2. Arrancá cada sesión con: «Leé CLAUDE.md, docs/PLAN.md y docs/DECISIONES.md. Vamos con la Fase N, paso M».
3. No marques un paso como hecho sin el «Listo cuando» de su fase.
4. Los prompts largos de cada fase van en `prompts/`.

## Riesgos

| Riesgo | Qué pasa | Mitigación |
| --- | --- | --- |
| No conseguir la grilla de DAECPU en formato usable | Pizarrón vacío o atrasado | Carga manual desde su web y la prensa; importador rápido de texto y CSV |
| No llegar al Inaugural | Se pierde la temporada | Recorte de emergencia; envío a revisión el 5 de enero |
| Rechazo o demora en App Store | Lanzamiento tarde | Beta desde el 14 de diciembre; política de privacidad lista |
| Cambios de último momento (lluvia, etapas movidas) | Gente que va y no hay función | Botón «suspender noche» con push; «actualizado hace X» |
| Carnaval App copia alertas y gratuitos | Se achica el diferencial | Datos completos, mapa y hora estimada en Llamadas como foso |
| Fotos y logos de conjuntos | Reclamos | Pedir permiso o usar fotos propias; link al Instagram original |
| Bloqueo de Meta | Se cae la ingesta | Sólo API oficial; la ingesta es v2 |

**Decisiones abiertas**

- [x] Nombre final de la app: Carnavalero (decisión 54).
- [ ] Monetización en la primera temporada: gratis sin anuncios, o un sponsor.
