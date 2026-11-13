# Carnavalero

App para iPhone y Android con la información del carnaval en Uruguay, con foco en las Llamadas y el candombe: qué conjunto actúa hoy, en qué escenario y a qué hora, más un modo especial para el Desfile de Llamadas. Objetivo: publicada antes del Desfile Inaugural del 2027-01-21; envío a revisión de tiendas antes del 2027-01-05.

## Leé primero

- `docs/PLAN.md` — el plan por fases (qué hacer y cuándo).
- `docs/OPERACION.md` — el manual para quien carga los datos en temporada, y qué hacer si algo falla.
- `docs/IOS.md` — de la Mac al iPhone (probar la beta) y a TestFlight.
- `docs/QA.md` — el plan de pruebas, la lista de verificación antes de cada envío y cómo quedó cada pasada.
- `docs/DECISIONES.md` — decisiones tomadas; mandan sobre el plan.
- `research/CAMBIOS.md` — estado de los datos semilla y pendientes.
- `prompts/` — el prompt de cada fase, tal como se usó.

## Stack

React 19 + TypeScript (strict) + Vite + Capacitor 8 + Tailwind 4, Supabase (Postgres + PostGIS, Auth anónima, Edge Functions, Realtime), MapLibre GL + MapTiler, react-i18next (es, en), React Router, TanStack Query, Vitest. Monorepo con pnpm workspaces.

## Estructura

- `app/` — app móvil (Vite + Capacitor). `app/android/` y `app/ios/` son los proyectos nativos generados por Capacitor.
- `admin/` — panel web interno de carga de datos (ver «Panel admin»).
- `sitio/` — el sitio público (decisión 83): la política de privacidad, la página de borrar mis datos y el soporte, en español y en inglés. No es una versión web de la app. Los textos están en `sitio/content.mjs` (las dos versiones de cada página con las mismas secciones; hay un test) y el mail de contacto y la dirección, en `sitio/site.config.json`. Está publicado en <https://carnavalero.vercel.app> (proyecto `carnavalero` de Vercel, mismo equipo que el panel). `pnpm --filter sitio build` deja las páginas en `sitio/dist/`; para publicarlas, desde `sitio/dist`: `npx vercel link --yes --project carnavalero --scope carlosgardel1891s-projects` y `npx vercel deploy --prod --yes --scope carlosgardel1891s-projects`. Si cambia qué datos maneja la app, cambian juntos la política, «Acerca de» (`app/src/locales`) y las declaraciones de las tiendas.
- `supabase/` — `config.toml`, `migrations/`, `seeds/` (`01_temporadas.sql` y `02_research.sql`, generado: no editar a mano), `local/` (grilla ficticia, fixture ficticio del Concurso, orden ficticio de las Llamadas y noche real del 28/02/2026; sólo para el Supabase local) `functions/` (las Edge Functions de avisos: `avisos-del-dia`, `avisos-de-cambios` y lo común en `_shared/`) y `remoto/` (`programar_avisos.sql`, que se corre a mano en el proyecto remoto).
- `packages/shared/` (`@cuerda/shared`) — tipos de la base (`database.types.ts`, generado), fechas (`nocheLogica`, `modoLlamadasActivo`, `calendarDateInMontevideo`), `norm` para matching de nombres, la hora estimada del Desfile de Llamadas (`llamadas.ts`) y los avisos push sin la base ni Firebase: textos (`noticeTexts.ts`), agrupado (`notices.ts`), envío (`delivery.ts`) y FCM (`fcm.ts`).
- `packages/db-tests/` (`@cuerda/db-tests`) — tests de integración de la base (RLS, funciones, invariantes del esquema) contra el Supabase local. Corren con `pnpm test:db`, aparte de `pnpm test`.
- `scripts/` — generadores: `gen_seed.py` (el seed, desde los CSV de `research/`), `gen-norm-marks.mjs` (migración de `public.norm`) y `gen_norm_cases.py` (fixture de casos de `norm`); `db-grilla.mjs`, que carga la grilla ficticia y la noche real de prueba; `admin-user.mjs` (admins del panel) y `remoto-chequeo.mjs` (chequeo del proyecto remoto). `norm` vive en tres lugares (TypeScript, Python y SQL) y tienen que dar lo mismo (decisión 22).
- `research/` — datos semilla de la Fase 0, más `fixture_2027.csv` (el fixture del Concurso, vacío hasta que se publique) y los tres `llamadas_…_2027.csv` (recorrido y cortes estimados, y el orden de desfile, vacío hasta que se publique). **No editar a mano sin correr `python research/validate.py` después.** Si cambia un CSV, regenerar también el seed (`pnpm gen:seed`) y el fixture de `norm` (`python scripts/gen_norm_cases.py`); el CI falla si quedaron viejos.
- `tiendas/` — lo que se carga en Play Console y App Store Connect: `fichas.json` (los textos en español y en inglés; `sitio/fichas.test.mjs` controla sus largos), `DECLARACIONES.md` (las respuestas de los formularios de datos, edad y cifrado, las notas para la revisión y las fuentes oficiales) y `graficos/` (el ícono de 512 y el gráfico destacado de Google Play, generados con `pnpm gen:tiendas`).
- `docs/`, `prompts/` — plan, decisiones y prompts.

## Comandos

Requisitos: Node 24 (`.nvmrc`), `corepack enable` (pnpm fijado en `package.json`), Docker Desktop, Python 3 + pandas (para `research/`), Android Studio + **JDK 21** (Android) y una Mac con Xcode (iOS).

Android en Windows: `JAVA_HOME` tiene que apuntar a un JDK 21 (`C:\Program Files\Microsoft\jdk-21…` o, si es Temurin, `C:\Program Files\Eclipse Adoptium\jdk-21…`), no al JBR de Android Studio (Java 25, que Gradle 8.14 no soporta). `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`. Los emuladores creados en la máquina se listan con `emulator -list-avds`.

Los comandos de Android (`pnpm --filter app android…`) se corren desde una terminal de PowerShell con esas dos variables definidas; si `ANDROID_HOME` no está en el sistema, `$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"` antes del comando. Probado el 2026-11-10 con `android:local`. Dos cosas a saber:

- Con más de un destino (un emulador abierto cuenta, y cada AVD creado también), `cap run` pregunta cuál usar. Para que no pregunte: `pnpm --filter app android:local --target emulator-5554` (el id sale de `adb devices`).
- Dentro de una sesión de Claude Code fallan con «"gradlew" no se reconoce como un comando interno o externo», en PowerShell y en Git Bash por igual: la sesión define `NoDefaultCurrentDirectoryInExePath=1` y `cmd` deja de buscar `gradlew.bat` en la carpeta actual. No es un problema del script. Ahí hay que sacar la variable para ese comando: `Remove-Item Env:NoDefaultCurrentDirectoryInExePath` (PowerShell) o `unset NoDefaultCurrentDirectoryInExePath` (Git Bash).

