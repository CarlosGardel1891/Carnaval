# Carnavalero · contexto completo del proyecto

Documento para poner al día a alguien que llega de cero. Estado al **2026-11-11**. Repo: <https://github.com/Emiliano-Vanzini/Carnaval>, rama de trabajo `calendario-concurso` (Fase 5); `develop` tiene hasta la Fase 4 y el renombre a Carnavalero.

Si algo de acá choca con los documentos del repo, mandan ellos, en este orden: `docs/DECISIONES.md`, `docs/PLAN.md`, `CLAUDE.md`.

## 1. Qué es

**Carnavalero** es una app sólo para iPhone y Android, sin versión web para el público, sobre el carnaval en Uruguay. Se lanza con Montevideo y el área metropolitana; el interior se suma después del lanzamiento. Responde una pregunta: **«¿qué hay hoy de carnaval, dónde y a qué hora?»**. Su sello son las **Llamadas**, el desfile de comparsas de candombe, para el que tiene un modo especial.

Lo que va a ofrecer en su primera versión:

- **Pizarrón «Hoy»:** todas las actuaciones de la noche en todos los escenarios, con filtros por cercanía, gratuitos, categoría y «mis conjuntos».
- **Mapa de escenarios** con ficha de cada uno: tipo, precio, dirección y lo que hay esa noche.
- **Fichas de conjuntos** con botón Seguir, sin necesidad de registrarse.
- **Avisos push:** «tu conjunto actúa hoy a tal hora en tal lugar» y aviso de suspensión o cambio.
- **Calendario** de la temporada: desfiles, etapas del Concurso, corsos.
- **Modo Llamadas:** orden de desfile por noche, hora estimada de paso por cuadra, recorrido, cortes de calle y glosario.
- **Español e inglés** desde el primer día.

### Para quién

- **El carnavalero local**, que la usa todas las noches de la temporada.
- **El turista**, que explica el pico de descargas y por eso la app está también en inglés.
- **Los conjuntos**, que son quienes generan y validan la información.

### Fechas que mandan

| Fecha | Qué pasa |
| --- | --- |
| 2026-11-10 al 16 | Prueba de Admisión al Concurso (define 16 cupos) |
| 2026-11-17 | Actualizar `research/conjuntos.csv` con el resultado |
| 2026-12-03 | Día Nacional del Candombe (oportunidad para mostrar la beta) |
| 2026-12-14 | Arranca la beta cerrada |
| 2026-12-15 | Límite para cerrar el acuerdo con DAECPU por la grilla |
| **2027-01-05** | **Envío a revisión de App Store y Google Play. No se mueve.** |
| 2027-01-21 | Desfile Inaugural: la app tiene que estar publicada |
| 2027-02-05 y 06 | Desfile de Llamadas |
| 2027-03-07 | Fin de la temporada |

Desde hoy quedan 55 días hasta el envío a revisión.

## 2. Vocabulario del dominio

Quien no conozca el carnaval uruguayo necesita estos términos para leer el código y el plan.

| Término | Qué es |
| --- | --- |
| **Conjunto** | Cada agrupación que actúa. Categorías: murga, parodistas, humoristas, revista, comparsa (candombe), samba y «otro» |
| **Comparsa** | Conjunto de candombe: tambores, bailarines y personajes típicos. Son las que desfilan en las Llamadas |
| **Cuerda** | El grupo de tambores de una comparsa. Fue el nombre de trabajo de la app, y sigue en los nombres internos del repo (`@cuerda/shared`) |
| **Tablado / escenario** | Lugar donde actúan los conjuntos cada noche. Hay privados (pagos), populares (entrada barata), gratuitos e itinerantes |
| **Teatro de Verano** | Sede del Concurso Oficial |
| **Concurso Oficial** | La competencia entre conjuntos, por ruedas: primera, segunda y liguilla |
| **Prueba de Admisión** | Instancia previa donde los aspirantes pelean los cupos libres del Concurso |
| **Llamadas** | Desfile de comparsas por Barrio Sur y Palermo, dos noches de febrero |
| **Escenarios itinerantes** | Los móviles de la Intendencia (dos «chatas»), Carnaval de a Pie (ocho) y Barrio a Barrio. Cambian de lugar cada noche |
| **Grilla** | La programación diaria: qué conjunto actúa en qué escenario a qué hora. Es el dato más valioso y el más difícil de conseguir |
| **DAECPU** | La asociación de directores de carnaval. Publica la grilla más completa |
| **AUDECA** | Asociación Uruguaya de Candombe. Agrupa a la mayoría de las comparsas |
| **IM** | Intendencia de Montevideo. Organiza los desfiles y publica el calendario oficial |
| **Noche lógica** | Regla propia de la app: una actuación antes de las 06:00 pertenece a la noche anterior |

