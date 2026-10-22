# Cuerda · cómo arrancar

Esta carpeta es el repo de Cuerda (git, rama `main`). Está todo lo que necesita Claude Code para empezar la Fase 1.

## Qué hay

| Ruta | Qué es |
| --- | --- |
| `CLAUDE.md` | Contexto que Claude Code lee solo en cada sesión |
| `docs/PLAN.md` | Plan por fases, actualizado con lo que salió de la Fase 0 |
| `docs/DECISIONES.md` | Decisiones tomadas (mandan sobre el plan) |
| `docs/competencia-carnaval-app.md` | Análisis de Carnaval App y posicionamiento |
| `prompts/fase-1-setup.md` | Prompt para pegar en Claude Code |
| `research/` | CSV semilla (conjuntos, escenarios, calendario), informe de la Fase 0, `CAMBIOS.md` y `validate.py` |

## Antes de la Fase 1

1. Instalá Node 20+, pnpm, Docker Desktop, la CLI de Supabase y Android Studio. En Windows no hay simulador de iOS: el build de iOS va a necesitar una Mac (o Xcode Cloud) más adelante.
2. Creá el proyecto en Supabase (región São Paulo) y una API key gratis en MapTiler.
3. Creá el repo en GitHub y conectalo: `git remote add origin <url>` y `git push -u origin main`.

## Arrancar

1. Abrí Claude Code en esta carpeta.
2. Pegá el prompt de `prompts/fase-1-setup.md`.
3. El 17/11, con el resultado de la Prueba de Admisión, actualizá `research/conjuntos.csv` y corré `python research/validate.py --post-prueba`.

## Para hacer vos en paralelo

- Mandar el mail a DAECPU (borrador en `research/informe_fase0.md`, sección 8.1). Fecha límite para el acuerdo: 15 de diciembre.
- Crear la cuenta de Instagram profesional de la app, vinculada a una Página de Facebook.