Para probar «cerca mío» en el emulador, fijarle una posición (longitud y latitud, en ese orden): `adb emu geo fix -56.1645 -34.9011` es el centro de Montevideo.

```bash
pnpm install                 # dependencias de todo el monorepo
pnpm dev                     # app en http://localhost:5173
pnpm dev:admin               # admin en http://localhost:5174
pnpm lint                    # ESLint en todo el repo
pnpm format                  # Prettier (format:check para CI)
pnpm typecheck               # tsc en cada paquete
pnpm test                    # Vitest en cada paquete
pnpm test:db                 # tests de la base; necesita `pnpm supabase start`
pnpm build                   # build de app y admin
python research/validate.py  # valida los CSV semilla
```

Supabase local (Docker; puertos 553xx para no chocar con otros proyectos):

```bash
pnpm supabase start          # levanta todo; imprime URL y keys locales
pnpm supabase status         # vuelve a mostrar URL y keys
pnpm supabase db reset       # recrea la base: migraciones + seeds
pnpm supabase migration new <nombre>
pnpm gen:types               # regenera packages/shared/src/database.types.ts
pnpm gen:seed                # regenera supabase/seeds/02_research.sql desde research/
pnpm db:grilla               # carga la grilla ficticia (tres noches desde el 2027-01-28)
pnpm db:grilla hoy           # ídem, desde la noche de hoy (o desde una fecha: YYYY-MM-DD)
pnpm db:grilla --quitar      # la borra
pnpm db:noche-real           # carga la noche real del 2026-02-28 (admite hoy, una fecha y --quitar)
pnpm db:fixture              # carga el fixture ficticio del Concurso desde el 2027-01-25 (admite hoy, una fecha y --quitar)
pnpm db:llamadas             # carga el orden de desfile ficticio de las dos noches de Llamadas (admite --quitar)
pnpm supabase functions serve  # sirve las Edge Functions en http://127.0.0.1:55321/functions/v1/
pnpm admin:alta <email>      # crea un admin del panel y muestra su contraseña (ver «Panel admin»)
pnpm admin:baja <email>      # le quita el permiso (con --borrar, borra el usuario)
pnpm admin:lista             # quiénes son admin
pnpm escenarios:proponer     # propone ubicaciones geocodificando direcciones (admite --seco y --remoto)
pnpm gen:demo                # regenera los datos de ejemplo del modo demostración (app/src/demo/data)
pnpm remoto:respaldo         # copia del esquema y los datos del remoto en ~/.carnavalero/respaldos/
pnpm supabase stop
```

Studio local: http://127.0.0.1:55323. API: http://127.0.0.1:55321.

Seed (decisión 26): `pnpm gen:seed` corre antes `research/validate.py` y no escribe nada si hay errores; con `--post-prueba` le pasa esa opción (para después del 17/11), y con `--check` sólo avisa si el seed quedó viejo. El seed se puede volver a correr sobre una base con datos. Los alias de conjuntos y escenarios se unen con los que ya haya en la base (decisión 75): uno agregado desde el panel no se pierde, y uno que se saca del CSV no se borra solo.

Grilla ficticia (decisión 27): conjuntos reales en escenarios inventados (`ficticio-…`), con `fuente = 'ficticia'`. Sirve para desarrollar pantallas mientras no haya grilla real. `pnpm db:grilla` entra por `docker exec` a la base local; no hay forma de apuntarlo al proyecto remoto, y `pnpm supabase db reset` la borra.

Fixture del Concurso (decisión 57): una noche del Concurso es una fila de `etapas_concurso` y sus conjuntos son las `actuaciones` del Teatro de Verano con ese `etapa_id`; la app lo lee con `fixture_del_concurso(año)`.

- **De prueba:** `pnpm db:fixture` carga las tres ruedas con conjuntos reales y noches inventadas, todo con `fuente = 'fixture-ficticio'`. Tiene las mismas barreras que la grilla ficticia, la app avisa que es de prueba, y `pnpm test:db` lo quita.
- **El real, cuando se publique:** completar `research/fixture_2027.csv` con una fila por conjunto y noche (`rueda`: primera, segunda o liguilla; `numero` de etapa; `fecha` de la noche; `hora` de Montevideo en HH:MM; `conjunto`: el slug de `conjuntos.csv`; `fuente_url`). Una hora anterior a las 06:00 es de la madrugada siguiente y sigue siendo de esa noche: una actuación a las 00:15 de la etapa del 25/01 lleva `fecha` 2027-01-25. Después `python research/validate.py` y `pnpm gen:seed`, y aplicar el seed (`pnpm supabase db reset` en local; en remoto, como el resto del seed). Antes, quitar el de prueba con `pnpm db:fixture --quitar`. Para probar un borrador sin tocar el repo: `python research/validate.py --fixture <archivo>`.
- El seed inserta o actualiza y no borra: si un conjunto sale de una noche, hay que borrar esa actuación a mano. Cambiar una hora en el CSV y volver a aplicar el seed manda el aviso de cambio a quienes siguen al conjunto.
- **O desde el panel** (decisión 75): en `/concurso` se cargan las etapas y los conjuntos de cada una; una cartelera del Teatro de Verano importada en una noche con etapa queda en esa etapa.

Modo Llamadas (decisiones 62 a 68): todo lo del desfile es dato de la base, por evento (cada noche es un evento de tipo `llamadas`), y la app lo lee con `orden_del_desfile`, `recorrido_del_desfile` y `cortes_del_desfile`. Nada de eso necesita otra versión de la app. Todo se puede cargar también desde el panel, en `/llamadas` (el orden, el horario y el atraso, el recorrido y los cortes): lo de abajo es el camino por CSV y por SQL.

- **Orden de prueba:** `pnpm db:llamadas` carga las 46 comparsas clasificadas en un orden inventado, con `fuente = 'orden-ficticio'`. Mismas barreras que la grilla ficticia, la app avisa que es de prueba, y `pnpm test:db` lo quita.
- **El orden real, cuando se publique:** completar `research/llamadas_orden_2027.csv` (`noche`: 1 o 2; `posicion`; `conjunto`: el slug; `fuente_url`), después `python research/validate.py` y `pnpm gen:seed`, y aplicar el seed. Antes, `pnpm db:llamadas --quitar`. Para probar un borrador: `python research/validate.py --orden <archivo>`. El seed inserta o actualiza y no borra: si una comparsa sale del orden, hay que borrar su fila de `orden_desfile` a mano.
- **Recorrido y cortes:** hoy son los **estimados** de `research/llamadas_recorrido_2027.csv` y `research/llamadas_cortes_2027.csv`, y la app lo dice. Cuando la IM publique los oficiales: corregir los dos CSV, regenerar el seed y aplicarlo, y marcar el recorrido como confirmado en cada noche (el seed no toca un recorrido ya confirmado, así que desde ahí manda la base):