## 3. Competencia y posicionamiento

Existe una app activa, **Carnaval App** (un desarrollador solo, más de 5.000 descargas en Android), centrada en el Concurso Oficial, las pencas y los comentarios. Tiene programación de tablados y, desde 2024, la programación de las Llamadas.

Carnavalero no compite en lo social (pencas, comentarios), pero sí cubre el Concurso completo como información: el fixture del Teatro de Verano desde el lanzamiento, los resultados durante el carnaval y el historial después (decisión 53). La definición es: **Carnavalero es la app con toda la información del carnaval: qué hay esta noche, el Concurso y las Llamadas. La comunidad queda para Carnaval App.**

Dónde se diferencia:

1. Alerta «tu conjunto actúa hoy», con hora y escenario.
2. Escenarios gratuitos e itinerantes en el mapa.
3. Hora estimada de paso por cuadra en las Llamadas, más recorrido y cortes.
4. Inglés y glosario para el turista.
5. Sin registro y sin anuncios en la primera temporada.
6. Uso todo el año con las salidas de tambores (versión 3).
7. Alcance nacional: el interior se suma después del lanzamiento.

Lo que **no** se hace, por decisión: pencas, reseñas y comentarios, ni una versión web para el público. El historial de resultados, que antes estaba en esta lista, ahora entra (después del carnaval).

El análisis completo está en `docs/competencia-carnaval-app.md`.

## 4. Alcance por versión

| Versión | Qué incluye | Cuándo |
| --- | --- | --- |
| **MVP** | Pizarrón Hoy, mapa y fichas de escenarios, fichas de conjuntos con Seguir, push, calendario, fixture del Concurso en el Teatro de Verano, modo Llamadas, panel admin interno con importación de la grilla, español e inglés. Montevideo y área metropolitana | Antes del 2027-01-21 |
| **v2** | «¿Por dónde va el desfile?» con reportes de la gente, resultados del Concurso de la temporada, ingesta asistida desde Instagram con aprobación manual | Durante el carnaval |
| **v3** | Mapa de salidas de tambores, historial de resultados del Concurso, ubicación en vivo de la comparsa, cuentas verificadas de conjuntos, portugués | Desde marzo de 2027 |
| **A definir** | El carnaval del interior del país | Después del lanzamiento |

**Recorte de emergencia** si no da el tiempo: Hoy + Conjuntos + Modo Llamadas, con el calendario como lista estática.

## 5. Dónde estamos

| Fase | Fechas del plan | Estado |
| --- | --- | --- |
| 0 · Investigación y validación | 23 oct – 2 nov | **Terminada** |
| 1 · Setup técnico | 3 – 5 nov | **Código terminado** (2026-10-23); faltan dos verificaciones manuales |
| 2 · Modelo de datos | 6 – 9 nov | **Terminada** (2026-11-10, un día tarde) |
| 3 · Hoy y escenarios | 10 – 23 nov | **Terminada** (2026-11-10), ya en `develop` |
| 4 · Conjuntos, Seguir y push | 24 – 30 nov | **Código terminado** (2026-11-11), ya en `develop`; falta un aviso real (Firebase, Apple) |
| 5 · Calendario y Concurso | 1 – 7 dic | **Código terminado** (2026-11-11) en `calendario-concurso`; falta el fixture real, que no se publicó |
| 6 · Modo Llamadas | 8 – 13 dic | **Es lo que sigue** |
| 7 · Datos y panel admin | 1 dic – 10 ene (en paralelo) | Sin empezar |
| 8 · QA, beta y publicación | 14 dic – 20 ene | Sin empezar |
| 9 · Operación en temporada | 21 ene – 7 mar | — |

En una frase: **la app ya muestra la noche, los conjuntos, el calendario de la temporada y el Concurso; deja seguir conjuntos sin registrarse y tiene armados los avisos push, que todavía no salieron nunca de verdad.** Lo hace sobre datos de prueba (la grilla ficticia o la cartelera real del 28/02/2026): todavía no hay grilla real, los escenarios reales no tienen coordenadas y falta Firebase para mandar un aviso real.

