# Prompt · Fase 2 (modelo de datos)

Pegalo en Claude Code abierto en esta carpeta.

```text
Fase 2 · Modelo de datos

Vamos con la Fase 2 de docs/PLAN.md. Está atrasada: el plan la cerraba el 9/11 y bloquea todo lo que sigue. El objetivo es dejar la base lista para que la Fase 3, el pizarrón «Hoy» y los escenarios, arranque sobre datos reales. El envío a las tiendas es el 5/1 y no se mueve.

Trabajá sobre develop. Si algo de este prompt choca con docs/DECISIONES.md, docs/PLAN.md o CLAUDE.md, mandan ellos, en ese orden. Avisame del choque y seguí lo que dicen.

1. ANTES DE TOCAR CÓDIGO

Leé:
- docs/DECISIONES.md entero.
- La Fase 2 de docs/PLAN.md, con sus pasos y su «Listo cuando».
- CLAUDE.md y research/CAMBIOS.md.
- Las cabeceras y algunas filas de research/conjuntos.csv, research/escenarios.csv y research/calendario_2027.csv.
- La función norm de research/validate.py y la de packages/shared, con sus tests. Buscá también el set de 358 nombres, alias y direcciones con el que se compararon; si no está guardado como fixture, armalo desde los CSV.
- nocheLogica() en packages/shared.
- Las migraciones existentes, supabase/config.toml y supabase/seed.sql.
- El prompt de la Fase 1 en prompts/, para mantener la misma forma de trabajo.

Después presentame un plan y esperá mi OK antes de escribir código. El plan tiene que incluir:
a) Cómo cerrar las dos decisiones abiertas de la sección 2: alternativas, recomendación y por qué.
b) El esquema de las 9 tablas nuevas: columnas, tipos, claves, checks e índices. Decí también si temporadas necesita algún cambio.
c) La firma y el comportamiento de las cuatro funciones de consulta.
d) La matriz de permisos. Para cada tabla, qué pueden hacer anon, un usuario anónimo, otro usuario y un admin. Si no está definido qué cuenta como «publicado», planteámelo.
e) El mapeo de las columnas de los CSV a las tablas: qué va dónde, qué no tiene lugar y qué falta.
f) La lista de pasos, uno por commit. Si PLAN.md lo permite, poné primero lo que bloquea la Fase 3: escenarios, conjuntos, actuaciones, actuaciones_de_la_noche, escenarios_cercanos y el seed.

2. LAS DOS DECISIONES ABIERTAS

Esta es mi propuesta. Validala contra el código y presentala en el plan.

Normalización en SQL:
- Una función public.norm(text), declarada immutable, que replique regla por regla la norm de TypeScript y la de Python. Leé las dos implementaciones: no alcanza con «minúsculas, sin tildes, espacios simples».
- unaccent está declarada stable. Llamala desde public.norm con el diccionario explícito, calificando todo con el esquema de la extensión y con search_path fijo.
- Aplicá unaccent antes de lower.
- Usá esa función en columnas normalizadas generadas (generated always as (...) stored) para los nombres y alias de conjuntos y escenarios.
- La base tiene que impedir que un nombre o alias normalizado apunte a dos conjuntos distintos. Lo mismo con los escenarios. Proponé cómo.
- Probala contra el set de 358 casos: tiene que dar exactamente lo mismo que la de TypeScript, y una sola diferencia ya es un error.
- Si hay diferencias, corregilas en SQL, por ejemplo con translate. No toques las versiones de TypeScript ni de Python, que ya coinciden entre sí.

Auth anónima:
- Habilitala en supabase/config.toml con enable_anonymous_sign_ins = true.
- Anotá en CLAUDE.md que también hay que activarla en el proyecto remoto cuando se cree.
- favoritos y dispositivos_push quedan sólo para su dueño: usuario_id = (select auth.uid()).
- Los usuarios anónimos tienen el rol authenticated. Por eso, ninguna policy de escritura sobre datos públicos puede apoyarse sólo en ese rol.
- Para el admin propongo un claim en app_metadata, que sólo se puede escribir con la service role, y una función es_admin() que lo lea.

Cuando estén aprobadas, registrá las dos en docs/DECISIONES.md con el número que siga.

3. QUÉ TIENE QUE QUEDAR

Tablas: las 9 nuevas son conjuntos, conjunto_temporada, escenarios, actuaciones, etapas_concurso, eventos, orden_desfile, favoritos y dispositivos_push, todas con RLS.

actuaciones:
- La noche lógica se calcula en la base, con America/Montevideo explícito y corte a las 06:00. Por ejemplo: ((inicio at time zone 'America/Montevideo') - interval '6 hours')::date.
- Nunca uses current_date, now()::date ni el TimeZone de la sesión.
- En los escenarios itinerantes, la ubicación va en la actuación.
- Definí una clave natural para que reimportar la grilla no duplique filas.

escenarios:
- ubicacion admite nulos porque hoy no hay coordenadas. No las inventes.

conjunto_temporada:
- Tiene que poder representar «pendiente» hasta que esté el resultado de la Prueba de Admisión.

dispositivos_push:
- El mismo token puede volver con otro usuario anónimo, por ejemplo después de reinstalar la app.
- Tiene que poder reasignarse sin abrir la RLS. Una opción es una función security definer acotada.

Funciones:
- actuaciones_de_la_noche, proximas_de_conjunto, escenarios_cercanos y buscar_por_nombre, todas security invoker y con search_path fijo.
- Reciben la noche como parámetro: la app la calcula con nocheLogica().
- escenarios_cercanos incluye los itinerantes, según dónde estén esa noche.
- buscar_por_nombre sigue la regla de matching: exacto sobre texto normalizado, contra nombre y alias.
- Hacen falta índices para esas cuatro consultas, incluido uno GiST para las ubicaciones.

Seed (va en esta fase, salvo que PLAN.md lo ponga en otra):
- El seed se genera desde research/*.csv con un script determinístico. Antes de generar se corre python research/validate.py.
- Con pnpm supabase db reset se carga todo.
- El script se puede volver a correr cuando se actualice conjuntos.csv con el resultado de la Prueba.
- Documentá el comando en CLAUDE.md.

Grilla de prueba:
- Hace falta para los tests y para desarrollar la Fase 3.
- Va en archivos aparte y marcada como ficticia, por ejemplo en la columna de fuente. Nunca puede llegar al proyecto remoto.

Tipos:
- database.types.ts se regenera con pnpm gen:types, nunca a mano.

4. FUERA DE ESTA FASE

Quedan afuera: pantallas; Edge Functions y envío de push; panel admin e importador de la grilla; proyecto remoto de Supabase; coordenadas de los escenarios.

No edites research/ a mano. Si hace falta tocarlo, corré python research/validate.py después.

5. CÓMO TRABAJAR

- Cada paso del plan es un commit, en español.
- Antes de cada commit tienen que pasar los chequeos de CLAUDE.md, pnpm supabase db reset y los tests de base.
- Para los tests de base, elegí en el plan entre pgTAP con supabase test db e integración con Vitest contra el Supabase local.
- Si los tests de base se pueden sumar al CI sin frenar la fase, sumalos. Si no, anotalo como pendiente.
- Tablas y columnas en español con snake_case; el código, en inglés.
- Ninguna key en el repo. Si cambia alguna variable, actualizá .env.example.

Pará y preguntame si:
- aparece una decisión de producto que no está escrita;
- los datos de research/ no alcanzan para cumplir una regla;
- un paso se va a llevar mucho más de lo previsto.

6. LISTO CUANDO

Esto se suma al «Listo cuando» de PLAN.md:
- pnpm supabase db reset crea las tablas, las funciones y el seed sin errores.
- public.norm da lo mismo que norm() de TypeScript en los 358 casos.
- La noche que calcula la base coincide con nocheLogica() en los bordes: 05:59, 06:00 y después de medianoche.
- Hay tests de RLS que prueban que anon lee lo publicado y no escribe nada, que un usuario anónimo sólo ve y modifica sus favoritos y sus dispositivos, y que sólo un admin escribe datos públicos.
- actuaciones_de_la_noche devuelve la noche ordenada por hora, incluidas las actuaciones de después de medianoche.
- escenarios_cercanos funciona con coordenadas de prueba e incluye los itinerantes.
- Los tipos están regenerados y el CI está verde.
- docs/DECISIONES.md, CLAUDE.md y .env.example están al día.

Al terminar, pasame un resumen corto con: qué quedó hecho, qué decisiones se agregaron, qué quedó pendiente y qué necesita la Fase 3 que todavía falta.
```