```sql
update public.eventos
   set recorrido_estado = 'confirmado',
       recorrido_fuente_url = array['https://…']   -- dónde lo publicó la IM
 where tipo = 'llamadas' and fecha_inicio >= '2027-02-05';
```

- **Horario y atraso, a último momento:** `eventos.desfile_inicio` (hora de Montevideo), `desfile_intervalo_min` y `desfile_separacion_m` cambian la regla de esa noche; vacíos, valen las 20:00, 10 minutos y 150 metros. `desfile_atraso_min` corre todas las horas estimadas (por ejemplo, si el desfile arrancó 40 minutos tarde):

```sql
update public.eventos set desfile_atraso_min = 40 where slug = 'llamadas-noche-1-2027';
```

Venta de entradas (decisión 60): es un dato de cada evento, `eventos.entradas_url` y `eventos.entradas_texto`, y no sale del seed. Se carga cuando se anuncia la venta, desde el panel (`/eventos`) o desde el SQL editor del proyecto (o Studio en local). La del Concurso va en su evento de tipo `concurso` (`concurso-inicio-2027`):

```sql
update public.eventos
   set entradas_url = 'https://…',                          -- la dirección de la venta oficial
       entradas_texto = 'Dónde y desde cuándo se venden.'   -- opcional
 where slug = 'concurso-inicio-2027';
```

Mientras las dos columnas estén vacías, la app no muestra nada de entradas. La dirección tiene que empezar con `http://` o `https://`. No cargar la venta de un año anterior como si fuera la de éste.

Noche real (decisión 39): la cartelera publicada del sábado 28/02/2026, para probar con una noche de tamaño real (`/?noche=2026-02-28`). Va con `fuente = 'cartelera-2026-02-28'`, sólo en el Supabase local. Cada línea se resuelve por `norm` contra los nombres y alias del seed; lo que no coincide no se carga y `pnpm db:noche-real` lo lista. Los escenarios reales no tienen coordenadas: no aparecen en el mapa ni en «cerca mío».

Supabase remoto (São Paulo): `pnpm supabase login`, `pnpm supabase link --project-ref <ref>`, `pnpm supabase db push`. El seed no se aplica solo en remoto: correr `supabase/seeds/01_temporadas.sql` y después `supabase/seeds/02_research.sql` con el SQL editor o con `psql` (o `pnpm supabase db push --include-seed`, que corre los seeds de `config.toml`). `supabase/local/` nunca se corre en remoto. El paso a paso completo está en «Proyecto remoto».

Al crear el proyecto remoto hay que activar a mano los inicios de sesión anónimos (Authentication → Sign In / Providers → Allow anonymous sign-ins): `config.toml` sólo vale para el Supabase local. Antes del lanzamiento, revisar también los límites de auth por IP (decisión 23).

Nativo (desde `app/`, o con `pnpm --filter app <script>`):

```bash
pnpm --filter app android        # build + sync + correr en emulador/dispositivo
pnpm --filter app android:local  # igual, pero permitiendo http al Supabase local
pnpm --filter app android:open   # abrir en Android Studio
pnpm --filter app ios            # (en Mac) build + sync + correr en simulador
pnpm --filter app ios:beta       # (en Mac) build de la beta + sync, para probar en el iPhone (docs/IOS.md)
pnpm --filter app ios:open       # (en Mac) abrir en Xcode
```

Después de agregar o actualizar un plugin de Capacitor: `pnpm --filter app cap:sync` y commitear lo que cambie en `app/android/` y `app/ios/`. `app/ios/App/App.xcodeproj/project.pbxproj` no se edita a mano: se cambia desde Xcode.

En el emulador Android, la app reescribe `127.0.0.1`/`localhost` a `10.0.2.2` para llegar al Supabase local (`app/src/lib/supabase.ts`).

## App

- Pantallas en `app/src/features/`: `today/` (pizarrón «Hoy»), `map/` (mapa de la noche), `stages/` (ficha de escenario), `groups/` (lista y ficha de conjuntos), `follow/` (Seguir y la sesión), `push/` (avisos), `calendar/` (calendario de la temporada y ficha de evento), `contest/` (el Concurso Oficial), `llamadas/` (el modo Llamadas: orden, por cuadra, recorrido y glosario), `location/` («cerca mío») y `season/`. Todo lo que habla con Supabase está en `app/src/lib/api.ts`; todo lo que habla con el plugin de push, en `app/src/lib/push.ts`.
- `search/` es Buscar (`/buscar`, se abre desde el buscador de Hoy): conjuntos y escenarios por nombre o alias, con `norm` y sin tolerancia a errores, igual que la lista de conjuntos (`searchAll`). Lo escrito va en `?q=`.
- En el modo Llamadas, la noche (`?noche=`) y la cuadra elegida (`?cuadra=`) viajan entre las vistas (`useLlamadasSearch`): con una cuadra elegida, «Tu cuadra» la muestra y el orden dice a qué hora pasa cada comparsa.
- `about/` es «Acerca de» (`/acerca`, se llega desde el ícono de arriba a la derecha en Hoy): la política de privacidad (`lib/site.ts` tiene la dirección del sitio público), **borrar mis datos**, los créditos y la versión. Borrar mis datos (`useDeleteMyData`, decisión 84) llama a `borrar_mis_datos()`, cierra la sesión, da de baja el token de avisos y limpia lo guardado en el teléfono; si la base falla no toca nada, para poder reintentar. Algo nuevo que la app guarde del usuario, en la base o en el teléfono, tiene que borrarse ahí.
- Los tests de pantallas usan `vi.mock('…/lib/api')`, que toma el doble de `app/src/lib/__mocks__/api.ts`. Al agregar una función a `api.ts` hay que sumarla ahí.
- La sesión es anónima y se crea recién con el primer «Seguir» (decisión 44). Se guarda con `@capacitor/preferences` (`lib/preferencesStorage.ts`). La app tiene que andar igual sin sesión: `fetchFollowed` devuelve vacío y «mis conjuntos» muestra su estado vacío.
- «Mis conjuntos» es `?mios=1` y lo filtra la base (`p_solo_favoritos`). Esa consulta no se guarda en el teléfono y se vuelve a pedir cuando cambian los seguidos.
- La noche que se muestra sale de `nocheLogica()` o de `?noche=YYYY-MM-DD`; los filtros viven en la URL.
- Las fechas de los eventos y de las etapas son fechas puras (`YYYY-MM-DD`): se comparan como texto y se formatean en UTC (`formatIsoDate`, `formatNight`, `formatMonth`, `formatDayParts` en `lib/format.ts`). «Hoy» es siempre `nocheLogica()`. Una fecha con `estado = 'estimado'` nunca se muestra sin su marca (decisión 56).
- El Concurso está en `/calendario/concurso`, antes que `/calendario/:slug` en `routes.tsx`. Un fixture sin etapas no es una lista vacía: es «todavía no se publicó». Muestra una rueda por vez (`?rueda=`); sin elegir, la que está en curso o la que viene (`currentRound`).
- Para compilar la app contra el proyecto remoto: `app/.env.remoto` (ver «Proyecto remoto»).
- `/mapa` se carga aparte (`features/map/LazyMapPage.tsx`), así «Hoy» arranca sin MapLibre. Fuera de `features/map/`, nadie importa `MapPage` ni `MontevideoMap`.
- Las consultas se guardan en el teléfono 24 horas (`app/src/lib/queryCache.ts`, decisión 37). Si cambia la forma de lo que devuelve una consulta, subir `CACHE_VERSION`. La posición del usuario no va en ninguna consulta (decisión 90).
- Lo del modo Llamadas se guarda una semana (decisión 65): son las consultas cuya clave empieza con `llamadas` (`features/llamadas/useLlamadas.ts`), y `usePrefetchLlamadas` las baja al abrir la app en temporada. Una consulta nueva del modo tiene que llevar esa clave y sumarse ahí.
- Con el modo Llamadas activo, la app abre en `/llamadas` (`useOpenInLlamadas`, sólo en el arranque en `/`). Toda hora del desfile sale de `@cuerda/shared` (`departureTime`, `passTime`) y se muestra con `EstimatedTime`, que le pone el «≈»: nunca una hora estimada sola (decisión 63).
- El glosario son textos de la app (`llamadas.glossary` en los locales); la lista y el orden de los términos están en `features/llamadas/glossary.ts`.
- El mapa del recorrido es `features/map/ParadeMap.tsx`, que se carga aparte (`LazyParadeMap`). Sin key, o si el estilo no carga, dibuja sobre el fondo liso (`mapStyle.ts`).
- El idioma es el del teléfono (decisión 94): no se guarda ni se elige en la app. `followPhoneLanguage` (`app/src/i18n.ts`) lo vuelve a mirar cuando el sistema avisa que cambió y cada vez que la app vuelve al frente (`lib/lifecycle.ts`).
- «Ahora» es siempre `useNow()` o `now()` de `lib/clock.ts`, nunca `new Date()`: así vale el reloj simulado.
- **La ubicación no sale del teléfono** (decisión 90): `useNightActs` recibe la posición y calcula ahí las distancias (`withDistances`, `lib/distance.ts`); ni `fetchNightActs` ni ninguna otra función de `api.ts` la reciben. No sumar parámetros de posición a una función de la base.
- Toda distancia que se muestra pasa por `useDistanceLabel` (`features/location/`): con una ubicación aproximada va redondeada al kilómetro (decisión 42).
- «App al frente», refresco al volver y botón «atrás» de Android: `app/src/lib/lifecycle.ts` (decisiones 32 y 33).
- El color de fondo (`#f4f6fb`) está en tres lugares que tienen que coincidir: `--color-ground` (`app/src/index.css`), `GROUND` (`app/capacitor.config.ts`) y `ground` (`app/android/app/src/main/res/values/colors.xml`, lo que se ve detrás de las barras del sistema; decisión 41).