Lo que falta confirmar de la Fase 1:

- La app corriendo en el simulador de iOS (hace falta una Mac).
- El proyecto remoto de Supabase, en São Paulo, con las migraciones aplicadas.
- El CI en GitHub: ninguna corrida llega a arrancar (`startup_failure`) por un problema de facturación de la cuenta dueña del repo (decisión 40). Mientras tanto mandan los chequeos locales.

Android quedó confirmado el 2026-11-10: con JDK 21 (Temurin) el build de debug compila y la app corrió en el emulador contra el Supabase local (Hoy, ficha, mapa, «Cómo llegar» y el botón «atrás»). «Cerca mío» se probó ahí con la posición fija en el centro de Montevideo (`adb emu geo fix -56.1645 -34.9011`): el diálogo de Android deja elegir entre precisa y aproximada; con la precisa ordena por distancia y muestra «1,3 km» y «2,4 km»; con la aproximada muestra el aviso y «menos de 1 km», y el orden entre esos dos escenarios se invierte, que es justo lo que el aviso advierte.

## 6. Tecnología

| Capa | Con qué |
| --- | --- |
| App | React 19, TypeScript estricto, Vite 8, Tailwind 4, React Router, TanStack Query |
| Empaquetado nativo | Capacitor 8 (Android: SDK mínimo 24; iOS: 15.0), con los plugins App, Geolocation, Preferences, Status Bar y Firebase Messaging |
| Push | Firebase Cloud Messaging en Android e iOS, enviado desde Edge Functions (API HTTP v1) |
| Backend | Supabase: Postgres 17 con PostGIS, auth anónima (ya habilitada), Edge Functions, Realtime |
| Mapas | MapLibre GL con tiles de MapTiler |
| Idiomas | react-i18next, español e inglés |
| Tests | Vitest y Testing Library |
| Repo | Monorepo con pnpm workspaces (pnpm vía corepack), Node 24 |
| CI | GitHub Actions: lint, formato, typecheck, tests, build y validación de los datos semilla; un segundo job levanta Supabase y corre los tests de la base |

La app se llama Carnavalero y su identificador es `uy.carnavalero.app` (decisión 54). Los nombres internos del repo (`@cuerda/shared`, el proyecto local de Supabase) siguen siendo «cuerda», a propósito; el detalle está en `CLAUDE.md`.

## 7. Qué hay en el repo

```
app/               App móvil (Vite + Capacitor). android/ e ios/ son los proyectos nativos
admin/             Panel web de carga de datos (hoy, sólo un login de adorno)
packages/shared/   @cuerda/shared: tipos de la base, fechas y normalización de nombres
packages/db-tests/ Tests de integración de la base contra el Supabase local (pnpm test:db)
supabase/          config.toml, migraciones, seeds/ y local/ (grilla ficticia y noche real de prueba)
scripts/           Generadores del seed y de norm, y el cargador de los datos de prueba
research/          Datos semilla de la Fase 0, informe y validador
docs/              PLAN.md, DECISIONES.md y análisis de competencia
prompts/           Prompts para Claude Code, uno por fase
CLAUDE.md          Stack, comandos y reglas; lo lee Claude Code en cada sesión
LEEME.md           Cómo arrancar
```

### Lo construido, pieza por pieza

**`packages/shared`** — la parte más sólida, con 79 tests.

- `nocheLogica()`: devuelve la fecha de la «noche» en hora de Montevideo, con corte a las 06:00.
- `calendarDateInMontevideo()`: la fecha calendario en Montevideo.
- `modoLlamadasActivo()`: dice si la app debe estar en modo Llamadas según las fechas de la temporada.
- `norm()`: normaliza nombres (minúsculas, sin tildes, espacios simples) para comparar conjuntos y escenarios. Vive en tres lugares (TypeScript, la `norm` de `research/validate.py` y `public.norm` en SQL) y los tres tienen que dar exactamente lo mismo; está comprobado contra un fixture de 420 casos con los nombres, alias y direcciones reales.
- Avisos push, sin la base ni Firebase: los textos en español e inglés (`noticeTexts.ts`), el armado de una notificación por dispositivo (`notices.ts`), el envío (`delivery.ts`) y el cliente de FCM (`fcm.ts`). Las Edge Functions importan estos mismos archivos.
- `database.types.ts`: tipos generados desde la base. No se edita a mano.

