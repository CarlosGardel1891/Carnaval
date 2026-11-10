# Cuerda · cómo arrancar

Repo de Cuerda, la app del Carnaval de Montevideo y las Llamadas. El trabajo va en la rama `develop`; `main` queda para lo estable.

## Dónde estamos

- **Fase 0 (investigación):** terminada. Datos semilla en `research/`.
- **Fase 1 (setup técnico):** código terminado el 2026-10-23. Falta confirmar a mano: la app corriendo en el simulador de iOS (necesita una Mac) y el proyecto remoto de Supabase (São Paulo) con las migraciones aplicadas.
- **Fase 2 (modelo de datos):** es lo que sigue. Hoy la base sólo tiene la tabla `temporadas`.

El detalle de cada fase está en `docs/PLAN.md`.

## Qué hay

| Ruta | Qué es |
| --- | --- |
| `CLAUDE.md` | Contexto que Claude Code lee solo en cada sesión: stack, comandos y reglas |
| `docs/PLAN.md` | Plan por fases |
| `docs/DECISIONES.md` | Decisiones tomadas (mandan sobre el plan) |
| `docs/competencia-carnaval-app.md` | Análisis de Carnaval App y posicionamiento |
| `prompts/` | Prompts para pegar en Claude Code (por ahora sólo el de la Fase 1) |
| `research/` | CSV semilla (conjuntos, escenarios, calendario), informe de la Fase 0, `CAMBIOS.md` y `validate.py` |
| `app/`, `admin/`, `packages/shared/`, `supabase/` | El código: app móvil, panel de carga, tipos y utilidades compartidas, base de datos |

## Para correrlo

Los requisitos y todos los comandos están en `CLAUDE.md`. Lo mínimo:

1. Node 24, `corepack enable` y Docker Desktop abierto.
2. `pnpm install`
3. `pnpm supabase start` (la primera vez baja las imágenes) y copiar la URL y la publishable key que imprime.
4. Copiar `app/.env.example` a `app/.env` y completarlo (Supabase + key de MapTiler).
5. `pnpm dev` y abrir http://localhost:5173.

## Fechas que no se mueven

- **17/11/2026:** con el resultado de la Prueba de Admisión, actualizar `research/conjuntos.csv` y correr `python research/validate.py --post-prueba`.
- **15/12/2026:** límite para el acuerdo con DAECPU.
- **05/01/2027:** envío a revisión de las tiendas.
- **21/01/2027:** Desfile Inaugural.

## Para hacer vos en paralelo

- Mandar el mail a DAECPU (borrador en `research/informe_fase0.md`, sección 8.1).
- Crear la cuenta de Instagram profesional de la app, vinculada a una Página de Facebook.
- Crear el proyecto en Supabase (región São Paulo) y la API key gratis en MapTiler, si todavía no están.
