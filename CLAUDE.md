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
- `supabase/` — `config.toml`, `migrations/`, `seeds/` (`01_temporadas.sql` y `02_research.sql`, generado: no editar a mano), `local/` (grilla ficticia y noche real del 28/02/2026; sólo para el Supabase local) y, más adelante, Edge Functions.
- `packages/shared/` (`@cuerda/shared`) — tipos de la base (`database.types.ts`, generado), fechas (`nocheLogica`, `modoLlamadasActivo`, `calendarDateInMontevideo`) y `norm` para matching de nombres.
- `packages/db-tests/` (`@cuerda/db-tests`) — tests de integración de la base (RLS, funciones, invariantes del esquema) contra el Supabase local. Corren con `pnpm test:db`, aparte de `pnpm test`.
- `scripts/` — generadores: `gen_seed.py` (el seed, desde los CSV de `research/`), `gen-norm-marks.mjs` (migración de `public.norm`) y `gen_norm_cases.py` (fixture de casos de `norm`); y `db-grilla.mjs`, que carga la grilla ficticia y la noche real de prueba. `norm` vive en tres lugares (TypeScript, Python y SQL) y tienen que dar lo mismo (decisión 22).
- `research/` — datos semilla de la Fase 0. **No editar a mano sin correr `python research/validate.py` después.** Si cambia un CSV, regenerar también el seed (`pnpm gen:seed`) y el fixture de `norm` (`python scripts/gen_norm_cases.py`); el CI falla si quedaron viejos.
- `docs/`, `prompts/` — plan, decisiones y prompts.

## Comandos

Requisitos: Node 24 (`.nvmrc`), `corepack enable` (pnpm fijado en `package.json`), Docker Desktop, Python 3 + pandas (para `research/`), Android Studio + **JDK 21** (Android) y una Mac con Xcode (iOS).

Android en Windows: `JAVA_HOME` tiene que apuntar a un JDK 21 (`C:\Program Files\Microsoft\jdk-21…` o, si es Temurin, `C:\Program Files\Eclipse Adoptium\jdk-21…`), no al JBR de Android Studio (Java 25, que Gradle 8.14 no soporta). `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`. Los emuladores creados en la máquina se listan con `emulator -list-avds`.

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

- Pantallas en `app/src/features/`: `today/` (pizarrón «Hoy»), `map/` (mapa de la noche), `stages/` (ficha de escenario), `location/` («cerca mío») y `season/`. Todo lo que habla con Supabase está en `app/src/lib/api.ts`.
- La noche que se muestra sale de `nocheLogica()` o de `?noche=YYYY-MM-DD`; los filtros viven en la URL.
- `/mapa` se carga aparte (`features/map/LazyMapPage.tsx`), así «Hoy» arranca sin MapLibre. Fuera de `features/map/`, nadie importa `MapPage` ni `MontevideoMap`.
- Las consultas se guardan en el teléfono 24 horas (`app/src/lib/queryCache.ts`, decisión 37). Si cambia la forma de lo que devuelve una consulta, subir `CACHE_VERSION`. Una consulta que lleve la posición del usuario va con `meta: { persist: false }`.
- Toda distancia que se muestra pasa por `useDistanceLabel` (`features/location/`): con una ubicación aproximada va redondeada al kilómetro (decisión 42).
- «App al frente», refresco al volver y botón «atrás» de Android: `app/src/lib/lifecycle.ts` (decisiones 32 y 33).
- El color de fondo está en tres lugares que tienen que coincidir: `--color-ground` (`app/src/index.css`), `GROUND` (`app/capacitor.config.ts`) y `ground` (`app/android/app/src/main/res/values/colors.xml`, lo que se ve detrás de las barras del sistema; decisión 41).

## Variables de entorno

Copiar `app/.env.example` a `app/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key) y `VITE_MAPTILER_KEY`. Nunca subir `.env` al repo; mantener `.env.example` al día.

La key de MapTiler queda dentro de la app, así que hay que restringirla por origen en MapTiler Cloud (Account → API keys → Allowed HTTP origins). Los orígenes de la app son: `http://localhost:5173` (desarrollo), `https://localhost` (Android) y `capacitor://localhost` (iOS). Sin key, el mapa muestra los marcadores sobre un fondo liso y avisa que falta.

## Bundle ID

Provisional: `uy.cuerda.app`. Para cambiarlo antes de publicar: `appId` en `app/capacitor.config.ts`, `namespace` y `applicationId` en `app/android/app/build.gradle` (y el paquete Java de `MainActivity`), `PRODUCT_BUNDLE_IDENTIFIER` en Xcode; después `pnpm --filter app cap:sync`.

## Reglas

- Zona horaria siempre `America/Montevideo`, nunca la del dispositivo: usar las funciones de `@cuerda/shared`. Una actuación antes de las 06:00 es de la noche anterior.
- Tablas y columnas en español snake_case; código en inglés; commits en español.
- Nada de texto hardcodeado en la UI: todo por i18n (`src/locales/{es,en}.json`, mismas claves; hay un test que lo controla).
- RLS en todas las tablas: lectura pública de lo publicado, escritura sólo service role o admin. Los usuarios anónimos tienen el rol `authenticated`: las policies de escritura exigen `es_admin()`, nunca sólo el rol. En el MVP todo lo que está en las tablas públicas está publicado (decisión 24).
- Nunca subir keys al repo: usar `.env` y mantener `.env.example`.
- `packages/shared/src/database.types.ts` y `supabase/seeds/02_research.sql` son generados: se regeneran con `pnpm gen:types` y `pnpm gen:seed`, nunca a mano.
- Las funciones SQL reciben la noche lógica como parámetro (la app la calcula con `nocheLogica()`); nada de `current_date`, `now()::date` ni el `TimeZone` de la sesión en las migraciones.
- Plan mode antes de cada paso grande; commit al terminar cada paso.