**`supabase`**

- Quince migraciones: las 10 tablas del MVP, dos tablas de claves de nombres (`conjunto_nombres` y `escenario_nombres`) que usan el matching y la búsqueda, y las dos de los avisos: la cola de cambios (`cambios_actuacion`) y el registro de avisos (`avisos_enviados`).
- Avisos: un trigger encola cada cambio de hora, lugar o estado de una actuación; `tomar_avisos_del_dia` y `tomar_avisos_de_cambios` deciden quién recibe qué y reclaman cada aviso para que no salga dos veces. Un aviso de cambio que no sale se reintenta hasta que la actuación empieza; si no llega a salir, queda registrado. Sólo las ejecuta la service role.
- Fixture del Concurso: cada etapa dice de dónde salió (`fuente`) y `fixture_del_concurso(año)` lo devuelve entero, por rueda, noche y hora. El de prueba se carga con `pnpm db:fixture`; el real, desde `research/fixture_2027.csv` cuando se publique.
- Dos Edge Functions, `avisos-del-dia` y `avisos-de-cambios`. Sin Firebase configurado corren en simulacro. No están desplegadas en ningún lado.
- Permisos (RLS) en todas las tablas: cualquiera lee; sólo escribe un admin (`es_admin()`, que mira `app_metadata`) o el service role. `favoritos` y `dispositivos_push` son sólo de su dueño.
- Auth anónima habilitada en el entorno local. En el proyecto remoto hay que activarla a mano.
- Funciones de consulta: `actuaciones_de_la_noche`, `escenarios_cercanos`, `proximas_de_conjunto`, `buscar_por_nombre` y `registrar_dispositivo_push`. Las que dependen de la fecha reciben la noche como parámetro; ninguna usa la fecha del servidor.
- `public.norm` en SQL, réplica de la de TypeScript y Python, comprobada contra 420 casos.
- Seeds: `01_temporadas.sql` (temporada 2027: del 2027-01-21 al 2027-03-07, Llamadas el 5 y 6 de febrero) y `02_research.sql`, que se genera desde los CSV con `pnpm gen:seed`.
- Grilla ficticia (`pnpm db:grilla`): tres noches de conjuntos reales en cuatro escenarios inventados, para desarrollar pantallas. Sólo se carga en el Supabase local.
- Noche real (`pnpm db:noche-real`): la cartelera publicada del sábado 28/02/2026, para probar con una noche de tamaño real. Entran 79 de sus 82 líneas, en 17 escenarios; las otras tres están bajo «ESCENARIOS MÓVILES», un encabezado que no dice cuál de los dos móviles es, y quedan afuera a propósito (decisión 39). También es sólo local, y sus escenarios no tienen coordenadas.
- El entorno local usa puertos 553xx para convivir con otros proyectos Supabase.

**`packages/db-tests`**

- 220 tests contra el Supabase local: permisos tabla por tabla con usuarios anónimos, admin y falso admin; funciones; invariantes del esquema; seed contra los CSV; grilla ficticia y noche real; los avisos (quién recibe cada uno, sin repetidos) y el fixture del Concurso (la consulta, el de prueba y la carga del real).

**`app`**

