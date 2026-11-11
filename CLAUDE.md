# Cuerda

App móvil del Carnaval de Montevideo con foco en las Llamadas y el candombe: qué conjunto actúa hoy, en qué escenario y a qué hora, más un modo especial para el Desfile de Llamadas. Objetivo: publicada antes del Desfile Inaugural del 2027-01-21; envío a revisión de tiendas antes del 2027-01-05.

## Leé primero

- `docs/PLAN.md` — el plan por fases (qué hacer y cuándo).
- `docs/DECISIONES.md` — decisiones tomadas; mandan sobre el plan.
- `research/CAMBIOS.md` — estado de los datos semilla y pendientes.
- `prompts/` — el prompt de cada fase, tal como se usó.

## Stack

React 19 + TypeScript (strict) + Vite + Capacitor 8 + Tailwind 4, Supabase (Postgres + PostGIS, Auth anónima, Edge Functions, Realtime), MapLibre GL + MapTiler, react-i18next (es, en), React Router, TanStack Query, Vitest. Monorepo con pnpm workspaces.

## Estructura

- `app/` — app móvil (Vite + Capacitor). `app/android/` y `app/ios/` son los proyectos nativos generados por Capacitor.
- `admin/` — panel web de carga de datos (por ahora, login placeholder).
- `supabase/` — `config.toml`, `migrations/`, `seeds/` (`01_temporadas.sql` y `02_research.sql`, generado: no editar a mano), `local/` (grilla ficticia y noche real del 28/02/2026; sólo para el Supabase local) y `functions/` (las Edge Functions de avisos: `avisos-del-dia`, `avisos-de-cambios` y lo común en `_shared/`).
- `packages/shared/` (`@cuerda/shared`) — tipos de la base (`database.types.ts`, generado), fechas (`nocheLogica`, `modoLlamadasActivo`, `calendarDateInMontevideo`), `norm` para matching de nombres y los avisos push sin la base ni Firebase: textos (`noticeTexts.ts`), agrupado (`notices.ts`), envío (`delivery.ts`) y FCM (`fcm.ts`).
- `packages/db-tests/` (`@cuerda/db-tests`) — tests de integración de la base (RLS, funciones, invariantes del esquema) contra el Supabase local. Corren con `pnpm test:db`, aparte de `pnpm test`.
- `scripts/` — generadores: `gen_seed.py` (el seed, desde los CSV de `research/`), `gen-norm-marks.mjs` (migración de `public.norm`) y `gen_norm_cases.py` (fixture de casos de `norm`); y `db-grilla.mjs`, que carga la grilla ficticia y la noche real de prueba. `norm` vive en tres lugares (TypeScript, Python y SQL) y tienen que dar lo mismo (decisión 22).
- `research/` — datos semilla de la Fase 0. **No editar a mano sin correr `python research/validate.py` después.** Si cambia un CSV, regenerar también el seed (`pnpm gen:seed`) y el fixture de `norm` (`python scripts/gen_norm_cases.py`); el CI falla si quedaron viejos.
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
pnpm supabase functions serve  # sirve las Edge Functions en http://127.0.0.1:55321/functions/v1/
pnpm supabase stop
```

Studio local: http://127.0.0.1:55323. API: http://127.0.0.1:55321.

Seed (decisión 26): `pnpm gen:seed` corre antes `research/validate.py` y no escribe nada si hay errores; con `--post-prueba` le pasa esa opción (para después del 17/11), y con `--check` sólo avisa si el seed quedó viejo. El seed se puede volver a correr sobre una base con datos.

Grilla ficticia (decisión 27): conjuntos reales en escenarios inventados (`ficticio-…`), con `fuente = 'ficticia'`. Sirve para desarrollar pantallas mientras no haya grilla real. `pnpm db:grilla` entra por `docker exec` a la base local; no hay forma de apuntarlo al proyecto remoto, y `pnpm supabase db reset` la borra.

Noche real (decisión 39): la cartelera publicada del sábado 28/02/2026, para probar con una noche de tamaño real (`/?noche=2026-02-28`). Va con `fuente = 'cartelera-2026-02-28'`, sólo en el Supabase local. Cada línea se resuelve por `norm` contra los nombres y alias del seed; lo que no coincide no se carga y `pnpm db:noche-real` lo lista. Los escenarios reales no tienen coordenadas: no aparecen en el mapa ni en «cerca mío».

Supabase remoto (São Paulo): `pnpm supabase login`, `pnpm supabase link --project-ref <ref>`, `pnpm supabase db push`. El seed no se aplica solo en remoto: correr `supabase/seeds/01_temporadas.sql` y después `supabase/seeds/02_research.sql` con el SQL editor o con `psql` (o `pnpm supabase db push --include-seed`, que corre los seeds de `config.toml`). `supabase/local/` nunca se corre en remoto.

Al crear el proyecto remoto hay que activar a mano los inicios de sesión anónimos (Authentication → Sign In / Providers → Allow anonymous sign-ins): `config.toml` sólo vale para el Supabase local. Antes del lanzamiento, revisar también los límites de auth por IP (decisión 23).

Nativo (desde `app/`, o con `pnpm --filter app <script>`):

```bash
pnpm --filter app android        # build + sync + correr en emulador/dispositivo
pnpm --filter app android:local  # igual, pero permitiendo http al Supabase local
pnpm --filter app android:open   # abrir en Android Studio
pnpm --filter app ios            # (en Mac) build + sync + correr en simulador
pnpm --filter app ios:open       # (en Mac) abrir en Xcode
```

Después de agregar o actualizar un plugin de Capacitor: `pnpm --filter app cap:sync` y commitear lo que cambie en `app/android/` y `app/ios/`. `app/ios/App/App.xcodeproj/project.pbxproj` no se edita a mano: se cambia desde Xcode.

En el emulador Android, la app reescribe `127.0.0.1`/`localhost` a `10.0.2.2` para llegar al Supabase local (`app/src/lib/supabase.ts`).

## App

- Pantallas en `app/src/features/`: `today/` (pizarrón «Hoy»), `map/` (mapa de la noche), `stages/` (ficha de escenario), `groups/` (lista y ficha de conjuntos), `follow/` (Seguir y la sesión), `push/` (avisos), `location/` («cerca mío») y `season/`. Todo lo que habla con Supabase está en `app/src/lib/api.ts`; todo lo que habla con el plugin de push, en `app/src/lib/push.ts`.
- Los tests de pantallas usan `vi.mock('…/lib/api')`, que toma el doble de `app/src/lib/__mocks__/api.ts`. Al agregar una función a `api.ts` hay que sumarla ahí.
- La sesión es anónima y se crea recién con el primer «Seguir» (decisión 44). Se guarda con `@capacitor/preferences` (`lib/preferencesStorage.ts`). La app tiene que andar igual sin sesión: `fetchFollowed` devuelve vacío y «mis conjuntos» muestra su estado vacío.
- «Mis conjuntos» es `?mios=1` y lo filtra la base (`p_solo_favoritos`). Esa consulta no se guarda en el teléfono y se vuelve a pedir cuando cambian los seguidos.
- La noche que se muestra sale de `nocheLogica()` o de `?noche=YYYY-MM-DD`; los filtros viven en la URL.
- `/mapa` se carga aparte (`features/map/LazyMapPage.tsx`), así «Hoy» arranca sin MapLibre. Fuera de `features/map/`, nadie importa `MapPage` ni `MontevideoMap`.
- Las consultas se guardan en el teléfono 24 horas (`app/src/lib/queryCache.ts`, decisión 37). Si cambia la forma de lo que devuelve una consulta, subir `CACHE_VERSION`. Una consulta que lleve la posición del usuario va con `meta: { persist: false }`.
- Toda distancia que se muestra pasa por `useDistanceLabel` (`features/location/`): con una ubicación aproximada va redondeada al kilómetro (decisión 42).
- «App al frente», refresco al volver y botón «atrás» de Android: `app/src/lib/lifecycle.ts` (decisiones 32 y 33).
- El color de fondo está en tres lugares que tienen que coincidir: `--color-ground` (`app/src/index.css`), `GROUND` (`app/capacitor.config.ts`) y `ground` (`app/android/app/src/main/res/values/colors.xml`, lo que se ve detrás de las barras del sistema; decisión 41).

## Variables de entorno

Copiar `app/.env.example` a `app/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key), `VITE_MAPTILER_KEY` y `VITE_PUSH_ENABLED` (vacío hasta tener Firebase; ver «Avisos push»). Nunca subir `.env` al repo; mantener `.env.example` al día.

