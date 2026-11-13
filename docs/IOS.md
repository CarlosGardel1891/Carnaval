# iOS: del repo al iPhone y a TestFlight

Guía para compilar Carnavalero en una Mac (decisión 82). La parte A es para **probarla en tu iPhone**, empezando de cero; la parte B, para subir un build a TestFlight. Todo lo que acá dice «en Xcode» no se puede hacer desde Windows: `project.pbxproj` no se edita a mano.

# A. Probarla en tu iPhone

Es el build de la **beta**: apunta al proyecto remoto y trae el modo demostración, así que se ve con contenido (una noche de ejemplo, con una franja que lo avisa). Los avisos push van apagados: no hace falta nada de Firebase.

## A1. Qué instalar en la Mac (una vez)

1. **Xcode**, desde el App Store de la Mac (para TestFlight tiene que ser la versión 26 o posterior). Abrirlo una vez y aceptar que instale los componentes de iOS. Tarda.
2. **Node 24**: bajar el instalador de macOS (LTS, v24) de <https://nodejs.org> y correrlo.
3. Abrir la app **Terminal** y correr, de a una:

```bash
xcode-select --install        # Git; si dice que ya está instalado, seguir
sudo corepack enable          # deja listo pnpm; pide la contraseña de la Mac
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install gh               # para bajar el repo, que es privado
```

Si al terminar de instalar Homebrew la Terminal muestra dos líneas para «agregar brew al PATH», copiarlas y correrlas antes del `brew install`.

No hace falta CocoaPods: el proyecto usa Swift Package Manager.

## A2. Bajar el repo

El repo es privado: hay que entrar a GitHub con la cuenta que tiene acceso.

```bash
gh auth login                 # GitHub.com → HTTPS → «Login with a web browser»
cd ~
gh repo clone Emiliano-Vanzini/Carnaval
cd Carnaval
pnpm install
```

`main` ya trae todo. La primera vez, `pnpm` puede preguntar si baja su versión: decir que sí.

## A3. El archivo de configuración

El único archivo que falta es `app/.env.beta`: no está en el repo. Lo más simple es **copiar el de la máquina de Windows** (`Carnaval\app\.env.beta`) a la misma carpeta en la Mac. Para armarlo a mano, crear `app/.env.beta` con esto:

```
VITE_SUPABASE_URL=https://rtogqxqyjsmiilmiuuxp.supabase.co
VITE_SUPABASE_ANON_KEY=<la publishable key, que empieza con sb_publishable_>
VITE_MAPTILER_KEY=
VITE_PUSH_ENABLED=
VITE_AHORA=
VITE_DEMO=1
VITE_SENTRY_DSN=
```

- La **publishable key** sale de <https://supabase.com/dashboard/project/rtogqxqyjsmiilmiuuxp/settings/api-keys> (la que dice *Publishable key*). Es la pública: va dentro de la app. **Nunca** poner acá la secret key (`sb_secret_…`) ni la service role.
- `VITE_MAPTILER_KEY` puede quedar vacía: los mapas muestran los marcadores sobre un fondo liso y avisan que falta. Cuando esté la key, va acá.
- `VITE_PUSH_ENABLED` vacío: avisos apagados. `VITE_SENTRY_DSN` vacío: sin reporte de errores.

Un archivo que empieza con punto no se ve en el Finder (Cmd + Shift + . los muestra). Desde la Terminal, parado en `Carnaval`: `nano app/.env.beta`, pegar, Ctrl + O, Enter, Ctrl + X.

## A4. Compilar y abrir en Xcode

```bash
pnpm --filter app ios:beta    # compila la beta y la pasa al proyecto de iOS
pnpm --filter app ios:open    # abre el proyecto en Xcode
```

Si el primer comando dice que el build «apunta a un Supabase local» o que faltan variables, el problema está en `app/.env.beta`.

## A5. En Xcode, la primera vez

1. Xcode → Settings → Accounts → **+** → agregar tu Apple ID. Para probar en tu propio iPhone alcanza con un Apple ID común; no hace falta la cuenta paga de Apple Developer.
2. En el panel izquierdo, tocar **App** (el ícono azul de arriba) → target **App** → pestaña **Signing & Capabilities** → marcar *Automatically manage signing* y elegir tu equipo en *Team*.
3. Si se queja de que el identificador `uy.carnavalero.app` no está disponible con tu equipo: usar el Apple ID de la cuenta de Apple Developer. No cambiar el identificador.

No hace falta commitear estos cambios para probar. Sin `GoogleService-Info.plist` la app abre igual: el plugin de avisos avisa en la consola de Xcode que Firebase no está configurado y sigue.

## A6. En el iPhone

1. Conectarlo a la Mac por cable, desbloquearlo y tocar **Confiar** en el cartel «¿Confiar en esta computadora?».
2. Activar el **Modo desarrollador**: Ajustes → Privacidad y seguridad → Modo desarrollador → activar. Pide reiniciar; al volver, confirmar. (La opción aparece recién después de conectar el iPhone a Xcode una vez.)
3. La primera vez que se instala con un Apple ID común, la app no abre hasta confiar en el desarrollador: Ajustes → General → VPN y gestión de dispositivos → tocar tu Apple ID → **Confiar**.

## A7. Correrla

1. En Xcode, arriba al centro, elegir tu iPhone como destino (en lugar de un simulador).
2. Apretar ▶. La primera vez tarda varios minutos: baja los paquetes y prepara el iPhone.
3. Tiene que abrir en «Hoy», con la franja de versión de prueba y la noche de ejemplo.

