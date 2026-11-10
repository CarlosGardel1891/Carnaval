# Cuerda · contexto completo del proyecto

Documento para poner al día a alguien que llega de cero. Estado al **2026-11-10**. Repo: <https://github.com/Emiliano-Vanzini/Carnaval>, rama de trabajo `develop`.

Si algo de acá choca con los documentos del repo, mandan ellos, en este orden: `docs/DECISIONES.md`, `docs/PLAN.md`, `CLAUDE.md`.

## 1. Qué es

**Cuerda** (nombre de trabajo, todavía no definitivo) es una app móvil para iOS y Android sobre el Carnaval de Montevideo. Responde una pregunta: **«¿qué hay hoy de carnaval, dónde y a qué hora?»**. Su sello son las **Llamadas**, el desfile de comparsas de candombe, para el que tiene un modo especial.

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

Desde hoy quedan 56 días hasta el envío a revisión.

## 2. Vocabulario del dominio

Quien no conozca el carnaval uruguayo necesita estos términos para leer el código y el plan.

| Término | Qué es |
| --- | --- |
| **Conjunto** | Cada agrupación que actúa. Categorías: murga, parodistas, humoristas, revista, comparsa (candombe), samba y «otro» |
| **Comparsa** | Conjunto de candombe: tambores, bailarines y personajes típicos. Son las que desfilan en las Llamadas |
| **Cuerda** | El grupo de tambores de una comparsa. De ahí el nombre de la app |
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

Cuerda no compite en ese terreno. La definición es: **Carnaval App es la app del Concurso; Cuerda es la app para salir a ver carnaval esta noche, y la de las Llamadas.**

Dónde se diferencia:

1. Alerta «tu conjunto actúa hoy», con hora y escenario.
2. Escenarios gratuitos e itinerantes en el mapa.
3. Hora estimada de paso por cuadra en las Llamadas, más recorrido y cortes.
4. Inglés y glosario para el turista.
5. Sin registro y sin anuncios en la primera temporada.
6. Uso todo el año con las salidas de tambores (versión 3).

Lo que **no** se hace, por decisión: pencas, reseñas, comentarios e historial de resultados.

El análisis completo está en `docs/competencia-carnaval-app.md`.

## 4. Alcance por versión

| Versión | Qué incluye | Cuándo |
| --- | --- | --- |
| **MVP** | Pizarrón Hoy, mapa y fichas de escenarios, fichas de conjuntos con Seguir, push, calendario, modo Llamadas, panel admin con importación de la grilla, español e inglés | Antes del 2027-01-21 |
| **v2** | «¿Por dónde va el desfile?» con reportes de la gente, resultados del Concurso, ingesta asistida desde Instagram con aprobación manual | Durante el carnaval |
| **v3** | Mapa de salidas de tambores, ubicación en vivo de la comparsa, cuentas verificadas de conjuntos, portugués | Desde marzo de 2027 |

**Recorte de emergencia** si no da el tiempo: Hoy + Conjuntos + Modo Llamadas, con el calendario como lista estática.

## 5. Dónde estamos

| Fase | Fechas del plan | Estado |
| --- | --- | --- |
| 0 · Investigación y validación | 23 oct – 2 nov | **Terminada** |
| 1 · Setup técnico | 3 – 5 nov | **Código terminado** (2026-10-23); faltan dos verificaciones manuales |
| 2 · Modelo de datos | 6 – 9 nov | **Sin empezar. Es lo que sigue y ya va atrasada** |
| 3 · Hoy y escenarios | 10 – 23 nov | Sin empezar |
| 4 · Conjuntos, Seguir y push | 24 – 30 nov | Sin empezar |
| 5 · Calendario y Concurso | 1 – 7 dic | Sin empezar |
| 6 · Modo Llamadas | 8 – 13 dic | Sin empezar |
| 7 · Datos y panel admin | 1 dic – 10 ene (en paralelo) | Sin empezar |
| 8 · QA, beta y publicación | 14 dic – 20 ene | Sin empezar |
| 9 · Operación en temporada | 21 ene – 7 mar | — |

En una frase: **está la base técnica y están los datos semilla, pero la app todavía no hace nada útil.** Hoy muestra un mapa de Montevideo y una tarjeta con las fechas de la temporada, leídas de la única tabla que existe.

Lo que falta confirmar de la Fase 1:

- La app corriendo en el simulador de iOS (hace falta una Mac).
- El proyecto remoto de Supabase, en São Paulo, con las migraciones aplicadas.
- El build de Android en la máquina de desarrollo actual, que tiene JDK 17 y necesita el 21.

## 6. Tecnología