### Diseño

Decisiones 92 y 93: un único diseño, claro, que se ve igual con el teléfono en modo claro o en modo oscuro. La guía es `docs/diseno/referencia.png`; las capturas de antes y de después están en `docs/diseno/` (`despues/en`, `despues/chico` y `despues/oscuro`: en inglés, en un teléfono de 360 × 640 y con el teléfono en modo oscuro).

- **El sistema está en `app/src/index.css`:** los colores (`ground`, `surface`, `ink`, `soft`, `brand`, `sun`, `amber`, `danger`, `ok` y sus versiones suaves), la tipografía (Plus Jakarta Sans, dentro de la app, sólo el subconjunto latino), las sombras y el degradé de los encabezados (`.brand-gradient`). Todo lo que se toca va en `brand`. No usar colores sueltos en las pantallas: si falta uno, se suma ahí.
- **Las piezas, en `app/src/components/ui/`:** `primitives.tsx` (tarjeta, encabezado de sección, segmentado, chip de filtro, píldoras, avatar, cuadradito de fecha, botones, fila, estado vacío), `TabHeader.tsx` (el encabezado con degradé de cada pestaña), `icons.tsx` (un solo juego de íconos), `illustrations.tsx` (las de los estados vacíos) y `scroll.tsx` (el título que se achica y tirar para actualizar). `/muestra` las tiene todas juntas; sólo existe en desarrollo y se llega desde «Acerca de».
- **Un color por categoría** (`lib/category.ts` y los `--cat-…` de `index.css`): cuatro tonos de cada una, escritos a mano. `category.test.ts` controla que cada categoría de la base tenga los suyos y que la píldora tenga contraste AA. El color nunca va solo: siempre con el nombre de la categoría. Los `--cat-…` no van en `@theme`: Tailwind sólo emite las variables que usa alguna clase.
- **Siempre claro:** `color-scheme: only light` en la web, `UIUserInterfaceStyle = Light` en `Info.plist`, tema `Theme.AppCompat.Light.NoActionBar` con `forceDarkAllowed = false` en `styles.xml` y el oscurecimiento del WebView apagado en `MainActivity`.
- **Barras del sistema:** cada pantalla dice qué tiene arriba con `useSystemBars` (`lib/systemBars.ts`): íconos blancos sobre el degradé y oscuros sobre fondo claro. `TabHeader` ya lo hace. Los márgenes seguros salen de `--safe-top` y `--safe-bottom`, nunca de `env()` directo: en Android los inyecta Capacitor. En un WebView viejo la app no se dibuja debajo de la barra de estado, y ahí los íconos quedan oscuros sobre el fondo claro.
- **La barra de pestañas flota** sobre el contenido: el contenedor que scrollea deja libre `--tabbar-space` abajo. Una pantalla con algo fijo abajo tiene que contar ese espacio.
- **El scroll es uno solo** (`AppLayout`): al entrar a una pantalla arranca arriba y al volver atrás queda donde estaba (`useScrollPerScreen`); cambiar un filtro no lo mueve. Un mapa dentro de una pantalla que scrollea lleva `cooperativeGestures` (`ParadeMap`); el de `/mapa` es de pantalla completa (`fixed inset-0`) y sus controles se corren con `--map-bottom`.
- **Volver y compartir:** `components/ui/BackButton.tsx` (vuelve, o va a un destino si la app abrió directo ahí) y `lib/share.ts`. La vibración al tocar Seguir sale de `lib/haptics.ts`. Los dos plugins (`@capacitor/share`, `@capacitor/haptics`) sólo se cargan en el teléfono.
- **Lo que hay que mirar al tocar una pantalla:** que entre en un teléfono de 360 px de ancho (la barra de pestañas, los chips de Llamadas) y en inglés, donde las horas llevan «PM» (el cuadradito de fecha se ensancha solo). En el emulador: `adb shell wm size 720x1280` y `adb shell wm density 320` (y `reset` para volver), y `adb shell cmd uimode night yes` para el modo oscuro.
- Los tests buscan por rol y por texto, no por clases: al rediseñar una pantalla, conservar los roles, los nombres accesibles y los textos. Una fila entera que se toca lleva el enlace en el nombre, con `after:absolute after:inset-0`.

