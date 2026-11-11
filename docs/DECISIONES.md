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

## 2026-11-10 · Tomadas en la Fase 2 (modelo de datos)

22. **`public.norm` en SQL:** réplica regla por regla de la `norm` de TypeScript, sin `unaccent`: `lower` (con la colación `und-x-icu` fija, para no depender de la del proyecto) → `ß` a `ss` → `normalize(…, NFKD)` → quitar las marcas (`\p{M}`) → colapsar espacios → recortar. `unaccent` no sirve porque no es NFKD: falla en «LOS BUBY´S» y en «Nº 218», y convierte Æ, Ø, Ł e ı, que TypeScript deja como están. Las regex de Postgres no tienen `\p{M}`: la clase de caracteres se genera con `scripts/gen-norm-marks.mjs`, y la migración anota con qué versión de Node y de Unicode se generó. Se prueba contra `packages/db-tests/fixtures/norm_cases.json` (los 358 nombres, alias, barrios, direcciones y lugares de los CSV más 62 sintéticos): una sola diferencia con TypeScript es un error. Detalles:
    - **Diferencias conocidas entre TypeScript y Python**, todas fuera de los datos reales; SQL sigue a TypeScript. Python trata como espacio a U+0085 y a U+001C–U+001F, y TypeScript no; TypeScript trata como espacio a U+FEFF, y Python no. TypeScript quita todas las marcas (`\p{M}`) y Python deja las de clase de combinación 0 (por ejemplo U+0903 y U+20DD). Con la sigma final griega, `toLowerCase` da `ς` y `casefold` da `σ`.
    - **Límite conocido:** `normalize` de Postgres 17 usa Unicode 15.1 y Node 24 usa Unicode 17; puede haber diferencias en caracteres agregados después de la 15.1.
    - **Columnas y unicidad:** `conjuntos` y `escenarios` tienen `nombre_norm` y `alias_norm` como columnas generadas. Las tablas de claves `conjunto_nombres` y `escenario_nombres` (clave primaria `nombre_norm`, mantenidas por un trigger security definer, de sólo lectura) impiden que un nombre o alias normalizado apunte a dos filas distintas.
    - **Cómo se prueba:** el fixture lo genera `scripts/gen_norm_cases.py` a partir de los CSV (con `--check` avisa si quedó viejo) y guarda también el resultado de la `norm` de Python. `pnpm test:db` compara SQL contra TypeScript en todos los casos y, además, carácter por carácter en los bloques con los que se escriben nombres (latino, griego, cirílico, puntuación, espacios, formas de ancho completo); y comprueba que Python y TypeScript coinciden en todos los casos reales.
    - **No es idempotente en general** (en ninguna de las tres): las minúsculas van antes de NFKD, y algunos caracteres de compatibilidad se descomponen en mayúsculas («№» da «No»). No afecta a los datos reales; se deja así para no tocar las versiones de TypeScript y Python.
    - **Si `norm` cambia**, la misma migración tiene que recalcular las columnas generadas y las tablas de claves.
23. **Auth anónima y admin:** inicios de sesión anónimos habilitados (`enable_anonymous_sign_ins = true` en `supabase/config.toml`; hay que activarlos también en el proyecto remoto cuando se cree). Los usuarios anónimos tienen el rol `authenticated`, así que ninguna policy de escritura sobre datos públicos se apoya sólo en ese rol: todas exigen `public.es_admin()`, que lee el claim `app_metadata.rol = 'admin'` del JWT. `app_metadata` sólo se escribe con la service role; `user_metadata` no cuenta. `favoritos` y `dispositivos_push` son sólo de su dueño (`usuario_id = (select auth.uid())`), con FK a `auth.users` y `on delete cascade` para poder limpiar usuarios anónimos más adelante. El mismo token de push puede volver con otro usuario anónimo (por ejemplo, después de reinstalar): se reasigna con `registrar_dispositivo_push()`, una función security definer acotada, sin abrir la RLS. Límites:
    - Sacarle el claim a un admin tarda hasta que venza su token (`jwt_expiry`, 1 hora).
    - Los límites de auth de Supabase son por IP: altas anónimas (`anonymous_users`, 30 por hora) y refresco de sesiones (`token_refresh`, 150 cada 5 minutos). Con el CGNAT de las operadoras móviles, mucha gente en las Llamadas puede compartir IP: hay que revisarlos en `supabase/config.toml` y en el proyecto remoto antes del lanzamiento.