| Capa | Con qué |
| --- | --- |
| App | React 19, TypeScript estricto, Vite 8, Tailwind 4, React Router, TanStack Query |
| Empaquetado nativo | Capacitor 8 (Android: SDK mínimo 24; iOS: 15.0) |
| Backend | Supabase: Postgres 17 con PostGIS y unaccent, auth anónima, Edge Functions, Realtime |
| Mapas | MapLibre GL con tiles de MapTiler |
| Idiomas | react-i18next, español e inglés |
| Tests | Vitest y Testing Library |
| Repo | Monorepo con pnpm workspaces (pnpm vía corepack), Node 24 |
| CI | GitHub Actions: lint, formato, typecheck, tests, build y validación de los datos semilla |

Identificador provisional de la app: `uy.cuerda.app`. Se cambia cuando esté el nombre final; los pasos están en `CLAUDE.md`.

## 7. Qué hay en el repo

```
app/               App móvil (Vite + Capacitor). android/ e ios/ son los proyectos nativos
admin/             Panel web de carga de datos (hoy, sólo un login de adorno)
packages/shared/   @cuerda/shared: tipos de la base, fechas y normalización de nombres
supabase/          config.toml, migraciones y seed local
research/          Datos semilla de la Fase 0, informe y validador
docs/              PLAN.md, DECISIONES.md y análisis de competencia
prompts/           Prompts para Claude Code (hoy, sólo el de la Fase 1)
CLAUDE.md          Stack, comandos y reglas; lo lee Claude Code en cada sesión
LEEME.md           Cómo arrancar
```

### Lo construido, pieza por pieza

**`packages/shared`** — la parte más sólida, con 25 tests.

- `nocheLogica()`: devuelve la fecha de la «noche» en hora de Montevideo, con corte a las 06:00.
- `calendarDateInMontevideo()`: la fecha calendario en Montevideo.
- `modoLlamadasActivo()`: dice si la app debe estar en modo Llamadas según las fechas de la temporada.
- `norm()`: normaliza nombres (minúsculas, sin tildes, espacios simples) para comparar conjuntos y escenarios. Tiene que dar exactamente lo mismo que la función `norm` de `research/validate.py`; está comprobado contra los 358 nombres, alias y direcciones reales.
- `database.types.ts`: tipos generados desde la base. No se edita a mano.

**`supabase`**

- Dos migraciones: extensiones (PostGIS y unaccent) y la tabla `temporadas`.
- `temporadas` tiene `anio`, `fecha_inicio`, `fecha_fin`, `modo_llamadas_desde` y `modo_llamadas_hasta`, con controles de coherencia en la base.
- Permisos: cualquiera puede leer; nadie puede escribir desde la app. Verificado contra la API local.
- El seed carga la temporada 2027: del 2027-01-21 al 2027-03-07, con Llamadas el 5 y 6 de febrero.
- El entorno local usa puertos 553xx para convivir con otros proyectos Supabase.

**`app`**

- Una sola pantalla: encabezado, mapa de Montevideo y una tarjeta con la temporada vigente o próxima.
- Cliente de Supabase que, en el emulador de Android, reescribe `127.0.0.1` a `10.0.2.2` para llegar al Supabase local.
- Todo el texto sale de `src/locales/es.json` y `en.json`; un test controla que tengan las mismas claves.
- 6 tests.

**`admin`**

- Una pantalla de login que sólo muestra un aviso. No se conecta a nada todavía. 1 test.

**Lo que no existe aún:** 9 de las 10 tablas del MVP, las funciones de consulta, las Edge Functions, la auth anónima (está deshabilitada en `supabase/config.toml`), cualquier pantalla real y el panel de carga.

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

- **Ningún escenario tiene coordenadas**, sólo dirección en texto, y 5 de los 31 fijos ni siquiera dirección. Sin eso no hay mapa ni filtro «cerca mío». Es el bloqueo más concreto para la Fase 3.
- **34 conjuntos** tienen pendiente si entran al Concurso; se resuelve el 17/11. Después de esa fecha tienen que quedar 39 en concurso.
- 68 conjuntos sin Instagram y 74 sin barrio.
- 8 conjuntos fuera de concurso sin verificar, y 4 de ellos sin categoría conocida.
- El calendario no trae recorridos y 11 de sus 19 eventos son de pretemporada.
- Las columnas de los CSV no coinciden una a una con las tablas planificadas; el mapeo hay que definirlo al escribir la importación.

Regla: **no editar `research/` a mano sin correr después `python research/validate.py`.**

## 9. Modelo de datos que viene (Fase 2)

La tabla central es **`actuaciones`**: cada fila es «tal conjunto, en tal escenario, a tal hora». De ahí salen el pizarrón, el mapa, las fichas y las push.