### Simular la fecha

Para probar lo que depende del día (el modo Llamadas, la noche lógica), el reloj de la app se puede correr (decisión 66). Sólo vale con `pnpm dev` o cuando la app apunta al Supabase local; la app lo avisa en una franja arriba.

- **Navegador:** agregar `?ahora=2027-02-05T21:00` (hora de Montevideo) a la dirección. Queda para toda la pestaña y el reloj sigue corriendo; `?ahora=` vuelve a la hora real.
- **Emulador de Android:** se fija al compilar, con `VITE_AHORA` (en `app/.env` o en la terminal):

```powershell
$env:VITE_AHORA = "2027-02-05T21:00"
pnpm --filter app android:local --target emulator-5554
```

- **Sin red en el emulador:** `adb shell svc wifi disable` y `adb shell svc data disable` (y `enable` para volver). Abrir la app una vez con red antes, para que baje el modo Llamadas.

## Panel admin

Web interna de carga de datos (decisiones 51 y 69 a 77), en `admin/`. `pnpm dev:admin` la levanta en http://localhost:5174. Va sólo en español, con todos los textos en `admin/src/locales/es.json` (decisión 70).

- **Entrar:** email y contraseña de un usuario de Supabase Auth con `app_metadata.rol = 'admin'`. `pnpm admin:alta <email>` lo crea y muestra la contraseña una sola vez; `pnpm admin:baja <email>` le quita el permiso (tarda hasta una hora en hacerse efectivo) y `pnpm admin:lista` los lista. Sin variables trabajan contra el Supabase local. Contra el remoto: `--remoto`, con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (la secret key, ver «Proyecto remoto») definidas en la terminal sólo para ese comando.
- **La service role nunca llega al navegador.** El panel usa la key pública y la sesión del admin: todo pasa por la RLS, y lo que necesita más (publicar, suspender) son funciones de la base que chequean `es_admin()`. `admin/src/build.test.ts` compila el panel y controla que la service role no quede en lo que se publica. En `admin/.env` sólo van variables `VITE_…`.
- **Pantallas** (`admin/src/features/`): `import/` (`/grilla/importar`), `night/` (`/grilla?noche=`), `groups/`, `stages/`, `events/`, `contest/`, `parade/` (`/llamadas?evento=`), `log/` (`/registro`) y `map/` (el selector de ubicación). Las secciones del menú están en `admin/src/nav.ts`.
- Todo lo que habla con Supabase está en `admin/src/lib/api.ts`. Los tests de pantallas usan `vi.mock('…/lib/api')`, que toma el doble de `admin/src/lib/__mocks__/api.ts`: al agregar una función hay que sumarla ahí. `renderAdmin()` (`test-utils.tsx`) monta el panel entero con una sesión de admin.
- **Importar una grilla** (decisión 71): el parser (`features/import/parser.ts`) es una función pura que lee el texto pegado o el CSV y lista lo que no entiende; `previsualizar_grilla` reconoce los nombres en la base (exacto, con `public.norm`) y `publicar_grilla` publica todo o nada. Reimportar no toca lo que está igual, una alta no avisa y un cambio de hora o de lugar deja la actuación en `cambiada` y encola su aviso. Las carteleras de prueba están en `features/import/fixtures/`; la tabla de DAECPU es un ejemplo armado (ver `LEEME.md` ahí).
- **Suspender** (decisión 72): `suspender_noche` y `deshacer_suspension`. Después, el panel llama a `avisos-de-cambios` con la sesión del admin para que el aviso salga enseguida; si falla, sale con la pasada de cada minuto.
- **Horas:** las que se escriben son de Montevideo. `nightInstant(noche, hora)` (`admin/src/lib/night.ts`) las pasa a un instante con la regla de las 06:00, y `formatTime` y `formatDateTime` (`lib/format.ts`) las muestran en Montevideo. Nunca la zona del navegador.
- **Mapa:** `features/map/LocationPicker.tsx` (tocar, arrastrar o buscar la dirección con el geocoder de MapTiler). MapLibre se baja aparte (`LocationMap.tsx`) y en los tests se reemplaza con `vi.mock('../map/LocationMap')`: jsdom no tiene WebGL. En i18next, `lng` es una opción reservada: un texto con una longitud usa otro nombre (`lon`).
- **Ubicaciones propuestas** (decisión 87): `pnpm escenarios:proponer` geocodifica con OpenStreetMap (Nominatim, una consulta por segundo) la dirección de los escenarios activos, fijos y sin ubicación, y guarda lo que encuentra en `ubicaciones_propuestas`, no en `escenarios.ubicacion`. Con `--seco` sólo lo muestra; con `--remoto`, contra el proyecto remoto (con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en la terminal). En `/escenarios` el panel avisa cuáles tienen propuesta, muestra qué se buscó y qué se encontró, y deja verla en el mapa o descartarla: pasa a ser la ubicación recién al guardar el escenario, y ahí la base borra la propuesta. Muchas caen en la calle y no en la puerta: hay que mirarlas.
- **Registro de cambios** (decisión 73): `registro_cambios` lo llena un trigger en cada tabla de datos. Una tabla de datos nueva tiene que llevar su trigger `…_registrar_cambio` con las columnas de su clave primaria.
- **Publicar el panel:** es un sitio estático en Vercel, publicado en <https://carnavalero-admin.vercel.app> (proyecto `carnavalero-admin`, equipo `carlosgardel1891s-projects`). No se despliega solo: después de cambiar el panel se compila con las variables del remoto (`admin/.env.remoto`, fuera del repo) y se sube `admin/dist/` (`admin/public/vercel.json` manda todas las rutas a `index.html` y pide que no se indexe). Hace falta `npx vercel login` una vez; como compilar vacía `dist/`, hay que volver a enlazarlo cada vez:

```bash
pnpm --filter admin build --mode remoto
cd admin/dist
npx vercel link --yes --project carnavalero-admin --scope carlosgardel1891s-projects
npx vercel deploy --prod --yes --scope carlosgardel1891s-projects
```

## Variables de entorno

Copiar `app/.env.example` a `app/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), `VITE_MAPTILER_KEY`, `VITE_PUSH_ENABLED` (vacío hasta tener Firebase; ver «Avisos push»), `VITE_AHORA` (vacío; ver «Simular la fecha»), `VITE_DEMO` y `VITE_SENTRY_DSN` (vacíos; ver «Publicación»). Nunca subir `.env` al repo; mantener `.env.example` al día.

El panel tiene el suyo: copiar `admin/.env.example` a `admin/.env`, con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_MAPTILER_KEY`. Ahí no va la service role ni ninguna otra key privada: todo lo que empieza con `VITE_` termina dentro del sitio.

