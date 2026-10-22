# Cuerda

App móvil del Carnaval de Montevideo con foco en las Llamadas y el candombe: qué conjunto actúa hoy, en qué escenario y a qué hora, más un modo especial para el Desfile de Llamadas. Objetivo: publicada antes del Desfile Inaugural del 2027-01-21; envío a revisión de tiendas antes del 2027-01-05.

## Leé primero

- `docs/PLAN.md` — plan por fases (qué hacer y cuándo).
- `docs/DECISIONES.md` — decisiones tomadas; mandan sobre el plan.
- `research/CAMBIOS.md` — estado de los datos semilla y pendientes.
- `prompts/` — prompts preparados para cada fase.

## Stack

React + TypeScript (strict) + Vite + Capacitor + Tailwind, Supabase (Postgres + PostGIS, Auth anónima, Edge Functions, Realtime), MapLibre GL + MapTiler, react-i18next (es, en), TanStack Query, Vitest.

## Estructura (objetivo de la Fase 1)

- `app/` — app móvil.
- `admin/` — panel web de carga de datos.
- `supabase/` — migraciones, seed, Edge Functions.
- `packages/shared/` — tipos y utilidades compartidas (fechas, normalización de nombres).
- `research/` — datos semilla de la Fase 0. **No editar a mano sin correr `python research/validate.py` después.**
- `docs/`, `prompts/` — plan, decisiones y prompts.

## Reglas

- Zona horaria siempre `America/Montevideo`; una actuación antes de las 06:00 es de la noche anterior.
- Tablas y columnas en español snake_case; código en inglés; commits en español.
- Nada de texto hardcodeado en la UI: todo por i18n.
- Nunca subir keys al repo: usar `.env` y mantener `.env.example`.
- Plan mode antes de cada paso grande; commit al terminar cada paso.

## Comandos

(Se completan en la Fase 1.)