| Tabla | Para qué |
| --- | --- |
| `temporadas` | Fechas de la temporada y del modo Llamadas (ya existe) |
| `conjuntos` | Nombre, alias, categoría, barrio, redes, foto |
| `conjunto_temporada` | Si el conjunto está en el Concurso y en las Llamadas ese año |
| `escenarios` | Nombre, alias, tipo, dirección, ubicación, precio, si es gratis o itinerante |
| `actuaciones` | Conjunto + escenario + hora, noche lógica, estado (programada, cambiada, suspendida) y fuente |
| `etapas_concurso` | Rueda, número y fecha de cada etapa |
| `eventos` | Desfiles, corsos y demás, con recorrido |
| `orden_desfile` | Posición de cada comparsa en un evento |
| `favoritos` | Conjuntos que sigue cada usuario |
| `dispositivos_push` | Token, plataforma e idioma de cada teléfono |

Funciones de consulta previstas: `actuaciones_de_la_noche`, `proximas_de_conjunto`, `escenarios_cercanos` y `buscar_por_nombre`.

Permisos: lectura pública de lo publicado, escritura sólo para el rol admin, y `favoritos` y `dispositivos_push` sólo para su dueño.

Dos decisiones a cerrar antes de escribir esta fase:

- Cómo se normalizan los nombres en SQL para que dé lo mismo que `norm` en TypeScript y en Python.
- Habilitar la auth anónima, que hoy está apagada.

## 10. Reglas y decisiones que hay que respetar

Las 21 decisiones tomadas están en `docs/DECISIONES.md`. Las que más condicionan el trabajo:

- **Zona horaria:** siempre `America/Montevideo`, nunca la del teléfono. Se usan las funciones de `@cuerda/shared`.
- **Noche lógica:** antes de las 06:00 es la noche anterior. Vale para «hoy», para la temporada vigente y para el modo Llamadas.
- **Modo Llamadas:** se activa por las fechas de la temporada, nunca por el tipo de evento.
- **Hora estimada en Llamadas:** primera comparsa a las 20:00; cada una sale 10 minutos y 150 metros después de la anterior. Recorrido de nueve cuadras por Carlos Gardel e Isla de Flores.
- **Matching de nombres:** exacto sobre texto normalizado, contra nombre y alias. Nada de coincidencia aproximada.
- **Escenarios itinerantes:** la ubicación va en cada actuación, no en el escenario.
- **Alcance geográfico:** Montevideo y área metropolitana, Canelones incluido.
- **Instagram:** sólo la API oficial desde el backend, nunca scraping, y nunca como fuente de la grilla.
- **Idioma del código:** tablas y columnas en español con snake_case; código en inglés; commits en español.
- **Textos:** nada escrito directo en la interfaz; todo pasa por i18n en los dos idiomas.
- **Seguridad:** RLS en todas las tablas y ninguna key en el repo (`.env` local, `.env.example` al día).
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
pnpm supabase db reset                # recrea la base: migraciones + seed
pnpm supabase migration new <nombre>  # migración nueva
pnpm gen:types                        # regenera los tipos de @cuerda/shared
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
| Atraso actual | La Fase 2 debía terminar el 9/11 y no empezó | Arrancarla ya; evaluar el recorte si se sigue corriendo |

## 13. Pendientes que no son código

- **DAECPU:** mandar el mail de alianza para recibir la grilla. Borrador en `research/informe_fase0.md`, sección 8.1.
- **AUDECA:** pedir el orden de desfile y contenido de Llamadas (borrador 8.2).
- **Conjuntos y comparsas:** mensaje directo por Instagram (borrador 8.3).
- **Instagram de la app:** cuenta profesional vinculada a una Página de Facebook.
- **Supabase remoto** (São Paulo) y **key de MapTiler**, si todavía no están creados.
- **17/11:** cargar el resultado de la Prueba de Admisión en `research/conjuntos.csv` y correr `python research/validate.py --post-prueba`.
- **Coordenadas de los escenarios** y las cinco direcciones que faltan.
- **Decisiones abiertas:** nombre final de la app y monetización en la primera temporada (gratis sin anuncios, o un sponsor).

## 14. Por dónde seguir leyendo

1. `docs/PLAN.md` — el plan completo, con los pasos de cada fase.
2. `docs/DECISIONES.md` — las decisiones, que mandan sobre el plan.
3. `CLAUDE.md` — comandos y reglas del repo.
4. `research/CAMBIOS.md` — estado real de los datos y sus pendientes.
5. `research/informe_fase0.md` — la investigación de fondo.