La key de MapTiler queda dentro de la app, así que hay que restringirla por origen en MapTiler Cloud (Account → API keys → Allowed HTTP origins). Los orígenes de la app son: `http://localhost:5173` (desarrollo), `https://localhost` (Android) y `capacitor://localhost` (iOS); los del panel, `http://localhost:5174` y la dirección donde esté publicado. Sin key, el mapa muestra los marcadores sobre un fondo liso y avisa que falta.

## Avisos push

Decisiones 45 a 49. Tres piezas, cada una con sus tests:

- **Quién recibe qué: la base.** Un trigger en `actuaciones` encola los cambios de hora, lugar o estado en `cambios_actuacion` (las altas no encolan). `tomar_avisos_del_dia(noche)` (las actuaciones de la noche y, en las Llamadas, las comparsas seguidas que desfilan; decisión 68) y `tomar_avisos_de_cambios(noche, hasta)` devuelven las filas ya reclamadas en `avisos_enviados`, así el mismo aviso no sale dos veces; `cerrar_avisos(ids)` marca los que salieron. Sólo las ejecuta la service role. Tests: `packages/db-tests/src/avisos.test.ts`.
- **Textos y envío: `@cuerda/shared`.** `buildDailyNotices` y `buildChangeNotices` arman una notificación por dispositivo, en su idioma y con las horas de Montevideo; los textos están en `noticeTexts.ts` (es y en, mismas claves). `deliver` manda con un `Sender`: `createFcmSender` (FCM HTTP v1) o `dryRunSender`.
- **Quién las llama:** sólo la service role (en el remoto, la secret key; decisión 78), en el encabezado `apikey` o en `Authorization: Bearer`. Van con `verify_jwt = false` (`supabase/config.toml`): la plataforma no verifica nada antes y la barrera es `_shared/run.ts`. `avisos-de-cambios` acepta además la sesión de un admin (decisión 72), para el botón de suspender del panel, y por eso responde CORS.
- **Borrar mis datos** (decisión 84): `borrar_mis_datos()` la llama la app con la sesión del usuario y borra sus seguidos, sus dispositivos y sus avisos y, si es anónimo, también el usuario. `purgar_anonimos_inactivos(antes)` borra a los anónimos sin actividad desde esa fecha; sólo la corre la service role, y en el remoto la programa `supabase/remoto/programar_avisos.sql` una vez por día con 13 meses. Una tabla nueva con datos de un usuario tiene que llevar su FK a `auth.users` con `on delete cascade` y sumarse a `borrar_mis_datos()` y a su test (`packages/db-tests/src/borrar-mis-datos.test.ts`).
- **Estado del sistema** (decisión 89): cada pasada de una función de avisos que termina bien deja un latido (`registrar_latido`, desde `_shared/run.ts`), y la purga, desde su tarea de pg_cron. `estado_del_sistema()` dice qué tareas están al día (10 minutos para los avisos de cambios, 100 para el del día y 26 horas para la purga); la muestra la portada del panel y la devuelve la Edge Function `estado`, sin ninguna key, con 200 o 503, para un monitor externo. Una tarea programada nueva tiene que dejar su latido y sumarse a la lista de `estado_del_sistema()`. En el Supabase local no hay tareas programadas: ahí figuran sin correr.
- **Edge Functions: sólo juntan y mandan.** Importan los archivos de `packages/shared/src/` por ruta relativa y con extensión `.ts` (Deno); por eso `notices.ts`, `delivery.ts`, `fcm.ts`, `dates.ts`, `llamadas.ts` y `noticeTexts.ts` sólo pueden tener imports relativos con `.ts` (lo controla `denoImports.test.ts`).

Probarlas en local, sin Firebase (simulacro: devuelven los avisos armados y no mandan nada):

```bash
pnpm supabase functions serve
# La service role key sale de `pnpm supabase status`.
curl -X POST http://127.0.0.1:55321/functions/v1/avisos-del-dia \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -d '{"forzar": true}'
curl -X POST http://127.0.0.1:55321/functions/v1/avisos-de-cambios \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" -d '{"sin_espera": true}'
```

- `avisos-del-dia` sólo manda entre las 12:00 y las 19:00 de Montevideo; `forzar` saltea el horario.
- `avisos-de-cambios` espera a que una actuación lleve un minuto sin tocarse; `sin_espera` lo saltea.
- Para que haya a quién avisar hace falta un usuario que siga un conjunto (desde la app) y una fila suya en `dispositivos_push`. Tomar los avisos los reclama. Si no se enviaron (en simulacro nunca se envían), vuelven a salir: el del día, a los 5 minutos y hasta tres veces; el de cambio, al minuto y después cada vez más espaciado, hasta que la actuación empieza. Si empieza sin que haya salido queda en `avisos_enviados.fallido_en` y la respuesta lo cuenta en `perdidos`.
- En el remoto están desplegadas desde el 2026-11-12, en simulacro. No se despliegan solas: ver «Proyecto remoto».

**Firebase (pendiente: falta crear el proyecto y confirmar el identificador de la app, decisión 46).** Nada de esto va al repo; `.gitignore` ya lo excluye.

- Firebase Console → crear el proyecto → agregar la app Android con el identificador de `app/capacitor.config.ts` → bajar `google-services.json` a `app/android/app/`. Con ese archivo presente, `app/android/app/build.gradle` aplica solo el plugin de Google Services.
- iOS (hace falta una Mac): agregar la app iOS, bajar `GoogleService-Info.plist`, sumarlo al target desde Xcode, activar la capability Push Notifications y subir la key de APNs a Firebase (Project settings → Cloud Messaging).
- Cuenta de servicio para mandar: Project settings → Service accounts → Generate new private key. El JSON entero va como secret `FIREBASE_SERVICE_ACCOUNT`: en local, en `supabase/functions/.env` (una línea, `FIREBASE_SERVICE_ACCOUNT='{…}'`) y `pnpm supabase functions serve --env-file supabase/functions/.env`; en remoto, `pnpm supabase secrets set`.
- En la app: `VITE_PUSH_ENABLED=1` en `app/.env`. Sin `google-services.json`, dejarlo vacío: el plugin se instala igual y la app arranca, pero pedir el token falla.
- En el proyecto remoto las funciones se programan con `pg_cron` y `pg_net`: `avisos-del-dia` cada 30 minutos y `avisos-de-cambios` cada minuto, con la secret key guardada en Vault. Es `supabase/remoto/programar_avisos.sql` (ver «Proyecto remoto»).

## Proyecto remoto

Decisiones 77 y 78. Está armado desde el 2026-11-12: proyecto `carnavalero`, ref `rtogqxqyjsmiilmiuuxp`, <https://rtogqxqyjsmiilmiuuxp.supabase.co>, plan Free (pasa a Pro antes del Inaugural), con las funciones en simulacro hasta que esté Firebase.