24. **«Publicado»:** en el MVP, todo lo que está en las tablas públicas está publicado; no hay columna de borrador. Consecuencia: el importador del panel admin tiene que mostrar una vista previa antes de insertar. Los borradores llegan en v2 con `borradores_ingesta`.
25. **Llamadas, un evento por noche:** cada noche del Desfile de Llamadas es un evento propio (`llamadas-noche-1-2027` y `llamadas-noche-2-2027`), con su orden de desfile y su estado; si llueve se posterga una sola. Si una fuente las trae como un solo evento de dos días, se parte en dos.
26. **Seed desde `research/`:** `scripts/gen_seed.py` (`pnpm gen:seed`) genera `supabase/seeds/02_research.sql` a partir de los CSV. Antes corre `research/validate.py` (con `--post-prueba` si se le pasa) y no escribe nada si hay errores. El SQL generado va al repo y el CI controla que esté al día (`--check`). Reglas:
    - **Se puede volver a correr** sobre una base con datos: inserta o actualiza por `slug` y sólo toca las columnas que salen de los CSV. No pisa lo que se carga después (`bio`, `foto_url`, `ubicacion`, `recorrido`, `info`) y no borra conjuntos, escenarios ni eventos que ya no estén en los CSV.
    - **Catálogo y participación son cosas distintas.** Los 110 conjuntos de `conjuntos.csv` van a `conjuntos`: hacen falta para reconocer nombres al importar grillas, y estar en el catálogo no dice nada sobre 2027. La fila de `conjunto_temporada` 2027 sólo se crea para los que tienen `temporada_lista = 2027` (98 hoy). Un `en_concurso` vacío queda nulo (pendiente).
    - **Los 12 con `temporada_lista = 2026` no tienen fila 2027**, porque no hay una lista 2027 que los respalde: 4 son conjuntos de 2026 sin evidencia de 2027 (Curtidores de Hongos y Los Adams son bajas; Jorge y Herencia Ancestral no figuran en la Prueba, y Herencia Ancestral tampoco en las Llamadas); y 8 son números fuera de concurso de las carteleras 2026, sin verificar.
    - **Los 34 aspirantes de la Prueba de Admisión 2027 tienen fila 2027 con `en_concurso` nulo (pendiente).** Once de ellos estaban con `temporada_lista = 2026` porque venían del Concurso 2026; como figuran en el fixture de la Prueba 2027 (Montevideo Portal, 14/10/2026), el 2026-11-10 pasaron a `temporada_lista = 2027`: La Margarita, Don Bochinche y Cía, A la Bartola, La Mojigata, Gente Grande, Mi Vieja Mula, Jardín del Pueblo, Carambola, House, Los Chobys y Social Club. El resultado se carga el 17/11 con `pnpm gen:seed --post-prueba`.
    - Los escenarios se cargan sin coordenadas: no están en `research/` y no se inventan.
27. **Grilla ficticia, sólo local:** la grilla para desarrollar y probar está en `supabase/local/grilla_ficticia.sql`, fuera de `migrations/` y de los seeds de `config.toml`. Tres barreras para que nunca llegue al proyecto remoto: el archivo exige el parámetro de sesión `cuerda.grilla_ficticia = 'local'` y sin él falla sin tocar nada; `pnpm db:grilla` entra por `docker exec` al contenedor de la base local, sin URL ni keys; y todo lo que carga está marcado (`actuaciones.fuente = 'ficticia'`, escenarios con slug `ficticio-…`), así que se reconoce y se borra con `pnpm db:grilla --quitar`. Usa conjuntos reales del seed (los que ya tienen cupo en el Concurso) en escenarios inventados. No carga orden de desfile: `orden_desfile` no tiene una columna de fuente para marcarlo como ficticio.
28. **Borrados, claves y funciones auxiliares:**
    - Un conjunto o un escenario con actuaciones no se puede borrar, ni un conjunto que está en un orden de desfile: esas FK no tienen cascada, para no perder grilla por un borrado equivocado. Para dar de baja un escenario está `escenarios.activo`. Sí se borran en cascada con el conjunto `conjunto_temporada`, `conjunto_nombres` y `favoritos`; con el evento, su `orden_desfile`. Si se borra una etapa del concurso, `actuaciones.etapa_id` queda nulo.
    - `orden_desfile`: clave primaria (`evento_id`, `conjunto_id`) y posición única por evento, diferible para poder reordenar sin choques a mitad de camino.
    - `dispositivos_push`: el `token` es la clave primaria. `registrar_dispositivo_push()` sólo la puede ejecutar el rol `authenticated`.
    - `mis_favoritos()`: función security definer que devuelve sólo los conjuntos que sigue el usuario de la sesión. La usan las funciones de lectura para el filtro «mis conjuntos», así andan también sin sesión y sin abrir la RLS de `favoritos`.
    - Para el importador (Fase 7): en un `insert` en lote por la API, si las filas no traen las mismas columnas, las que faltan quedan en nulo en vez de tomar el valor por defecto. Hay que mandarlo con `defaultToNull: false`.