La key de MapTiler queda dentro de la app, así que hay que restringirla por origen en MapTiler Cloud (Account → API keys → Allowed HTTP origins). Los orígenes de la app son: `http://localhost:5173` (desarrollo), `https://localhost` (Android) y `capacitor://localhost` (iOS). Sin key, el mapa muestra los marcadores sobre un fondo liso y avisa que falta.

## Avisos push

Decisiones 45 a 49. Tres piezas, cada una con sus tests:

- **Quién recibe qué: la base.** Un trigger en `actuaciones` encola los cambios de hora, lugar o estado en `cambios_actuacion` (las altas no encolan). `tomar_avisos_del_dia(noche)` y `tomar_avisos_de_cambios(noche, hasta)` devuelven las filas ya reclamadas en `avisos_enviados`, así el mismo aviso no sale dos veces; `cerrar_avisos(ids)` marca los que salieron. Sólo las ejecuta la service role. Tests: `packages/db-tests/src/avisos.test.ts`.
- **Textos y envío: `@cuerda/shared`.** `buildDailyNotices` y `buildChangeNotices` arman una notificación por dispositivo, en su idioma y con las horas de Montevideo; los textos están en `noticeTexts.ts` (es y en, mismas claves). `deliver` manda con un `Sender`: `createFcmSender` (FCM HTTP v1) o `dryRunSender`.
- **Edge Functions: sólo juntan y mandan.** Importan los archivos de `packages/shared/src/` por ruta relativa y con extensión `.ts` (Deno); por eso `notices.ts`, `delivery.ts`, `fcm.ts`, `dates.ts` y `noticeTexts.ts` sólo pueden tener imports relativos con `.ts` (lo controla `denoImports.test.ts`).

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
- Para que haya a quién avisar hace falta un usuario que siga un conjunto (desde la app) y una fila suya en `dispositivos_push`. Tomar los avisos los reclama: el del día vuelve a salir a los 5 minutos (hasta tres veces) si no se envió; el de cambio, no.
- Las funciones no se despliegan en ningún proyecto remoto desde acá.