**Keys (decisión 78):** en el remoto se usan las nuevas. La pública es la publishable key (`sb_publishable_…`) y la de servidor es la secret key (`sb_secret_…`); las viejas `anon` y `service_role` se dan de baja a fin de 2026 y las funciones no las aceptan. Donde un script pide `SUPABASE_SERVICE_ROLE_KEY`, contra el remoto va la secret key: sale de Project Settings → API keys, o de `pnpm supabase projects api-keys --reveal`. `pnpm supabase login` necesita una terminal propia (no anda con `!` dentro de una sesión de Claude Code) o un token (`pnpm supabase login --token …`).

Para armarlo desde cero, en este orden:

1. Crear el proyecto en la región de São Paulo (`sa-east-1`). `pnpm supabase login` y `pnpm supabase link --project-ref <ref>`.
2. `pnpm supabase db push --include-seed`: aplica las migraciones y los dos seeds de `config.toml`. Nada de `supabase/local/`.
3. En el panel de Supabase: Authentication → Sign In / Providers → **Allow anonymous sign-ins**; y Authentication → Rate Limits, revisar los límites por IP (decisión 23).
4. `pnpm supabase functions deploy avisos-del-dia`, `pnpm supabase functions deploy avisos-de-cambios` y `pnpm supabase functions deploy estado`. Sin el secret `FIREBASE_SERVICE_ACCOUNT` corren en simulacro (ver «Avisos push»).
5. En el SQL editor (o con `pnpm supabase db query --linked -f <archivo>`): guardar en Vault la dirección del proyecto y la secret key, y correr `supabase/remoto/programar_avisos.sql` (las instrucciones están en el encabezado del archivo).
6. Dar de alta el primer admin: `pnpm admin:alta <email> --remoto`, con `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` definidas en la terminal sólo para ese comando.
7. `pnpm remoto:chequeo` (con `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` en la terminal): controla el seed, que no haya nada de prueba, la auth anónima y que las funciones respondan.

En PowerShell, las variables para un solo comando se definen antes y se sacan después:

```powershell
$env:SUPABASE_URL = "https://<ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<secret key: sb_secret_…>"
pnpm admin:alta ana@ejemplo.com --remoto
Remove-Item Env:SUPABASE_URL, Env:SUPABASE_SERVICE_ROLE_KEY
```

La app contra el remoto: crear `app/.env.remoto` (no va al repo: `.gitignore` excluye `.env.*`) con la dirección y la key pública del proyecto remoto y compilar en ese modo. El reloj simulado no anda contra el remoto (decisión 66).

```bash
pnpm --filter app build --mode remoto        # el sitio, para probar
pnpm --filter app exec vite --mode remoto    # pnpm dev, pero contra el remoto
```

Para el teléfono, después de ese build: `pnpm --filter app exec cap sync android` y `pnpm --filter app exec cap run android`.

Límites de auth por IP, iguales en `config.toml` y en el remoto (decisión 79): 1000 altas anónimas por hora, 1500 refrescos de sesión cada 5 minutos y 30 inicios de sesión cada 5 minutos. `pnpm supabase config diff` compara `config.toml` con el remoto. No correr `config push` desde el repo: llevaría también las direcciones locales de auth. Para cambiar un valor suelto en el remoto, `config push --workdir <carpeta>` con un `supabase/config.toml` que declare sólo ese valor (lo que no se declara no se toca).

Después de cada migración nueva: `pnpm supabase db push`. Después de cambiar una Edge Function o algo de `packages/shared/src/` que ellas importan: volver a desplegarla.

## Publicación

Decisiones 80 a 89; el calendario hasta el envío del 5/1 está en `docs/PLAN.md`, Fase 8.

- **Versión:** `app/version.json` (`version`, la visible, y `build`, que sube en cada envío a una tienda). De ahí la leen `app/vite.config.ts` (`__APP_VERSION__`, `__APP_BUILD__`) y `app/android/app/build.gradle`. En iOS se pone a mano en Xcode, igual que ahí.
- **Modos de compilación** (decisión 81): el común (`pnpm build`, Supabase local), `beta` (`app/.env.beta`: remoto y modo demostración) y `produccion` (`app/.env.produccion`: remoto, sin demostración ni reloj simulado). Los dos archivos están fuera del repo. `releaseEnvProblems` (`app/src/lib/releaseEnv.ts`) frena desde `vite.config.ts` un build `beta` o `produccion` que apunte a un Supabase local, y `app/src/build.test.ts` compila la app y lo controla.
- **Modo demostración** (decisión 85), sólo en el build `beta` (`VITE_DEMO=1` en `app/.env.beta`): donde el remoto todavía no tiene nada, la app muestra una noche de ejemplo (la cartelera real del 28/02/2026 corrida a hoy), un orden de desfile y un fixture de ejemplo, con una franja fija que lo avisa. Todo vive en `app/src/demo/` (los datos, en `demo/data/`, con slugs y sin ids: se resuelven contra el catálogo real) y se engancha en `app/src/lib/api.ts`. Cada uso va detrás de `import.meta.env.VITE_DEMO === '1'`, escrito así, entero: es lo que deja al empaquetador sacarlo del build de producción, y `app/src/build.test.ts` controla que no quede ni el código ni los datos. Los textos del modo están en `demo/DemoBanner.tsx`, no en `locales/`, por lo mismo. Los datos se regeneran con `pnpm gen:demo` (carga y quita los datos de prueba del Supabase local). Nada de esto toca el remoto.
- **Reporte de errores** (decisión 86): sólo la parte web de Sentry (`app/src/lib/errors.ts`), y sólo si el build trae `VITE_SENTRY_DSN` (en `app/.env.beta` y `app/.env.produccion`); sin DSN, el build ni carga Sentry (`build.test.ts` lo controla). No manda usuario, cookies, encabezados, cuerpos ni parámetros, ni lo que se toca ni los pedidos a la base; sin trazas ni grabación. En el proyecto de Sentry hay que prender Settings → Security & Privacy → **Prevent Storing of IP Addresses**. Una pantalla que se rompe muestra `components/ErrorScreen.tsx` (por `errorElement` en las rutas y por `ErrorBoundary` afuera) y avisa con `reportError`. Para reportar un error atrapado a mano: `reportError(error)`.
- **Release de Android**, desde PowerShell con `JAVA_HOME` (JDK 21) y `ANDROID_HOME`:

```powershell
pnpm android:release beta            # AAB firmado para la prueba cerrada
pnpm android:release produccion      # AAB firmado para producción
pnpm android:release beta --apk      # APK firmado, para probarlo antes en el emulador
adb install -r app\android\app\build\outputs\apk\release\app-release.apk
```

El script compila en ese modo, sincroniza Capacitor sin el permiso de http del Supabase local y corre Gradle. El AAB queda en `app/android/app/build/outputs/bundle/release/app-release.aab`. Antes de subir uno nuevo a Play Console, subir `build` en `app/version.json`.