- **Hoy** (`features/today/`): la grilla de la noche, por escenario o por hora, con filtros de gratuitos y categoría, «ahora en escena», las suspendidas y cambiadas marcadas, y «actualizado hace X». La noche sale de `nocheLogica()` o de `?noche=YYYY-MM-DD`; los filtros viven en la URL.
- **Cerca mío** (`features/location/`): pide la ubicación sólo cuando se toca el filtro (precisa o aproximada, elige el usuario) y ordena por distancia. Con la aproximada, las distancias van redondeadas al kilómetro y un aviso lo explica. La posición no se guarda.
- **Mapa** (`features/map/`): los escenarios de la noche que tienen ubicación, con forma y color por tipo, y las paradas de los itinerantes. Sin key de MapTiler muestra los marcadores sobre un fondo liso y lo avisa. MapLibre va en un archivo aparte, que se carga la primera vez que se abre `/mapa`: «Hoy» arranca sin él.
- **Ficha de escenario** (`features/stages/`): tipo, barrio, precio, dirección, «Cómo llegar» (abre la app de mapas del teléfono) y la grilla de la noche; en un itinerante, cada parada.
- **Conjuntos** (`features/groups/`): la lista de los que participan de la temporada, con buscador (por nombre y alias, sin tildes ni mayúsculas), filtro por categoría y marcas de «en concurso», «pendiente de la Prueba» y «en las Llamadas»; y la ficha, con redes y próximas actuaciones. Desde el pizarrón, tocar un conjunto abre su ficha.
- **Seguir** (`features/follow/`): sin registro. El primer «Seguir» crea una sesión anónima que queda guardada en el teléfono; el cambio se ve en el momento y vuelve atrás si falla. El chip «Mis conjuntos» del pizarrón muestra sólo los seguidos. Si la sesión se pierde (reinstalación), la app sigue andando y los seguidos anteriores no se recuperan.
- **Avisos** (`features/push/`): después de seguir un conjunto, una tarjeta pregunta si se quieren avisos; sólo al aceptar aparece el diálogo del sistema. Registra el teléfono con su idioma y, al tocar un aviso, abre la ficha o el pizarrón. Apagado hasta tener Firebase (`VITE_PUSH_ENABLED`).
- **Calendario** (`features/calendar/`): todos los eventos de la temporada, pretemporada incluida, por mes y por día. Marca hoy y abre ahí, deja en segundo plano lo que ya pasó, rotula las fechas estimadas, y tocar un día abre el pizarrón de esa noche. Cada evento tiene su ficha, con fecha, lugar, estado, fuente y, cuando se cargue, dónde se compran las entradas.
- **Concurso** (`features/contest/`): las tres ruedas con sus noches y los conjuntos de cada una, con enlace a sus fichas; la ficha de un conjunto muestra sus noches en el Concurso. Mientras no haya fixture, dice que todavía no se publicó.
- **Caché** (`lib/queryCache.ts`): las consultas se guardan 24 horas en el teléfono; sin red, la app abre con lo último que cargó y lo avisa.
- **Ciclo de vida** (`lib/lifecycle.ts`): la grilla se refresca cada 5 minutos sólo con la app al frente y al volver a ella; el botón «atrás» de Android vuelve o minimiza.
- Todo lo que habla con Supabase está en `lib/api.ts`. En el emulador de Android, el cliente reescribe `127.0.0.1` a `10.0.2.2` para llegar al Supabase local.
- Todo el texto sale de `src/locales/es.json` y `en.json`; un test controla que tengan las mismas claves.
- 264 tests.

**`admin`**

- El panel de carga: una web interna, sólo para el equipo. Hoy es una pantalla de login que sólo muestra un aviso y no se conecta a nada. 1 test.

**Lo que no existe aún:** un aviso push real (falta Firebase), el fixture real del Concurso (no se publicó), los resultados y el historial, el modo Llamadas, el panel de carga, la grilla real y las coordenadas de los escenarios.

## 8. Datos semilla (`research/`)

Son el resultado de la Fase 0 y la fuente de verdad para cargar la base. `python research/validate.py` los valida y pasa sin errores, con cinco advertencias conocidas.

| Archivo | Contenido |
| --- | --- |
| `conjuntos.csv` | 110 conjuntos: 47 comparsas, 35 murgas, 9 parodistas, 8 humoristas, 6 revistas, 1 samba y 4 «otro» |
| `escenarios.csv` | 42 escenarios, 39 activos: 1 Teatro de Verano, 7 privados, 19 populares, 2 móviles, 8 Carnaval de a Pie, 1 Barrio a Barrio y 1 sin tipo |
| `calendario_2027.csv` | 19 eventos: 14 confirmados y 5 estimados |
| `informe_fase0.md` | Investigación: fuentes de la grilla, competencia, Llamadas, API de Instagram, borradores de contacto, recomendación |
| `CAMBIOS.md` | Cómo se normalizaron los CSV y la lista de pendientes de datos |
| `validate.py` | El validador |

Datos firmes: las **46 comparsas** clasificadas a las Llamadas 2027 (23 por noche) y los **23 conjuntos** con cupo directo al Concurso.

Huecos que hay que conocer:

