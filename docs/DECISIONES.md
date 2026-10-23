# Decisiones

Registro de decisiones del proyecto. Si algo de `docs/PLAN.md` choca con este archivo, manda este archivo. Agregá decisiones nuevas al final, con fecha.

## 2026-10-22 · Tomadas después de la Fase 0

1. **Alcance geográfico:** Montevideo + área metropolitana. Canelones incluido (Monumental de la Costa, Las Piedras, Paso Carrasco están en la grilla de DAECPU).
2. **Escenarios itinerantes** (Escenario Móvil IM 1 y 2, Carnaval de a Pie 1 a 8, Barrio a Barrio): la ubicación va en cada actuación (`direccion_texto`, `ubicacion` PostGIS opcional), no en el escenario. El escenario itinerante no tiene dirección.
3. **Nulos permitidos:** `escenarios.tipo`, `escenarios.gratis` y `escenarios.itinerante` aceptan nulo (caso: Escenario en Canelones, sin datos todavía).
4. **Categoría de conjunto:** el enum incluye `otro` además de murga, parodistas, humoristas, revista, comparsa y samba.
5. **Matching de nombres** (importador de grilla, búsquedas): exacto sobre texto normalizado (minúsculas, sin tildes, espacios simples) contra nombre + alias. Es la misma función `norm` de `research/validate.py`, portada a TypeScript en `packages/shared` con tests. Nada de matching aproximado por ahora: el alias «Centro Cultural Alba Roballo - Eduardo Lladó» y el escenario «Eduardo Lladó» de DAECPU podrían chocar.
6. **Fuentes:** `fuente_url` se guarda como `text[]`. En los CSV viene separada por ` | `.
7. **Modo Llamadas:** se activa por las fechas de la temporada (`modo_llamadas_desde` / `modo_llamadas_hasta`), nunca por el tipo de evento. La hora estimada de paso por cuadra entra en el MVP: 20:00 la primera comparsa, 10 minutos y 150 metros entre comparsas (reglamento 2026).
8. **Fecha lógica:** toda la lógica de «hoy» usa `America/Montevideo`. Una actuación antes de las 06:00 pertenece a la noche anterior.
9. **Posicionamiento frente a Carnaval App:** no hacemos pencas, reseñas ni comentarios. Diferenciales: alertas por conjunto, escenarios gratuitos, mapa, hora estimada en Llamadas, inglés, sin registro.
10. **Mapas:** MapLibre GL con tiles de MapTiler (key en `VITE_MAPTILER_KEY`).
11. **Convenciones de código:** tablas y columnas en español, snake_case. Código (variables, funciones, componentes) en inglés. Commits en español.
12. **Instagram:** sólo API oficial (Business Discovery) desde el backend; nunca scraping. Es v2 y nunca fuente de la grilla.

## 2026-10-23 · Tomadas en la Fase 1 (setup técnico)

13. **Bundle ID provisional:** `uy.cuerda.app` hasta tener el nombre final. Se cambia antes de crear las fichas en las tiendas (pasos en `CLAUDE.md`).
14. **Herramientas:** pnpm vía corepack (versión fijada en `package.json`); Supabase CLI como devDependency (`pnpm supabase …`); TypeScript 6.0 (typescript-eslint todavía no soporta 7); Tailwind 4 con `@tailwindcss/vite`.
15. **Zona horaria sin librerías:** `Intl.DateTimeFormat` con `timeZone: 'America/Montevideo'`, nunca un offset fijo ni la zona del dispositivo. Las fechas puras (`YYYY-MM-DD`) se comparan como texto y se muestran formateadas en UTC.
16. **Modo Llamadas por noche lógica:** `modoLlamadasActivo` compara la noche lógica del instante con `[modo_llamadas_desde, modo_llamadas_hasta]` (ambas inclusive). La madrugada después de la última noche sigue en modo Llamadas hasta las 06:00.
17. **Nombres en español en `@cuerda/shared`:** `nocheLogica` y `modoLlamadasActivo` quedan en español porque espejan columnas y conceptos del dominio; el resto del código, en inglés.
18. **`norm` igual a Python:** el port de `research/validate.py` reproduce también sus rarezas (por ejemplo «LOS BUBY´S» → «los buby s», porque NFKD separa el acento suelto). Si cambia uno, cambia el otro.
19. **`temporadas`:** `modo_llamadas_desde/hasta` pueden ser nulos (ambos o ninguno) y deben caer dentro de la temporada; lo controlan checks en la base.
20. **Supabase local en puertos 553xx** (API 55321, DB 55322, Studio 55323) para convivir con otros proyectos Supabase en la misma máquina.
21. **Supabase local desde el emulador Android:** la app reescribe `127.0.0.1` a `10.0.2.2` sólo en Android, y el http en claro se habilita sólo con `CUERDA_LOCAL=1` (script `android:local`), nunca en los builds normales.