- **iOS** (decisión 82): se compila en la Mac del equipo, con Xcode 26 o posterior. El paso a paso, de instalar a TestFlight, está en `docs/IOS.md`. En el repo ya están el manifest de privacidad (`app/ios/App/App/PrivacyInfo.xcprivacy`, con el motivo CA92.1 por Preferences y los datos que se declaran), `ITSAppUsesNonExemptEncryption` en `Info.plist` y el texto del permiso de ubicación en español y en inglés (`es.lproj` y `en.lproj`); falta sumarlos al target desde Xcode, dejar la app sólo para iPhone y elegir el equipo de firma. Sin `GoogleService-Info.plist` la app abre igual: el plugin de avisos (8.6) no configura Firebase si falta el archivo, y con `VITE_PUSH_ENABLED` vacío la app no lo llama. Si cambia qué datos maneja la app, cambia también el manifest.
- **Firma** (nada de esto va al repo): la clave de subida está en `C:\Users\<usuario>\.carnavalero\` (`carnavalero-upload.jks` y `keystore.properties`, con su contraseña y el alias `upload`); la creó `pnpm android:keystore`, que no pisa una que ya exista. `build.gradle` firma el release si encuentra ese `keystore.properties` (o el que diga `CARNAVALERO_KEYSTORE_PROPS`); sin él, el release sale sin firmar y el script se niega a seguir. Hay que guardar una copia de los dos archivos fuera de la máquina. Con Play App Signing la clave de la app la guarda Google: si la de subida se pierde, se crea otra y se pide el cambio en Play Console (Configuración → Integridad de la app → solicitar el restablecimiento de la clave de subida).
- Si el emulador no carga nada, mirar que tenga red: `adb shell svc wifi enable` y `adb shell svc data enable` (quedan apagadas después de probar sin señal).

## Nombre e identificador

La app se llama **Carnavalero** y su identificador es `uy.carnavalero.app` (decisión 54). El identificador está en cuatro lugares que tienen que coincidir: `appId` en `app/capacitor.config.ts`; `namespace` y `applicationId` en `app/android/app/build.gradle`; `package_name` y `custom_url_scheme` en `strings.xml`, más el paquete Java de `MainActivity` (`app/android/app/src/main/java/uy/carnavalero/app/`); y `PRODUCT_BUNDLE_IDENTIFIER` en `project.pbxproj`. El nombre visible está en `appName` (Capacitor), `strings.xml`, `Info.plist`, `app.name` de los locales y el `<title>` de `app/index.html` y `admin/index.html`.

**Los nombres internos siguen siendo «cuerda», a propósito:** el paquete `@cuerda/shared` y `@cuerda/db-tests`, el `name` del `package.json` raíz, el `project_id` de Supabase (`supabase/config.toml`) y por eso los contenedores (`supabase_db_cuerda`…), los parámetros de sesión `cuerda.grilla_ficticia` y `cuerda.grilla_desde`, y las claves de lo que se guarda en el teléfono (`cuerda-cache`, `cuerda-push-asked`). Nada de eso lo ve el público, y cambiarlo rompería imports, la base local de cada uno y lo ya guardado. «Cuerda» sigue apareciendo también como palabra del candombe (el grupo de tambores de una comparsa), y en `prompts/`, `research/informe_fase0.md` y las decisiones viejas, que son registro histórico.

## Logo e íconos

Las imágenes de origen están en `app/assets/` y se dibujan a mano: `icon-only.png` (el logo, 1024×1024), `icon-foreground.png` e `icon-background.png` (las capas del ícono adaptativo de Android; el logo ya ocupa la zona visible de 72 dp, sobre `#0448a7`) y `notificacion.svg` (el ícono de los avisos). Todo lo demás se genera:

```bash
pnpm gen:assets   # necesita Python 3 + Pillow
```

Hace tres cosas, en orden: `scripts/gen_splash.py` arma la pantalla de inicio (`splash.png` y `splash-dark.png`: el logo al centro sobre `--color-ground`) y los favicons (`app/public/` y `admin/public/`); `@capacitor/assets` genera los íconos y las pantallas de inicio de Android e iOS; y `scripts/gen_splash.py --android-layers` vuelve a escribir las capas del ícono adaptativo a 108 dp y sin el margen de 16,7 % que `@capacitor/assets` les agrega. Después de correrlo, mirar el diff: `@capacitor/assets` también reescribe el formato de `AndroidManifest.xml` (descartar ese cambio con `git checkout`).

El ícono de los avisos de Android es `app/android/app/src/main/res/drawable/ic_stat_notificacion.xml`, el SVG pasado a vector drawable a mano; `AndroidManifest.xml` lo declara como ícono por defecto de Firebase Messaging, teñido con `@color/brand`. Desde Android 12, la pantalla de inicio la arma el sistema con el ícono de la app sobre `@color/ground`; la imagen `splash.png` se ve hasta Android 11 y en iOS.

## Reglas

- Un único diseño, claro (decisión 92): sin variantes oscuras ni `dark:`; los colores salen de `app/src/index.css`.
- Zona horaria siempre `America/Montevideo`, nunca la del dispositivo: usar las funciones de `@cuerda/shared`. Una actuación antes de las 06:00 es de la noche anterior.
- Tablas y columnas en español snake_case; código en inglés; commits en español.
- Nada de texto hardcodeado en la UI: todo por i18n (`src/locales/{es,en}.json`, mismas claves; hay un test que lo controla). El panel también, pero sólo en español (decisión 70).
- RLS en todas las tablas: lectura pública de lo publicado, escritura sólo service role o admin. Los usuarios anónimos tienen el rol `authenticated`: las policies de escritura exigen `es_admin()`, nunca sólo el rol. En el MVP todo lo que está en las tablas públicas está publicado (decisión 24).
- La service role nunca va en el panel ni en la app: sólo en las Edge Functions, en Vault y en la terminal de quien corre un script.
- Todo lo que se carga lleva su fuente, y las fuentes de los datos de prueba (`ficticia`, `fixture-ficticio`, `orden-ficticio`) no entran por el panel (decisión 76).
- Nunca subir keys al repo: usar `.env` y mantener `.env.example`. Tampoco `google-services.json`, `GoogleService-Info.plist` ni la cuenta de servicio de Firebase.
- Ningún texto de un aviso push va escrito en la lógica: sale de `packages/shared/src/noticeTexts.ts`, en los dos idiomas.
- `packages/shared/src/database.types.ts` y `supabase/seeds/02_research.sql` son generados: se regeneran con `pnpm gen:types` y `pnpm gen:seed`, nunca a mano.
- Las funciones SQL reciben la noche lógica como parámetro (la app la calcula con `nocheLogica()`); nada de `current_date`, `now()::date` ni el `TimeZone` de la sesión en las migraciones.
- Plan mode antes de cada paso grande; commit al terminar cada paso.
