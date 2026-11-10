# Cuerda

App móvil del Carnaval de Montevideo con foco en las Llamadas y el candombe: qué conjunto actúa hoy, en qué escenario y a qué hora, más un modo especial para el Desfile de Llamadas. Objetivo: publicada antes del Desfile Inaugural del 2027-01-21; envío a revisión de tiendas antes del 2027-01-05.

## Leé primero

- `docs/PLAN.md` — el plan por fases (qué hacer y cuándo).
- `docs/DECISIONES.md` — decisiones tomadas; mandan sobre el plan.
- `research/CAMBIOS.md` — estado de los datos semilla y pendientes.
- `prompts/` — prompts preparados por fase (por ahora sólo el de la Fase 1).

## Stack

React 19 + TypeScript (strict) + Vite + Capacitor 8 + Tailwind 4, Supabase (Postgres + PostGIS, Auth anónima, Edge Functions, Realtime), MapLibre GL + MapTiler, react-i18next (es, en), React Router, TanStack Query, Vitest. Monorepo con pnpm workspaces.

## Estructura

- `app/` — app móvil (Vite + Capacitor). `app/android/` y `app/ios/` son los proyectos nativos generados por Capacitor.
- `admin/` — panel web de carga de datos (por ahora, login placeholder).
- `supabase/` — `config.toml`, `migrations/`, `seed.sql` (sólo local) y, más adelante, Edge Functions.
- `packages/shared/` (`@cuerda/shared`) — tipos de la base (`database.types.ts`, generado), fechas (`nocheLogica`, `modoLlamadasActivo`, `calendarDateInMontevideo`) y `norm` para matching de nombres.
- `research/` — datos semilla de la Fase 0. **No editar a mano sin correr `python research/validate.py` después.**
- `docs/`, `prompts/` — plan, decisiones y prompts.

## Comandos

Requisitos: Node 24 (`.nvmrc`), `corepack enable` (pnpm fijado en `package.json`), Docker Desktop, Python 3 + pandas (para `research/`), Android Studio + **JDK 21** (Android) y una Mac con Xcode (iOS).

Android en Windows: `JAVA_HOME` tiene que apuntar al JDK 21 (`C:\Program Files\Microsoft\jdk-21…`), no al JBR de Android Studio (Java 25, que Gradle 8.14 no soporta). `ANDROID_HOME` = `%LOCALAPPDATA%\Android\Sdk`. Emulador creado: `Medium_Phone_API_37.0`.

```bash
pnpm install                 # dependencias de todo el monorepo
pnpm dev                     # app en http://localhost:5173
pnpm dev:admin               # admin en http://localhost:5174
pnpm lint                    # ESLint en todo el repo
pnpm format                  # Prettier (format:check para CI)
pnpm typecheck               # tsc en cada paquete
pnpm test                    # Vitest en cada paquete
pnpm build                   # build de app y admin
python research/validate.py  # valida los CSV semilla
```

Supabase local (Docker; puertos 553xx para no chocar con otros proyectos):

```bash
pnpm supabase start          # levanta todo; imprime URL y keys locales
pnpm supabase status         # vuelve a mostrar URL y keys
pnpm supabase db reset       # recrea la base: migraciones + seed.sql
pnpm supabase migration new <nombre>
pnpm gen:types               # regenera packages/shared/src/database.types.ts
pnpm supabase stop
```

Studio local: http://127.0.0.1:55323. API: http://127.0.0.1:55321.

Supabase remoto (São Paulo): `pnpm supabase login`, `pnpm supabase link --project-ref <ref>`, `pnpm supabase db push`. El seed no se aplica solo en remoto: cargar los datos con el SQL editor o un script con service role.

Nativo (desde `app/`, o con `pnpm --filter app <script>`):

```bash
pnpm --filter app android        # build + sync + correr en emulador/dispositivo
pnpm --filter app android:local  # igual, pero permitiendo http al Supabase local
pnpm --filter app android:open   # abrir en Android Studio
pnpm --filter app ios            # (en Mac) build + sync + correr en simulador
pnpm --filter app ios:open       # (en Mac) abrir en Xcode
```

En el emulador Android, la app reescribe `127.0.0.1`/`localhost` a `10.0.2.2` para llegar al Supabase local (`app/src/lib/supabase.ts`).

## Variables de entorno

Copiar `app/.env.example` a `app/.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (publishable key) y `VITE_MAPTILER_KEY`. Nunca subir `.env` al repo; mantener `.env.example` al día.

## Bundle ID

Provisional: `uy.cuerda.app`. Para cambiarlo antes de publicar: `appId` en `app/capacitor.config.ts`, `namespace` y `applicationId` en `app/android/app/build.gradle` (y el paquete Java de `MainActivity`), `PRODUCT_BUNDLE_IDENTIFIER` en Xcode; después `pnpm --filter app cap:sync`.

## Reglas

- Zona horaria siempre `America/Montevideo`, nunca la del dispositivo: usar las funciones de `@cuerda/shared`. Una actuación antes de las 06:00 es de la noche anterior.
- Tablas y columnas en español snake_case; código en inglés; commits en español.
- Nada de texto hardcodeado en la UI: todo por i18n (`src/locales/{es,en}.json`, mismas claves; hay un test que lo controla).
- RLS en todas las tablas: lectura pública de lo publicado, escritura sólo service role o admin.
- Nunca subir keys al repo: usar `.env` y mantener `.env.example`.
- Plan mode antes de cada paso grande; commit al terminar cada paso.