**Firebase (pendiente: falta crear el proyecto y confirmar el identificador de la app, decisión 46).** Nada de esto va al repo; `.gitignore` ya lo excluye.

- Firebase Console → crear el proyecto → agregar la app Android con el identificador de `app/capacitor.config.ts` → bajar `google-services.json` a `app/android/app/`. Con ese archivo presente, `app/android/app/build.gradle` aplica solo el plugin de Google Services.
- iOS (hace falta una Mac): agregar la app iOS, bajar `GoogleService-Info.plist`, sumarlo al target desde Xcode, activar la capability Push Notifications y subir la key de APNs a Firebase (Project settings → Cloud Messaging).
- Cuenta de servicio para mandar: Project settings → Service accounts → Generate new private key. El JSON entero va como secret `FIREBASE_SERVICE_ACCOUNT`: en local, en `supabase/functions/.env` (una línea, `FIREBASE_SERVICE_ACCOUNT='{…}'`) y `pnpm supabase functions serve --env-file supabase/functions/.env`; en remoto, `pnpm supabase secrets set`.
- En la app: `VITE_PUSH_ENABLED=1` en `app/.env`. Sin `google-services.json`, dejarlo vacío: el plugin se instala igual y la app arranca, pero pedir el token falla.
- En el proyecto remoto falta programar las funciones con `pg_cron` y `pg_net`: `avisos-del-dia` cada 30 minutos y `avisos-de-cambios` cada minuto, con la service role key guardada en Vault.

## Bundle ID

Provisional: `uy.cuerda.app`. Para cambiarlo antes de publicar: `appId` en `app/capacitor.config.ts`, `namespace` y `applicationId` en `app/android/app/build.gradle` (y el paquete Java de `MainActivity`), `PRODUCT_BUNDLE_IDENTIFIER` en Xcode; después `pnpm --filter app cap:sync`.

## Reglas

- Zona horaria siempre `America/Montevideo`, nunca la del dispositivo: usar las funciones de `@cuerda/shared`. Una actuación antes de las 06:00 es de la noche anterior.
- Tablas y columnas en español snake_case; código en inglés; commits en español.
- Nada de texto hardcodeado en la UI: todo por i18n (`src/locales/{es,en}.json`, mismas claves; hay un test que lo controla).
- RLS en todas las tablas: lectura pública de lo publicado, escritura sólo service role o admin. Los usuarios anónimos tienen el rol `authenticated`: las policies de escritura exigen `es_admin()`, nunca sólo el rol. En el MVP todo lo que está en las tablas públicas está publicado (decisión 24).
- Nunca subir keys al repo: usar `.env` y mantener `.env.example`. Tampoco `google-services.json`, `GoogleService-Info.plist` ni la cuenta de servicio de Firebase.
- Ningún texto de un aviso push va escrito en la lógica: sale de `packages/shared/src/noticeTexts.ts`, en los dos idiomas.
- `packages/shared/src/database.types.ts` y `supabase/seeds/02_research.sql` son generados: se regeneran con `pnpm gen:types` y `pnpm gen:seed`, nunca a mano.
- Las funciones SQL reciben la noche lógica como parámetro (la app la calcula con `nocheLogica()`); nada de `current_date`, `now()::date` ni el `TimeZone` de la sesión en las migraciones.
- Plan mode antes de cada paso grande; commit al terminar cada paso.
