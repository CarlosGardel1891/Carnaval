# Prompt · Fase 7 (Datos y panel admin)

Pegalo en Claude Code abierto en esta carpeta.

```text
Fase 7 · Datos y panel admin

Sí al fast-forward: integrá llamadas a develop y pusheá. Después arrancá la Fase 7 de docs/PLAN.md en una rama nueva desde develop, admin, y pusheala después de cada commit. Si algo de este prompt choca con docs/DECISIONES.md, docs/PLAN.md o CLAUDE.md, mandan ellos, en ese orden. Avisame del choque y seguí lo que dicen.

Con el primer commit, guardá este prompt en prompts/fase-7-datos-y-admin.md.

Por qué importa: sin la grilla de cada noche el pizarrón queda vacío, y es el riesgo número uno del proyecto. El panel tiene que permitir cargar una noche entera en pocos minutos, desde el texto que publica DAECPU o la prensa, sin errores silenciosos. Además, la beta del 14/12 necesita el proyecto remoto andando.

1. ANTES DE TOCAR CÓDIGO

Leé:
- docs/DECISIONES.md entero, en especial la 23 (es_admin() y el claim app_metadata.rol), la 24 (lo que está en las tablas públicas está publicado, y por eso el importador muestra una vista previa antes de insertar), la 51 (el panel es una web interna), las de matching de nombres y las de avisos (47 a 49).
- La Fase 7 de docs/PLAN.md, con sus pasos y su «Listo cuando», incluido el caso de los «escenarios móviles» que no dicen cuál.
- CLAUDE.md y context.md.
- El admin actual (sólo un login de muestra), las funciones y la RLS de la base, la cola de avisos y lo que agregaste en la Fase 6 para el atraso del desfile.
- La cartelera del 28/02/2026 de la Fase 3: es el primer caso real para el importador. Si no guardaste el texto original, volvé a la fuente.

Después presentame un plan y esperá mi OK antes de escribir código. El plan tiene que incluir:
a) Acceso: cómo entra un admin (Supabase Auth con es_admin()), cómo se da de alta uno nuevo y cómo se le quita el permiso.
b) Las pantallas: importar grilla, actuaciones de una noche, suspender noche, conjuntos, escenarios (con su ubicación), eventos y fixture del Concurso, orden de desfile, atraso, recorrido y cortes de las Llamadas, y enlaces de entradas.
c) El importador:
   - Entradas: texto pegado (cartelera de DAECPU o de la prensa) y CSV con una plantilla.
   - Vista previa: cada línea con su conjunto, escenario, noche y hora, y su estado (nueva, cambia, igual o sin coincidencia).
   - Nombres sin coincidencia: elegir uno existente, agregarlo como alias o crear uno nuevo, sin coincidencia aproximada.
   - Escenarios móviles que no dicen cuál: el admin elige el móvil y la parada.
   - Reimportar la misma noche no duplica, y publicar es todo o nada.
   - Cargar una grilla nueva no dispara avisos de cambio; los cambios reales sí.
d) Suspender una noche entera o un escenario, con un solo aviso por dispositivo, y cómo se deshace.
e) Ubicación de los escenarios: tocando en el mapa o buscando la dirección, para cargar las coordenadas que faltan.
f) Registro de cambios: quién cambió qué y cuándo.
g) El proyecto remoto: crearlo en São Paulo conmigo, aplicar migraciones y seed, desplegar las Edge Functions, programarlas con pg_cron, activar la auth anónima y revisar los límites por IP. Lo que dependa de mi cuenta, guiame paso a paso.
h) Dónde se publica el panel y cómo se protege.
i) Si el panel va sólo en español, por ser interno.
j) La lista de pasos, uno por commit.

2. REGLAS DE ESTA FASE

- La service role nunca llega al navegador: el panel usa la sesión del admin y la RLS. Lo que necesite más permisos va por funciones de la base o Edge Functions que chequean es_admin().
- Nada de keys en el repo; .env.example al día.
- Las horas que se cargan se interpretan en America/Montevideo, y la noche sale de la noche lógica, igual que en la app.
- El matching de nombres es exacto sobre texto normalizado, contra nombre y alias. Nada de coincidencia aproximada, y no se crean conjuntos ni escenarios sin que el admin lo confirme.
- Todo lo que se carga lleva su fuente.
- Nada ficticio llega al proyecto remoto: ni la grilla, ni el fixture, ni el orden de desfile de prueba.

3. QUÉ TIENE QUE QUEDAR

- El panel con login de admin y las pantallas del punto b.
- El importador con vista previa, que carga una noche real desde el texto pegado.
- Suspender noche, con su aviso.
- La ubicación de los escenarios desde el mapa.
- El atraso del desfile, los cortes y el recorrido de las Llamadas, y los enlaces de entradas, editables.
- El registro de cambios.
- El proyecto remoto andando, con la app pudiendo apuntar a él con una variable de entorno, y el panel publicado.
- Un script para dar de alta un admin, documentado en CLAUDE.md.

4. FUERA DE ESTA FASE

Quedan afuera:
- La ingesta asistida desde Instagram (v2).
- Los resultados del Concurso (v2) y el historial (v3).
- La publicación en las tiendas y la beta (Fase 8).

5. CÓMO TRABAJAR

- Cada paso del plan es un commit, en español.
- Antes de cada commit tienen que pasar los chequeos de CLAUDE.md y pnpm test:db. El CI sigue sin correr, así que mandan los chequeos locales.
- Tiene que haber tests de:
  - el parser, con la cartelera real del 28/02/2026 y con al menos otro formato;
  - las coincidencias, los nombres sin coincidencia y los alias nuevos;
  - el caso de los escenarios móviles;
  - reimportar sin duplicar, y publicar todo o nada;
  - que cargar una grilla nueva no dispare avisos y que un cambio sí;
  - suspender una noche, con un solo aviso por dispositivo;
  - que un usuario que no es admin no pueda escribir nada, ni desde el panel ni llamando a la API;
  - que la service role no aparezca en el build del panel.
- Probalo de punta a punta en local: importar la cartelera del 28/02, corregir un nombre, publicar, verla en la app y suspender la noche.

Pará y preguntame si:
- aparece una decisión de producto que no está escrita;
- algo necesita una cuenta que todavía no existe;
- un paso se va a llevar mucho más de lo previsto.

6. LISTO CUANDO

Esto se suma al «Listo cuando» de PLAN.md:
- Desde el texto de la cartelera del 28/02/2026, una noche entera queda cargada y publicada en menos de 5 minutos, con los nombres resueltos.
- Reimportarla no cambia nada.
- Suspender la noche manda un solo aviso por dispositivo y la app la muestra suspendida.
- Se pueden cargar las coordenadas de un escenario desde el mapa, y el escenario aparece en «cerca mío».
- Un usuario que no es admin no puede escribir nada.
- El proyecto remoto tiene las migraciones, el seed, las funciones programadas y la auth anónima, y el panel está publicado.
- docs/DECISIONES.md, docs/PLAN.md, CLAUDE.md, context.md y .env.example están al día.

Al terminar, pasame un resumen corto con:
- qué quedó hecho;
- qué decisiones se agregaron;
- qué quedó pendiente, separando lo que depende de mí;
- qué necesita la Fase 8 que todavía falta.
```
