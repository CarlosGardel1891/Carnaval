# iOS: de la Mac a TestFlight

Guía para compilar Carnavalero en la Mac del equipo y subir el primer build a TestFlight (decisión 82). Todo lo que acá dice «en Xcode» no se puede hacer desde Windows: `project.pbxproj` no se edita a mano.

## 1. Qué instalar en la Mac (una vez)

1. **Xcode 26** o posterior, desde el App Store de la Mac. Abrirlo una vez y aceptar que instale los componentes de iOS. Apple no acepta builds hechos con una versión anterior.
2. **Node 24**: `brew install node@24` (o con nvm: `nvm install 24`). Después, `corepack enable`.
3. **Git**, que viene con las herramientas de Xcode: `xcode-select --install`.
4. En Xcode → Settings → Accounts: agregar el Apple ID de la cuenta de Apple Developer.

No hace falta CocoaPods: el proyecto usa Swift Package Manager.

## 2. Traer el proyecto

```bash
git clone https://github.com/Emiliano-Vanzini/Carnaval.git
cd Carnaval
git checkout publicacion      # o develop, cuando la fase esté integrada
pnpm install
```

Crear `app/.env.beta` (no está en el repo) con los mismos valores que en la máquina de Windows: la dirección y la key pública del proyecto remoto, la key de MapTiler, `VITE_DEMO=1` y `VITE_AHORA` vacío.

## 3. Compilar la app web y pasarla a iOS

```bash
pnpm --filter app exec tsc -p tsconfig.json
pnpm --filter app exec vite build --mode beta
pnpm --filter app exec cap sync ios
pnpm --filter app ios:open        # abre el proyecto en Xcode
```

Para el build de producción, lo mismo con `--mode produccion` y `app/.env.produccion`.

## 4. En Xcode, la primera vez

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
   - En `app/.env.beta`, `VITE_PUSH_ENABLED=1`, y volver al paso 3.

## 5. Probar antes de subir

- Elegir un simulador de iPhone arriba y apretar ▶. Tiene que abrir en «Hoy» con la franja de versión de prueba.
- Con el iPhone conectado por cable, elegirlo arriba y apretar ▶ (la primera vez pide confiar en la Mac y activar el modo desarrollador en el teléfono).
- Recorrer la lista de `docs/QA.md`.

## 6. Subir a TestFlight

1. En [App Store Connect](https://appstoreconnect.apple.com) → Apps → **+** → *New App*: plataforma iOS, nombre **Carnavalero**, idioma principal español, bundle ID `uy.carnavalero.app`, SKU `carnavalero`.
2. En Xcode, elegir arriba **Any iOS Device (arm64)** → menú Product → **Archive**.
3. Cuando termina se abre el Organizer → *Distribute App* → **TestFlight & App Store** → *Distribute*.
4. En unos minutos el build aparece en App Store Connect → TestFlight. Gracias a `ITSAppUsesNonExemptEncryption` en `Info.plist`, no pregunta por el cifrado.
5. **Testers internos** (hasta 100, sin revisión): TestFlight → Internal Testing → crear un grupo y sumar a la gente del equipo, que tiene que estar en Users and Access.
6. **Testers externos** (los carnavaleros): TestFlight → External Testing → crear un grupo, sumar el build y completar *Test Information* (qué probar, mail de contacto). El primer build pasa por una revisión de beta; después se suma gente por mail o con un enlace público.

## 7. Para cada build nuevo

1. Subir `build` en `app/version.json` (y commitearlo).
2. Pasos de la sección 3.
3. En Xcode, poner el mismo número en *Build* y repetir Archive y Distribute.

## Si algo falla

- **«No signing certificate» o «No profiles»:** revisar que el Apple ID esté en Xcode → Settings → Accounts y que el equipo esté elegido en Signing & Capabilities.
- **El build no aparece en TestFlight:** llega un mail de Apple con el motivo. Lo más común es que falte un texto de permiso en `Info.plist` o que el número de build esté repetido.
- **«Missing privacy manifest» o «ITMS-91053»:** `PrivacyInfo.xcprivacy` no quedó dentro del target (paso 4.1).
- **Sin la Mac a mano:** Codemagic puede compilar y subir desde el repo (decisión 82); hay que configurarlo con una API key de App Store Connect.