## 2026-11-10 · Tomadas en la Fase 3 (Hoy y escenarios)

29. **Qué queda para la Fase 4:** el filtro «mis conjuntos» y la sesión anónima. En la Fase 3 la app lee todo con la key pública, sin sesión.
30. **«Ahora en escena»:** una actuación está en escena desde su inicio hasta el inicio de la siguiente actuación no suspendida de ese escenario, con un tope de 75 minutos. Una suspendida nunca está en escena. Sólo se marca cuando la noche que se mira es la de hoy.
31. **Pizarrón «Hoy»:**
    - La noche sale de `nocheLogica()` y se le pasa a la base; se puede mirar otra con `?noche=YYYY-MM-DD`.
    - Los filtros (gratis, categoría, vista por escenario o por hora) viven en la URL y cambian con `replace`, para que «atrás» no los deshaga de a uno. Las pestañas de abajo también navegan con `replace`.
    - Por escenario, primero el que arranca antes y, a igual hora, por nombre. Las suspendidas y las cambiadas no se esconden: se muestran marcadas.
    - Siempre dice hace cuánto se actualizó. Si una actualización falla, sigue mostrando lo anterior y lo avisa; el mapa y la ficha de escenario hacen lo mismo.
32. **Refresco:** la grilla se vuelve a pedir cada 5 minutos, sólo con la app al frente. «Al frente» sale de `appStateChange` de `@capacitor/app`, conectado al `focusManager` de TanStack Query. Al volver a la app se refresca sólo lo que tiene más de 1 minuto.
33. **Botón «atrás» de Android:** vuelve en el historial; si no hay a dónde volver, minimiza la app (no la cierra).
34. **«Cerca mío»:**
    - En la URL sólo va `cerca=1`. Las coordenadas quedan en memoria, redondeadas a 4 decimales (unos 11 metros), y nunca se guardan ni se mandan a otro lado que a la consulta.
    - Qué permiso se pide y qué pasa con la ubicación aproximada: decisión 42 (al principio se pedía sólo la aproximada).
    - Ordena por distancia a la parada más cercana de la noche. Los escenarios sin ubicación cargada no entran en la lista, y se avisa cuántos quedaron afuera.
    - Si la URL trae `cerca=1` y no hay permiso, el filtro se apaga sin pedirlo: el permiso sólo se pide cuando la persona toca el botón.
35. **Mapa:**
    - Los escenarios fijos salen de `escenarios_cercanos`, con centro en Montevideo (-34.9058, -56.1913) y 100 km de radio; las paradas de los itinerantes, de las actuaciones de la noche.
    - Cada tipo de escenario tiene forma y color propios, con leyenda: el color solo no alcanza.
    - El mapa nunca pide la ubicación.
    - Estilo `streets-v2-dark` de MapTiler. Sin key, muestra los marcadores sobre un fondo liso y avisa que falta.
    - Cuenta cuántos escenarios de la noche no están en el mapa por no tener ubicación.
36. **Ficha de escenario:**
    - Se busca por `slug`, sin filtrar por `activo`: un enlace viejo tiene que seguir andando. Si esa consulta falla, la ficha se arma con lo que trae la grilla de la noche.
    - La grilla de la ficha usa la misma consulta que el pizarrón sin filtros, así no hay un pedido más.
    - «Cómo llegar» abre el mapa del teléfono: `geo:` en Android, Apple Maps en iOS y Google Maps en el navegador. Sin ubicación cargada no hay enlace, y se dice.
    - Un itinerante lista cada parada de la noche con su enlace.
    - «Volver» vuelve a donde se estaba; entrando directo, va a Hoy.
37. **Caché guardada en el teléfono:**
    - Las consultas se guardan con `@capacitor/preferences` (clave `cuerda-cache`) y valen 24 horas: pasado un día, la grilla vieja confunde más de lo que ayuda.
    - `CACHE_VERSION` se sube cuando cambia la forma de lo que devuelven las consultas; al abrir, la app descarta lo que guardó otra versión.
    - Las consultas que llevan la posición del usuario no se guardan nunca.
    - Lo último que cargó se conserva aunque la actualización siguiente haya fallado.
    - `networkMode: 'always'`: sin red, la consulta falla y se avisa, en vez de quedar en pausa. `navigator.onLine` no es confiable dentro de un WebView.