- **Ningún escenario real tiene coordenadas**, sólo dirección en texto, y 5 de los 31 fijos ni siquiera dirección. Hasta que se carguen, los reales aparecen en la lista y en su ficha, pero no en el mapa ni en «cerca mío»; el mapa se desarrolla con los escenarios ficticios.
- **34 conjuntos** tienen pendiente si entran al Concurso; se resuelve el 17/11. Después de esa fecha tienen que quedar 39 en concurso. Los 34 ya tienen su fila 2027 en la base, con `en_concurso` nulo.
- **12 conjuntos** están en el catálogo sin participación 2027: 4 del Concurso 2026 sin evidencia de 2027 y 8 fuera de concurso sin verificar.
- 68 conjuntos sin Instagram y 74 sin barrio.
- 8 conjuntos fuera de concurso sin verificar, y 4 de ellos sin categoría conocida.
- El calendario no trae recorridos y 11 de sus 19 eventos son de pretemporada.

Regla: **no editar `research/` a mano sin correr después `python research/validate.py`.** Si cambia un CSV, también hay que regenerar el seed (`pnpm gen:seed`) y el fixture de `norm` (`python scripts/gen_norm_cases.py`).

## 9. Modelo de datos (Fase 2, hecho)

La tabla central es **`actuaciones`**: cada fila es «tal conjunto, en tal escenario, a tal hora». De ahí salen el pizarrón, el mapa, las fichas y las push.

| Tabla | Para qué |
| --- | --- |
| `temporadas` | Fechas de la temporada y del modo Llamadas |
| `conjuntos` | Nombre, alias, categoría, barrio, redes, foto. Es el catálogo: estar acá no dice nada sobre 2027 |
| `conjunto_temporada` | Si el conjunto está en el Concurso y en las Llamadas ese año. `en_concurso` nulo quiere decir pendiente |
| `escenarios` | Nombre, alias, tipo, dirección, ubicación, precio, si es gratis o itinerante |
| `actuaciones` | Conjunto + escenario + hora, noche lógica (columna generada), estado (programada, cambiada, suspendida) y fuente |
| `etapas_concurso` | Rueda, número y fecha de cada etapa |
| `eventos` | Desfiles, corsos y demás, con recorrido. Cada noche de Llamadas es un evento propio |
| `orden_desfile` | Posición de cada comparsa en un evento |
| `favoritos` | Conjuntos que sigue cada usuario |
| `dispositivos_push` | Token, plataforma e idioma de cada teléfono |
| `conjunto_nombres`, `escenario_nombres` | Claves normalizadas de nombres y alias, para matching y búsqueda |

Funciones que usa la app:

| Función | Qué devuelve |
| --- | --- |
| `actuaciones_de_la_noche(noche, lat, lng, solo_gratis, solo_favoritos)` | La grilla de una noche, con conjunto, escenario, dirección y punto de esa noche, distancia si se le pasa un origen, y si el conjunto es favorito |
| `escenarios_cercanos(lat, lng, radio_m, noche)` | Escenarios con ubicación dentro del radio: los fijos, y los itinerantes por sus actuaciones de esa noche |
| `proximas_de_conjunto(conjunto_id, noche)` | Lo que le queda a un conjunto desde esa noche |
| `buscar_por_nombre(texto)` | Conjuntos y escenarios cuyo nombre o alias normalizado coincide exacto |
| `registrar_dispositivo_push(token, plataforma, idioma)` | Da de alta o reasigna el token al usuario de la sesión |

Permisos: lectura pública (en el MVP, todo lo que está en las tablas públicas está publicado), escritura sólo para el admin, y `favoritos` y `dispositivos_push` sólo para su dueño. Los usuarios anónimos tienen el rol `authenticated`, así que ninguna policy de escritura se apoya sólo en el rol.

Datos cargados por el seed: 110 conjuntos (98 con fila 2027), 42 escenarios sin coordenadas y 19 eventos. No hay grilla real todavía: `actuaciones` sólo tiene datos si se carga la grilla ficticia o la noche real de prueba.

## 10. Reglas y decisiones que hay que respetar

Las 60 decisiones tomadas están en `docs/DECISIONES.md`. Las que más condicionan el trabajo:

