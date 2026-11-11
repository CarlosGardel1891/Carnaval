# Prompt · Fase 4 (Conjuntos, Seguir y push)

Pegalo en Claude Code abierto en esta carpeta.

```text
Fase 4 · Conjuntos, Seguir y push

Vamos con la Fase 4 de docs/PLAN.md: las fichas de conjuntos, el botón Seguir, el filtro «mis conjuntos» y los avisos push. Es lo que hace que la app avise sola: «tu conjunto actúa hoy a tal hora en tal lugar» y «se suspendió» o «cambió de hora». El plan la ubica del 24 al 30/11, pero vamos adelantados.

Arrancá desde develop (2752d52 o posterior) en una rama nueva, conjuntos-push, y pusheala después de cada commit. No toques main. Si algo de este prompt choca con docs/DECISIONES.md, docs/PLAN.md o CLAUDE.md, mandan ellos, en ese orden. Avisame del choque y seguí lo que dicen.

Con el primer commit, guardá este prompt en prompts/fase-4-conjuntos-y-push.md.

1. ANTES DE TOCAR CÓDIGO

Leé:
- docs/DECISIONES.md entero, en especial la 23 (auth anónima y límites por IP) y la 29 («mis conjuntos» y la sesión anónima pasan a esta fase).
- La Fase 4 de docs/PLAN.md, con sus pasos y su «Listo cuando». Mirá también qué dicen las fases 7 y 9 sobre suspender noches y operar en temporada, para no cerrarles el camino.
- CLAUDE.md y context.md.
- En la base: favoritos, dispositivos_push, mis_favoritos(), proximas_de_conjunto, registrar_dispositivo_push y el parámetro solo_favoritos de actuaciones_de_la_noche.
- En la app: la navegación, los hooks de datos, el cliente de Supabase y el pizarrón.

Después presentame un plan y esperá mi OK antes de escribir código. El plan tiene que incluir:
a) Las pantallas: la lista de conjuntos (búsqueda y filtros) y la ficha (datos, redes, próximas actuaciones y Seguir), y cómo entra la pestaña Conjuntos en la navegación.
b) La sesión anónima: cuándo se crea, cómo se guarda con @capacitor/preferences y qué pasa si se pierde. Propongo crearla recién con el primer «Seguir», para no gastar altas contra el límite por IP.
c) El permiso de notificaciones: cuándo se pide, qué pasa si se niega y cómo se maneja el permiso de Android 13 en adelante. Propongo pedirlo después del primer «Seguir», nunca al abrir la app.
d) El plugin de push y el camino de envío: FCM para Android y para iOS, o FCM para Android y APNs directo para iOS. Alternativas, recomendación y por qué, teniendo en cuenta que todavía no hay Mac.
e) Los avisos:
   - «Tu conjunto actúa hoy»: a qué hora se manda, si va uno por conjunto o agrupado, y qué pasa si el conjunto actúa en varios escenarios esa noche.
   - Cambio y suspensión: qué los dispara (trigger en la base, cola o llamada desde el admin), cómo se evita mandar uno por fila cuando se importa una grilla entera, y cómo se agrupan.
   - Cómo se evita mandar el mismo aviso dos veces.
   - Los textos, en español e inglés según el idioma del dispositivo.
   - Qué se hace con los tokens que FCM rechaza.
f) Los cambios de esquema que hagan falta (por ejemplo, un registro de avisos enviados o una cola), con su migración y sus tests en packages/db-tests.
g) Qué se puede probar sin Firebase y qué no.
h) La lista de pasos, uno por commit, con los que dependen de Firebase al final.

2. REGLAS DE ESTA FASE

- Todo lo que dependa de la hora o de «hoy» usa America/Montevideo y la noche lógica, también en las Edge Functions. Reusá la lógica de @cuerda/shared; si desde Deno no se puede importar, que haya un test que compare la copia con el original.
- «Seguir» no pide registro ni datos personales.
- Ningún texto va escrito directo en la interfaz ni en los avisos: todo pasa por i18n, en los dos idiomas.
- Nada de keys en el repo. La cuenta de servicio de Firebase va como secret de Supabase, y google-services.json y GoogleService-Info.plist no se commitean. Documentá en CLAUDE.md cómo se consiguen y dónde van, y actualizá .env.example.
- No registres la app en Firebase con el identificador provisional sin que te lo confirme: el identificador final todavía no está decidido.
- Las Edge Functions se prueban en local, con supabase functions serve. No despliegues nada en un proyecto remoto.
- Las funciones security definer nuevas reciben lo mínimo, usan auth.uid() y tienen search_path fijo, con tests de que un usuario no puede tocar lo de otro.

3. QUÉ TIENE QUE QUEDAR

Conjuntos:
- La lista, con búsqueda por nombre y alias comparando con norm(). Tiene que encontrar el texto escrito dentro del nombre, sin tolerancia a errores de tipeo.
- Filtro por categoría y marcas de «en concurso», «en Llamadas» y «pendiente de la Prueba», según conjunto_temporada.
- La ficha, con categoría, barrio, redes, foto si hay, próximas actuaciones (proximas_de_conjunto) y el botón Seguir. Muchos conjuntos no tienen barrio ni Instagram: que la ficha se vea bien igual.
- Desde el pizarrón, tocar un conjunto lleva a su ficha.

Seguir y «mis conjuntos»:
- Seguir y dejar de seguir responden en el momento y vuelven atrás si falla.
- El chip «mis conjuntos» en el pizarrón, con solo_favoritos. Sin conjuntos seguidos, un estado vacío que explique cómo seguir uno.
- Si se pierde la sesión, por ejemplo al reinstalar, la app no se rompe.

Push:
- El registro del dispositivo con registrar_dispositivo_push, con plataforma e idioma, al dar el permiso y cada vez que cambia el token.
- La Edge Function que manda «tu conjunto actúa hoy» y la que manda cambios y suspensiones. La lógica de quién recibe qué va separada del envío, para poder testearla sin Firebase.
- Al tocar un aviso, la app abre la ficha del conjunto o el pizarrón de esa noche.

4. FUERA DE ESTA FASE

Quedan afuera:
- Calendario.
- Modo Llamadas.
- Panel admin, incluido el botón «suspender noche».
- Proyecto remoto de Supabase.
- Publicación en tiendas.

Si algo de push necesita el proyecto remoto para probarse, anotalo como pendiente.

5. CÓMO TRABAJAR

- Cada paso del plan es un commit, en español.
- Antes de cada commit tienen que pasar los chequeos de CLAUDE.md y pnpm test:db. El CI sigue sin correr por la facturación de GitHub, así que mandan los chequeos locales.
- Tiene que haber tests de:
  - quién recibe cada aviso, con usuarios que siguen al conjunto y usuarios que no;
  - un conjunto que actúa en dos escenarios la misma noche;
  - una actuación que se suspende y otra que cambia de hora;
  - una grilla entera importada de una vez, que no dispara un aviso por fila;
  - el mismo aviso, que no se manda dos veces;
  - los textos de los avisos en español y en inglés;
  - las horas en Montevideo con el reloj del sistema en otra zona;
  - Seguir y dejar de seguir, y la RLS de favoritos con dos usuarios anónimos.
- Probalo en el navegador con pnpm dev y la grilla ficticia, y en el emulador de Android desde PowerShell. Cuando haya Firebase, probá un aviso real en el emulador.

Pará y preguntame si:
- aparece una decisión de producto que no está escrita;
- algo necesita una cuenta que todavía no existe;
- un paso se va a llevar mucho más de lo previsto.

6. LISTO CUANDO

Esto se suma al «Listo cuando» de PLAN.md:
- Con la grilla ficticia, seguir un conjunto lo hace aparecer en «mis conjuntos» y en el aviso del día que arma la Edge Function local.
- Suspender o cambiar una actuación genera un único aviso para quienes siguen al conjunto, en su idioma.
- Un usuario anónimo no ve ni toca los favoritos ni los dispositivos de otro.
- Negar el permiso de notificaciones no rompe nada: Seguir y «mis conjuntos» siguen andando.
- Toda la interfaz nueva y los avisos están en español y en inglés, y el test de claves de i18n pasa.
- Si ya hay Firebase, llega un aviso real al emulador de Android.
- docs/DECISIONES.md, docs/PLAN.md, CLAUDE.md, context.md y .env.example están al día.

Al terminar, pasame un resumen corto con:
- qué quedó hecho;
- qué decisiones se agregaron;
- qué quedó pendiente, separando lo que depende de cuentas (Firebase, Apple, Supabase remoto);
- qué necesita la Fase 5 que todavía falta.
```