38. **Permiso de ubicación en iOS:** `NSLocationWhenInUseUsageDescription` va en `Info.plist` con un solo texto, en español. Localizarlo (`InfoPlist.strings`) queda pendiente hasta tener una Mac: `project.pbxproj` no se edita a mano.
39. **Noche real del 28/02/2026, sólo local:** `supabase/local/noche_real_2026-02-28.sql` tiene la cartelera de El Observador del sábado 28/02/2026 tal como salió publicada, y se carga con `pnpm db:noche-real`. Reglas:
    - Las mismas barreras que la grilla ficticia (decisión 27): parámetro de sesión obligatorio, `docker exec` a la base local y marca propia (`fuente = 'cartelera-2026-02-28'`, con la nota en `fuente_url`). `pnpm db:noche-real --quitar` la borra.
    - Cada línea se resuelve por `norm` contra los nombres y alias del seed (decisión 5). Lo que no coincide no se carga y se lista al terminar: el fixture no corrige la cartelera ni agrega alias por su cuenta.
    - Entran 79 de las 82 líneas. Las tres que quedan afuera (20:00 Mi Vieja Mula, 20:50 Los Muchachos y 21:50 Yambo Kenia, en Plaza Bob Marley) están bajo «ESCENARIOS MÓVILES», que es un encabezado de la cartelera y no el nombre de un escenario: no dice cuál de los dos móviles de la IM es. No se agrega como alias en `research/escenarios.csv`, porque asignarlo a uno de los dos sería inventar un dato; en el archivo quedan como comentario. El importador de la Fase 7 resuelve el caso preguntándole al admin.
    - No crea escenarios ni conjuntos y no inventa coordenadas. Los itinerantes llevan sólo la dirección que publicó la cartelera.
    - Es de la temporada 2026 sobre el catálogo 2027: sirve para probar las pantallas con una noche de tamaño real, no como dato histórico.
40. **CI:** hasta el 2026-11-10 GitHub Actions no arranca ninguna corrida (`startup_failure`) por la facturación de la cuenta dueña del repo; no es un problema del workflow. Mientras tanto mandan los chequeos locales, que son los mismos que corre el CI.
41. **Barras del sistema en Android, oscuras:** la app tiene un solo tema, oscuro, y la barra de estado y la de gestos lo siguen aunque el teléfono esté en modo claro. Los íconos claros salen de `StatusBar` (`@capacitor/status-bar`) y `SystemBars` en `app/capacitor.config.ts`, los dos con `style: 'DARK'`: si uno quedara en automático, pisaría al otro al rotar o cambiar el tema. El color de fondo no se puede fijar desde el plugin (desde Android 15 las barras son transparentes y `backgroundColor` no hace nada): sale de `android:windowBackground` en `styles.xml`, con el mismo color que `--color-ground`.
42. **Ubicación precisa o aproximada, a elección del usuario** (reemplaza el punto de la decisión 34 que decía que no se pedía la precisa):
    - Se piden los dos permisos a la vez y el usuario elige. La aproximada de Android cae en una grilla de unos 3 km²: con eso el orden entre tablados cercanos no es confiable.
    - Con el permiso preciso se pide la mejor posición (`enableHighAccuracy`). Sin él no: en Android el plugin volvería a mostrar el diálogo de permisos en cada consulta.
    - La posición es «aproximada» si el usuario dio sólo ese permiso o si el teléfono la informa con un margen de más de 1 km (`APPROXIMATE_FROM_M` en `app/src/lib/geo.ts`); esto último cubre iOS con «ubicación exacta» apagada y un navegador sin GPS.
    - Con una posición aproximada «cerca mío» anda igual, pero las distancias van redondeadas al kilómetro («menos de 1 km», «aprox. 3 km») y un aviso dice que el orden entre escenarios cercanos puede no ser exacto y cómo activar la precisa. La app no vuelve a pedir el permiso por su cuenta.
    - Todo lo que muestra una distancia pasa por `useDistanceLabel` (`app/src/features/location/`).

## 2026-11-11 · Tomadas al arrancar la Fase 4 (Conjuntos, Seguir y push)