- **Zona horaria:** siempre `America/Montevideo`, nunca la del teléfono. Se usan las funciones de `@cuerda/shared`.
- **Noche lógica:** antes de las 06:00 es la noche anterior. Vale para «hoy», para la temporada vigente y para el modo Llamadas.
- **Modo Llamadas:** se activa por las fechas de la temporada, nunca por el tipo de evento.
- **Hora estimada en Llamadas:** primera comparsa a las 20:00; cada una sale 10 minutos y 150 metros después de la anterior. Recorrido de nueve cuadras por Carlos Gardel e Isla de Flores.
- **Matching de nombres:** exacto sobre texto normalizado, contra nombre y alias. Nada de coincidencia aproximada.
- **Escenarios itinerantes:** la ubicación va en cada actuación, no en el escenario.
- **Plataformas:** sólo iPhone y Android. El navegador es una herramienta de desarrollo, no un producto; el panel de carga es una web interna del equipo.
- **Alcance geográfico:** el carnaval de todo Uruguay. Se lanza con Montevideo y área metropolitana, Canelones incluido; el interior, después del lanzamiento.
- **Concurso:** entra completo (fixture, resultados de la temporada e historial). Pencas, reseñas y comentarios siguen afuera.
- **Instagram:** sólo la API oficial desde el backend, nunca scraping, y nunca como fuente de la grilla.
- **Idioma del código:** tablas y columnas en español con snake_case; código en inglés; commits en español.
- **Textos:** nada escrito directo en la interfaz; todo pasa por i18n en los dos idiomas.
- **Seguridad:** RLS en todas las tablas y ninguna key en el repo (`.env` local, `.env.example` al día).
- **Noche como parámetro:** las funciones SQL reciben la noche lógica; la calcula la app con `nocheLogica()`. Nada de `current_date` en la base.
- **Archivos generados:** `database.types.ts` y `supabase/seeds/02_research.sql` se regeneran (`pnpm gen:types`, `pnpm gen:seed`), nunca se editan a mano.
- **Grilla ficticia y noche real de prueba:** sólo en el Supabase local; nunca llegan al proyecto remoto.
- **«Ahora en escena»:** una actuación lo está desde su inicio hasta el inicio de la siguiente no suspendida de ese escenario, con un tope de 75 minutos, y sólo si la noche que se mira es la de hoy.
- **Ubicación del usuario:** sólo cuando la pide «cerca mío», en memoria y nunca guardada. Se piden la precisa y la aproximada y el usuario elige; con la aproximada las distancias se muestran redondeadas. El mapa no la pide.
- **Caché en el teléfono:** 24 horas. Si cambia la forma de lo que devuelve una consulta, hay que subir `CACHE_VERSION`; una consulta que lleve la posición del usuario va con `meta: { persist: false }`.
- **Coordenadas:** no se inventan. Un escenario sin ubicación aparece en la lista y en su ficha, y el mapa dice cuántos faltan.
- **Seguir sin registro:** la sesión anónima se crea con el primer «Seguir», nunca antes, y no se piden datos personales.
- **Avisos:** el permiso se pide después de seguir un conjunto, nunca al abrir. Un aviso por dispositivo, agrupado; el del día sale entre las 12:00 y las 19:00 de Montevideo; ningún aviso sale dos veces; los textos van en los dos idiomas.
- **Calendario y Concurso:** fechas puras, sin horas inventadas; una fecha estimada siempre se ve como estimada; un fixture sin cargar es «todavía no se publicó», no una lista vacía; nada de datos inventados fuera de `supabase/local/`.
- **Forma de trabajo:** un paso numerado del plan es una tarea; se planifica antes de tocar código y se hace un commit al terminar. Un paso no está hecho hasta cumplir el «Listo cuando» de su fase.

## 11. Cómo correrlo

Requisitos: Node 24, `corepack enable`, Docker Desktop, Python 3 con pandas (para `research/`), Android Studio con JDK 21 (Android) y una Mac con Xcode (iOS).

```bash
pnpm install
pnpm supabase start      # levanta Supabase local; imprime la URL y las keys
# copiar app/.env.example a app/.env y completarlo (Supabase + key de MapTiler)
pnpm dev                 # app en http://localhost:5173
pnpm dev:admin           # admin en http://localhost:5174
```

