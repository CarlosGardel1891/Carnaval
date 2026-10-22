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