43. **Pestaña Conjuntos:** lista los conjuntos con fila en la temporada vigente (`conjunto_temporada`). Los demás del catálogo no se listan, pero el buscador los encuentra y su ficha anda: hace falta para llegar desde el pizarrón. La búsqueda es por «contiene» sobre nombre y alias normalizados con `norm`, en la app y sin tolerancia a errores de tipeo (decisión 5).
44. **Sesión anónima:** se crea recién con el primer «Seguir», no al abrir la app, para no gastar altas contra el límite por IP (decisión 23). Se guarda con `@capacitor/preferences` como storage de supabase-js. Si se pierde (reinstalación, datos borrados, sesión inválida), la app queda como sin sesión y el próximo «Seguir» crea un usuario nuevo; los favoritos del anterior no se recuperan. Es el costo de no pedir registro.
45. **Permiso de notificaciones:** nunca al abrir. Después del primer «Seguir» exitoso, en un dispositivo, una tarjeta de la app pregunta si se quieren avisos; sólo al aceptar se muestra el diálogo del sistema (en Android 13 o más, `POST_NOTIFICATIONS`). Si se niega, la app no lo vuelve a pedir por su cuenta: la ficha explica cómo prender los avisos desde los ajustes del teléfono. Seguir y «mis conjuntos» andan igual.
46. **Push por FCM en Android y en iOS** (ajusta el paso 5 de la Fase 4 de `docs/PLAN.md`, que decía «APNs y FCM»): plugin `@capacitor-firebase/messaging`, token de FCM en las dos plataformas y un solo camino de envío (FCM HTTP v1) desde las Edge Functions. En iOS, APNs queda por debajo de Firebase: hay que subir la key de APNs a Firebase. La cuenta de servicio va como secret de Supabase (`FIREBASE_SERVICE_ACCOUNT`); `google-services.json` y `GoogleService-Info.plist` no van al repo. La app sólo carga el plugin con `VITE_PUSH_ENABLED=1`: sin `google-services.json`, Firebase no arranca en Android. La app no se registra en Firebase hasta confirmar el identificador (decisión 13).
47. **Aviso «tu conjunto actúa hoy»:**
    - Uno por dispositivo y por pasada, agrupado. Un conjunto en un escenario: hora y lugar. Un conjunto en varios escenarios esa noche: un solo aviso con todas sus horas. Varios conjuntos: un resumen. Las suspendidas no entran.
    - Primera pasada a las 12:00 de Montevideo y repasos cada 30 minutos hasta las 19:00. Los repasos sólo mandan lo que todavía no se avisó: la grilla se puede cargar hasta las 18:00 (Fase 9) y alguien puede seguir un conjunto a la tarde.
    - La hora la decide la Edge Function con `America/Montevideo`, no la programación: el cron corre en UTC y sólo la despierta.
    - Al tocarlo abre la ficha del conjunto o, si son varios, el pizarrón de esa noche con «mis conjuntos».
48. **Avisos de cambio y suspensión** (ajusta el paso 7 de la Fase 4 de `docs/PLAN.md`, que decía «disparada al cambiar `actuaciones.estado`»):
    - Un trigger en `actuaciones` encola cada cambio de `estado`, `inicio`, `escenario_id` o `direccion_texto` con los valores anteriores. No llama a nada. Las altas no encolan: importar una grilla nueva no avisa.
    - La Edge Function vacía la cola con una ventana de calma de 60 segundos y manda un aviso por dispositivo con todo lo suyo, no uno por fila. Si una actuación cambió varias veces, cuenta cómo quedó; si quedó igual que antes, no se avisa.
    - Se avisa de la noche de hoy y de las futuras (con el día en el texto si no es hoy); las pasadas se descartan. Una suspendida que vuelve a estar programada se avisa como cambio.
    - En el proyecto remoto la despierta `pg_cron` cada minuto; el botón «suspender noche» de la Fase 7 puede llamarla directo.
49. **Avisos, reglas comunes:**
    - Quién recibe qué lo deciden funciones SQL que sólo ejecuta la service role; el agrupado y los textos, un módulo puro de `@cuerda/shared`; las Edge Functions sólo juntan y mandan. Sin el secret de Firebase corren en simulacro: devuelven los avisos armados y no mandan nada.
    - Sin duplicados: cada aviso se reclama en `avisos_enviados` (clave única por usuario y aviso) antes de mandarlo. Si el envío falla por un error transitorio se libera para la pasada siguiente, hasta tres intentos.
    - Textos en español o inglés según `dispositivos_push.idioma`, con las horas en Montevideo.
    - Un token que FCM rechaza como inexistente o inválido se borra de `dispositivos_push`; con un error transitorio no se borra nada.
    - Con la app abierta no se muestra notificación del sistema: se refresca la grilla.
