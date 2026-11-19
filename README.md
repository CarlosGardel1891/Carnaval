# Carnavalero

App móvil para iPhone y Android con la información del Carnaval de Uruguay, con foco en las Llamadas y el candombe: qué conjunto actúa hoy, en qué escenario y a qué hora, mapa de escenarios de Montevideo, favoritos, avisos push y un modo especial para el Desfile de Llamadas con la hora estimada de pasada de cada comparsa.

Proyecto desarrollado por **Martin Castaldi** junto con **Emiliano Vanzini**. Este repositorio es una copia pública del repositorio original, con todo su historial.

## Stack

- **App:** React 19 + TypeScript (strict), Vite, Capacitor 8 (iOS y Android), Tailwind 4, React Router, TanStack Query, react-i18next (español e inglés), MapLibre GL + MapTiler.
- **Backend:** Supabase: Postgres + PostGIS, Row Level Security, Auth anónima, Edge Functions (avisos push con FCM) y Realtime.
- **Panel admin:** web interna para cargar la grilla, el fixture y el orden del desfile.
- **Calidad:** monorepo con pnpm workspaces, Vitest, tests de integración de la base (RLS, funciones e invariantes del esquema), ESLint, Prettier y CI con GitHub Actions.

## Estructura

- `app/`: la app móvil (Vite + Capacitor).
- `admin/`: el panel interno de carga de datos.
- `supabase/`: migraciones, seeds y Edge Functions.
- `packages/shared/`: tipos de la base y lógica compartida (fechas, horarios estimados de las Llamadas, avisos).
- `packages/db-tests/`: tests de integración contra Supabase local.
- `sitio/`: sitio público con la política de privacidad y el soporte.
- `docs/`: plan por fases, decisiones técnicas, operación y QA.

El detalle técnico completo, con los comandos para correrlo, está en [LEEME.md](LEEME.md).