Chequeos que tienen que pasar antes de cada commit:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
python research/validate.py
```

Base de datos:

```bash
pnpm supabase db reset                # recrea la base: migraciones + seeds
pnpm supabase migration new <nombre>  # migración nueva
pnpm gen:types                        # regenera los tipos de @cuerda/shared
pnpm gen:seed                         # regenera el seed desde research/
pnpm db:grilla hoy                    # carga la grilla ficticia desde la noche de hoy
pnpm db:noche-real                    # carga la noche real del 2026-02-28 (verla con /?noche=2026-02-28)
pnpm test:db                          # tests de la base (necesita pnpm supabase start)
```

Nativo: `pnpm --filter app android` (o `android:local` para usar el Supabase local) y, en Mac, `pnpm --filter app ios`. El resto de los comandos y los detalles de Windows están en `CLAUDE.md`.

## 12. Riesgos

| Riesgo | Qué pasa | Qué se hace |
| --- | --- | --- |
| **No conseguir la grilla de DAECPU** | El pizarrón queda vacío o atrasado. Es el riesgo número uno | Carga manual desde su web y la prensa (unos 20 minutos por noche); importador de texto y CSV en el admin |
| No llegar al Inaugural | Se pierde la temporada | Recorte de emergencia; revisión de tiendas el 5 de enero |
| Rechazo o demora en App Store | Lanzamiento tarde | Beta desde el 14 de diciembre; política de privacidad lista |
| Cambios de último momento (lluvia) | Gente que va y no hay función | Botón «suspender noche» con push; «actualizado hace X» |
| Carnaval App copia el diferencial | Se achica la ventaja | Datos completos, mapa y hora estimada en Llamadas |
| Atraso | La Fase 2 cerró el 10/11, un día tarde; el código de la Fase 3 quedó listo ese mismo día, antes de su cierre (23/11) | Evaluar el recorte si alguna fase se corre |
| CI que no arranca | GitHub no inicia las corridas por la facturación de la cuenta dueña del repo; los errores se ven tarde | Chequeos locales completos antes de cada commit, hasta que se resuelva |

## 13. Pendientes que no son código

- **DAECPU:** mandar el mail de alianza para recibir la grilla. Borrador en `research/informe_fase0.md`, sección 8.1.
- **AUDECA:** pedir el orden de desfile y contenido de Llamadas (borrador 8.2).
- **Conjuntos y comparsas:** mensaje directo por Instagram (borrador 8.3).
- **Instagram de la app:** cuenta profesional vinculada a una Página de Facebook.
- **Supabase remoto** (São Paulo), si todavía no está creado.
- **Key de MapTiler:** ponerla en `app/.env` y restringirla por origen en MapTiler Cloud (los orígenes están en `CLAUDE.md`). Con una key real todavía no se probó el mapa.
- **GitHub Actions:** quien administra la cuenta dueña del repo tiene que resolver el pago fallido o subir el límite de gasto (Settings → Billing & plans) para que el CI arranque.
- **Firebase:** crear el proyecto, confirmar el identificador de la app y bajar `google-services.json`; con eso se prueba un aviso real en el emulador (pasos en `CLAUDE.md`, «Avisos push»).
- **iOS:** probar en una Mac, localizar el texto del permiso de ubicación y configurar las push (plist, capability y key de APNs).
- **Fixture del Concurso:** cuando se publique, cargarlo en `research/fixture_2027.csv` (pasos en `CLAUDE.md`).
- **Venta de entradas del Concurso:** cuando se anuncie la de 2027, cargarla en el evento del Concurso (`eventos.entradas_url`; pasos en `CLAUDE.md`). En 2026 fue por Abitab y la boletería del Teatro de Verano, desde tres días antes.
- **Avisos en el proyecto remoto:** desplegar las dos Edge Functions y programarlas con `pg_cron`.
- **17/11:** cargar el resultado de la Prueba de Admisión en `research/conjuntos.csv`, correr `python research/validate.py --post-prueba` y regenerar el seed con `pnpm gen:seed --post-prueba`.
- **Coordenadas de los escenarios** y las cinco direcciones que faltan.
- **Decisión abierta:** monetización en la primera temporada (gratis sin anuncios, o un sponsor).

## 14. Por dónde seguir leyendo

1. `docs/PLAN.md` — el plan completo, con los pasos de cada fase.
2. `docs/DECISIONES.md` — las decisiones, que mandan sobre el plan.
3. `CLAUDE.md` — comandos y reglas del repo.
4. `research/CAMBIOS.md` — estado real de los datos y sus pendientes.
5. `research/informe_fase0.md` — la investigación de fondo.
