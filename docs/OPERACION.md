# Manual de operación

Para quien carga los datos de Carnavalero durante la temporada. No hace falta saber programar: todo se hace desde el panel, salvo lo que está en «Si algo falla», que a veces necesita a quien mantiene el proyecto.

- **Panel:** <https://carnavalero-admin.vercel.app>. Se entra con mail y contraseña. Si no tenés usuario, pedilo a quien mantiene el proyecto (`pnpm admin:alta`).
- **Lo que cargás se publica al momento.** No hay borradores: la app lo muestra apenas guardás. Por eso el importador muestra una vista previa antes de publicar.
- **Las horas son siempre de Montevideo.** Una actuación a las 00:30 pertenece a la noche anterior: la del sábado a las 00:30 se carga en la noche del viernes.
- **Todo lleva su fuente:** de dónde salió el dato (DAECPU, la IM, un diario, el Instagram del escenario).

## Cada día de la temporada

### Antes de las 18:00: la grilla de la noche

1. Abrí el panel y mirá **Estado del sistema** en la portada. Tiene que decir «Todo anda». Si no, andá a «Si algo falla».
2. Conseguí la cartelera del día: la «Programación de hoy» de DAECPU, o la nota de un diario (El Observador, Montevideo Portal, la diaria).
3. **Importar grilla** → elegí la noche → pegá el texto entero de la cartelera (o subí el CSV con la plantilla) → **Vista previa**.
4. Revisá la vista previa:
   - **Nueva:** se va a cargar.
   - **Igual:** ya estaba así; no se toca.
   - **Cambia:** ya estaba, con otra hora o en otro lugar. Si la publicás, quienes siguen a ese conjunto reciben un aviso.
   - **Sin coincidencia:** el panel no reconoció el nombre del conjunto o del escenario. Elegí cuál es de la lista, o cargalo como alias si es otra forma de escribir un nombre que ya existe, o como nuevo si de verdad no está. El panel no adivina por parecido: lo decidís vos.
   - **Duplicada:** el mismo conjunto dos veces en el mismo escenario. Corregí el texto.
   - **No se pudo leer:** líneas que el panel no entendió. Mirá si falta alguna actuación.
5. Un encabezado como «ESCENARIOS MÓVILES» te pide elegir cuál móvil es y en qué esquina para. Sin la parada, la app no puede decir dónde es.
6. Completá la **fuente** (nombre y enlace) y **Publicar**. Es todo o nada: si algo falla, no se carga nada.
7. Abrí la app y mirá «Hoy»: tiene que estar la grilla.

Si la cartelera cambia más tarde, volvé a importarla entera: sólo se toca lo que cambió, y sólo eso avisa.

### Durante la noche: cambios sueltos

**Grilla** → la noche → buscá la actuación → cambiá la hora, el escenario o el estado y guardá. Un cambio de hora o de lugar manda el aviso solo, al minuto.

Para cargar una actuación que faltaba: **Agregar** en esa misma pantalla. Para una que se cargó por error: **Borrar** (no avisa).

## Si llueve: suspender

1. **Grilla** → la noche → **Suspender**.
2. Elegí qué se suspende: toda la noche (todas las casillas marcadas, incluido el Teatro de Verano) o sólo algunos escenarios.
3. Escribí el motivo, por ejemplo «Lluvia». El panel muestra cuántas actuaciones toca.
4. **Confirmar.** Cada persona que sigue a un conjunto suspendido recibe **un solo** aviso, aunque siga a varios.

Si te equivocaste, o la suspensión se levanta: en esa misma pantalla, **Deshacer** en la suspensión. Vuelve todo a como estaba y avisa «vuelve a estar programada».

No suspendas escenario por escenario si se suspendió todo: hacelo de una vez, para que salga un solo aviso.

Si una noche se **reprograma** para otro día, cargala en la fecha nueva con el importador y dejá la original suspendida.

## Las noches de Llamadas

Todo está en **Llamadas**, eligiendo la noche arriba.

- **El orden de desfile:** cuando la IM o DAECPU lo publican, pegá la lista (una comparsa por línea, en orden) y guardá. Reemplaza el anterior entero.
- **Si el desfile arranca tarde:** en **Horario**, poné los minutos de **atraso** (por ejemplo, 40). Todas las horas estimadas de la app se corren esa cantidad. Actualizalo durante la noche si el atraso crece. Al terminar, no hace falta volver a cero.
- **Si cambia la hora de largada, el intervalo o la separación:** están en el mismo lugar. Vacíos, valen las 20:00, 10 minutos y 150 metros.
- **El recorrido y los cortes de calle:** hoy son estimados y la app lo dice. Cuando la IM publique los oficiales, corregí las esquinas y los cortes, poné el enlace y marcá el recorrido como **confirmado**.
- **Si una noche se posterga:** cambiá la fecha del evento en **Eventos**. El desfile no son actuaciones: no se suspende desde Grilla.

## Otras cargas

