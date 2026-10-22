# Prompt · Fase 1 (setup técnico)

Pegalo en Claude Code abierto en esta carpeta.

```text
Leé CLAUDE.md, docs/PLAN.md, docs/DECISIONES.md y research/CAMBIOS.md. Vamos con la
FASE 1 (setup técnico) de Cuerda. Entrá en plan mode y proponeme el plan antes de
tocar nada. Antes de empezar preguntame: el Bundle ID (propuesta: uy.cuerda.app) y
si ya creé el proyecto de Supabase.

0. GIT
   - La carpeta todavía no es un repo git. Inicializalo (rama main) y hacé un
     primer commit con lo que ya hay: "Fase 0: research, plan y decisiones".
     Después te paso la URL de GitHub para agregar el remote.

OBJETIVO ("listo cuando")
Una app vacía que corre en simulador iOS y emulador Android, muestra un mapa de
Montevideo y lee la tabla `temporadas` de Supabase (local y remoto).

1. MONOREPO (pnpm workspaces)
   - app/      React + TypeScript (strict) + Vite + Capacitor + Tailwind
   - admin/    React + TypeScript + Vite (por ahora una página vacía con login placeholder)
   - supabase/ migraciones, seed y Edge Functions (supabase init)
   - packages/shared/  tipos y utilidades compartidas entre app y admin
   - research/, docs/ y prompts/ ya existen: no los toques (salvo CLAUDE.md, ver punto 6).

2. APP
   - React Router y TanStack Query.
   - react-i18next con es (default) y en desde el día uno; nada de texto hardcodeado.
   - Pantalla de prueba: mapa de Montevideo (MapLibre GL, centro -34.9058, -56.1913,
     zoom 12) con tiles de MapTiler; la key va en .env (VITE_MAPTILER_KEY). Debajo,
     el nombre y las fechas de la temporada leída de Supabase.
   - Capacitor iOS y Android con el Bundle ID que te confirme. Que compile en
     emulador Android; para iOS hace falta una Mac con Xcode: si no hay, dejalo
     configurado y decime qué pasos quedan. Si algo requiere Android Studio o Xcode
     a mano, frená y decime los pasos.

3. SUPABASE
   - Local con `supabase start` (Docker). PostGIS y unaccent activados en una migración.
   - Una sola tabla en esta fase: `temporadas` (id, anio, fecha_inicio, fecha_fin,
     modo_llamadas_desde, modo_llamadas_hasta), con RLS: lectura pública, escritura
     sólo service role. Seed con la temporada 2027: inicio 2027-01-21, fin
     2027-03-07, modo Llamadas del 2027-02-05 al 2027-02-06.
   - Tipos generados con `supabase gen types` hacia packages/shared.
   - Remoto: cuando te avise que creé el proyecto (región São Paulo), linkealo y
     aplicá la migración. Nunca subas keys al repo: .env.example con las variables.

4. FECHAS (packages/shared)
   - Toda la lógica de "hoy" en America/Montevideo, sin depender de la zona del
     dispositivo.
   - Función `nocheLogica(instante)`: una actuación antes de las 06:00 pertenece a la
     noche anterior (00:40 del sábado = noche del viernes).
   - Función `modoLlamadasActivo(fecha, temporada)` según las fechas de la temporada,
     nunca según el tipo de evento.
   - Función `norm(texto)` igual a la de research/validate.py (minúsculas, sin tildes,
     espacios simples), para el matching de nombres + alias de la Fase 2.
   - Tests con Vitest para las tres, incluidos los bordes (05:59, 06:00, medianoche,
     cambio de mes; tildes, ñ, mayúsculas, dobles espacios).

5. CALIDAD
   - ESLint + Prettier, typecheck y Vitest en todos los paquetes.
   - GitHub Actions: lint, typecheck y tests en cada push. Agregá también un job
     que corra `python research/validate.py`.

6. DOCUMENTACIÓN
   - Completá la sección "Comandos" de CLAUDE.md (dev, test, build, supabase,
     emuladores) y ajustá la estructura si cambió algo.
   - Si tomás una decisión técnica que no está en docs/DECISIONES.md, agregala al
     final con fecha.

7. ENTREGA
   - Commits chicos por paso, mensajes en español.
   - Al final: corré lint, typecheck y tests, y mostrame cómo levantar la app en
     emulador. Decime qué quedó pendiente de mi lado (cuentas, keys, firmas).
```