Con un Apple ID común la app instalada dura 7 días: después hay que volver a apretar ▶.

## A8. Para probar una versión nueva

```bash
cd ~/Carnaval
git pull
pnpm install
pnpm --filter app ios:beta
```

Y ▶ en Xcode.

## Qué mirar en el iPhone

- **Barra de estado:** en las pestañas con encabezado azul, el degradé llega hasta arriba y la hora y la batería se ven en blanco; en las pantallas de fondo claro, en oscuro.
- **Vibración:** al tocar **Seguir** en la ficha de un conjunto.
- **Compartir:** el botón de arriba a la derecha en la ficha de un conjunto abre la hoja de compartir del iPhone.
- **Idioma:** cambiar el idioma del iPhone a inglés y volver a la app: tiene que pasar a inglés sin reinstalar.
- **Modo oscuro:** con el iPhone en modo oscuro, la app se ve igual.
- El resto, con la lista de `docs/QA.md`.

# B. Subir a TestFlight

Antes, los pasos A1 a A4. Para el build de producción, en vez de `ios:beta`:

```bash
pnpm --filter app exec tsc -p tsconfig.json
pnpm --filter app exec vite build --mode produccion    # con app/.env.produccion
pnpm --filter app exec cap sync ios
```

## B1. En Xcode, la primera vez

Estos pasos cambian el proyecto: al terminar, **commitear `app/ios/`** para que queden.

1. **Sumar los archivos que ya están en la carpeta.** En el panel izquierdo, clic derecho en la carpeta `App` (la de adentro, donde está `Info.plist`) → *Add Files to "App"…* → elegir `PrivacyInfo.xcprivacy`, `es.lproj` y `en.lproj` → dejar marcado el target **App** y sin marcar *Copy items if needed*.
   - `PrivacyInfo.xcprivacy` es el manifest de privacidad que exige Apple.
   - `es.lproj/InfoPlist.strings` y `en.lproj/InfoPlist.strings` traducen el texto del permiso de ubicación. Si Xcode pregunta por los idiomas, aceptar español e inglés (Project → Info → Localizations tiene que listar los dos).
2. **Sólo iPhone** (decisión 50): target **App** → General → Supported Destinations → quitar iPad y Mac. Si no, Apple pide capturas de iPad.
3. **Firma:** target **App** → Signing & Capabilities → marcar *Automatically manage signing* y elegir el equipo de la cuenta de Apple Developer. El identificador tiene que ser `uy.carnavalero.app`.
4. **Versión:** target **App** → General → Identity → *Version* `1.0.0` y *Build* el mismo número que `build` en `app/version.json`. El build tiene que subir en cada envío.
5. **Avisos push** (sólo cuando esté Firebase; el primer build de TestFlight puede ir sin esto):
   - Signing & Capabilities → *+ Capability* → **Push Notifications**.
   - *Add Files to "App"…* → `GoogleService-Info.plist` (bajado de Firebase; no va al repo).
   - En Firebase Console → Project settings → Cloud Messaging → subir la key de APNs (se crea en developer.apple.com → Keys).
   - En `app/.env.beta`, `VITE_PUSH_ENABLED=1`, y volver a compilar (A4).

## B2. Probar antes de subir

- Elegir un simulador de iPhone arriba y apretar ▶. Tiene que abrir en «Hoy» con la franja de versión de prueba.
- En el iPhone: pasos A6 y A7.
- Recorrer la lista de `docs/QA.md`.

## B3. Subir a TestFlight

1. En [App Store Connect](https://appstoreconnect.apple.com) → Apps → **+** → *New App*: plataforma iOS, nombre **Carnavalero**, idioma principal español, bundle ID `uy.carnavalero.app`, SKU `carnavalero`.
2. En Xcode, elegir arriba **Any iOS Device (arm64)** → menú Product → **Archive**.
3. Cuando termina se abre el Organizer → *Distribute App* → **TestFlight & App Store** → *Distribute*.
4. En unos minutos el build aparece en App Store Connect → TestFlight. Gracias a `ITSAppUsesNonExemptEncryption` en `Info.plist`, no pregunta por el cifrado.
5. **Testers internos** (hasta 100, sin revisión): TestFlight → Internal Testing → crear un grupo y sumar a la gente del equipo, que tiene que estar en Users and Access.
6. **Testers externos** (los carnavaleros): TestFlight → External Testing → crear un grupo, sumar el build y completar *Test Information* (qué probar, mail de contacto). El primer build pasa por una revisión de beta; después se suma gente por mail o con un enlace público.

## B4. Para cada build nuevo

1. Subir `build` en `app/version.json` (y commitearlo).
2. Volver a compilar (A4).
3. En Xcode, poner el mismo número en *Build* y repetir Archive y Distribute.

## Si algo falla

- **La app se cierra apenas abre en el iPhone:** falta confiar en el desarrollador (A6, paso 3) o venció la semana de la firma con Apple ID común: volver a apretar ▶.
- **«No signing certificate» o «No profiles»:** revisar que el Apple ID esté en Xcode → Settings → Accounts y que el equipo esté elegido en Signing & Capabilities.
- **El build no aparece en TestFlight:** llega un mail de Apple con el motivo. Lo más común es que falte un texto de permiso en `Info.plist` o que el número de build esté repetido.
- **«Missing privacy manifest» o «ITMS-91053»:** `PrivacyInfo.xcprivacy` no quedó dentro del target (paso B1.1).
- **Sin la Mac a mano:** Codemagic puede compilar y subir desde el repo (decisión 82); hay que configurarlo con una API key de App Store Connect.