- **Escenarios:** dirección, precio y **ubicación en el mapa**. Sin ubicación, un escenario no sale en el mapa ni en «Cerca mío». Si el panel dice «con propuesta», hay un punto que propuso OpenStreetMap: tocá **Ver la propuesta en el mapa**, corregilo arrastrándolo hasta la puerta si hace falta, y **Guardar**. Si está mal, **Descartar** y ponelo vos tocando el mapa.
- **Conjuntos:** nombre, alias (otras formas de escribirlo, para que el importador lo reconozca), categoría y si participa en la temporada.
- **Eventos:** el calendario, y el enlace y el texto de la **venta de entradas**. No cargues la venta de un año anterior.
- **Concurso:** las etapas de cada rueda y qué conjuntos van cada noche.
- **Registro:** quién cambió qué y cuándo. Sirve para ver qué pasó si algo aparece raro.

## Si algo falla

### El panel no abre o no deja entrar

- **No carga:** probá <https://carnavalero-admin.vercel.app> en otra red. Si tampoco, avisá a quien mantiene el proyecto: puede estar caído Vercel o haberse pausado el proyecto de Supabase.
- **«No tenés permiso»:** tu usuario no es admin, o le sacaron el permiso. Pedilo de nuevo.
- **Olvidaste la contraseña:** quien mantiene el proyecto te genera otra (`pnpm admin:alta <mail> --clave --remoto`).

### La app no muestra lo que cargué

1. Mirá en **Grilla** que esté en la noche correcta. El error más común es cargar una actuación de la madrugada en el día siguiente.
2. En la app, tocá **Actualizar**. La app guarda la última grilla y la vuelve a pedir cada 5 minutos.
3. Mirá el **Registro**: si tu cambio no está, no se guardó.

### No llegan los avisos

1. Portada del panel → **Estado del sistema**.
   - Si dice que los avisos están **en simulacro**, falta configurar Firebase: los avisos se arman pero no se mandan. Es de quien mantiene el proyecto.
   - Si «Avisos de cambios y suspensiones» figura sin correr hace más de 10 minutos, la tarea programada está caída. Avisá a quien mantiene el proyecto.
2. Un aviso de cambio tarda hasta un minuto, a propósito: espera a que termines de corregir. El de suspender sale enseguida.
3. Sólo le llega a quien sigue al conjunto y aceptó las notificaciones.
4. Cargar una actuación nueva **no** avisa. Avisa cambiar la hora o el lugar de una que ya estaba, y suspender.

### Mandé un aviso que no era

No se puede retirar una notificación ya enviada. Corregí el dato enseguida: el cambio de vuelta manda otro aviso. Si suspendiste por error, **Deshacer** avisa que vuelve a estar programada.

### Publiqué una cartelera en la noche equivocada

En **Grilla**, en la noche equivocada, borrá esas actuaciones (o suspendelas, si ya pasó tiempo y hay gente que las vio) e importá la cartelera en la noche correcta. El **Registro** te muestra exactamente qué entró.

### Para quien mantiene el proyecto

- **Estado desde afuera:** `https://rtogqxqyjsmiilmiuuxp.supabase.co/functions/v1/estado` responde 200 si todo corre y 503 si no, con el detalle. Un monitor externo lo consulta cada 5 minutos y manda un mail cuando da 503.
- **Una tarea caída:** en el SQL editor de Supabase, `select jobname, status, return_message, start_time from cron.job_run_details d join cron.job j using (jobid) order by start_time desc limit 20;` muestra qué pasó con las últimas corridas, y `select status_code, content::text from net._http_response order by id desc limit 5;`, qué respondieron las funciones. Para reprogramar todo: `supabase/remoto/programar_avisos.sql`.
- **Chequeo general:** `pnpm remoto:chequeo` (ver `CLAUDE.md`, «Proyecto remoto»).
- **El proyecto de Supabase se pausó:** pasa en el plan Free tras una semana sin uso. Se reactiva desde el panel de Supabase; por eso tiene que estar en Pro durante la temporada.
- **Respaldo antes de tocar la base:** `pnpm remoto:respaldo` deja el esquema y los datos en `~/.carnavalero/respaldos/`. En el plan Pro, además, Supabase guarda una copia diaria (Database → Backups).
- **Se cargó algo muy mal y hay que volver atrás:** primero mirá el **Registro**, que guarda el antes y el después de cada cambio; casi siempre alcanza con corregir a mano. Restaurar un respaldo entero pisa todo lo que se cargó después: es el último recurso.

## Resumen de una noche

| Cuándo | Qué |
| --- | --- |
| Mediodía | Mirar el estado del sistema. Buscar la cartelera del día |
| Antes de las 18:00 | Importar la grilla y mirarla en la app |
| Si llueve | Suspender de una sola vez, con el motivo |
| Durante la noche | Corregir horas sueltas; en Llamadas, cargar el atraso |
| Al otro día | Si hubo reprogramaciones, cargarlas en su fecha nueva |
