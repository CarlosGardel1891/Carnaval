#!/usr/bin/env node
// Arma el build de Android para una tienda (decisión 81):
//
//   pnpm android:release beta            AAB firmado para la prueba cerrada (con modo demostración)
//   pnpm android:release produccion      AAB firmado para producción
//   pnpm android:release beta --apk      APK firmado, para instalarlo en el emulador y probarlo
//   pnpm android:keystore                crea la clave de subida (una sola vez)
//
// Compila la app en ese modo (`app/.env.beta` o `app/.env.produccion`, fuera del repo),
// sincroniza Capacitor sin el permiso de http del Supabase local y corre Gradle. La firma sale
// de `~/.carnavalero/keystore.properties`: ni la clave ni sus contraseñas van en el repo.
// Necesita JAVA_HOME apuntando a un JDK 21 y ANDROID_HOME (ver CLAUDE.md).

import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appDir = path.join(repoRoot, 'app')
const androidDir = path.join(appDir, 'android')
const keyDir = path.join(os.homedir(), '.carnavalero')
const propsFile = process.env.CARNAVALERO_KEYSTORE_PROPS ?? path.join(keyDir, 'keystore.properties')
const isWindows = process.platform === 'win32'

function fail(message) {
  console.error(`android:release: ${message}`)
  process.exit(1)
}

function run(command, args, options = {}) {
  const env = { ...process.env, ...options.env }
  // Dentro de una sesión de Claude Code esta variable impide que cmd encuentre gradlew.bat.
  delete env.NoDefaultCurrentDirectoryInExePath
  delete env.CUERDA_LOCAL
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env,
    stdio: 'inherit',
    shell: isWindows,
  })
  if (result.status !== 0) fail(`falló «${command} ${args.join(' ')}».`)
}

function createKeystore() {
  const storeFile = path.join(keyDir, 'carnavalero-upload.jks')
  if (existsSync(storeFile) || existsSync(propsFile)) {
    fail(
      `ya hay una clave en ${keyDir}. No se pisa: si se perdió, se repone por el soporte de Google Play.`,
    )
  }
  mkdirSync(keyDir, { recursive: true })
  const password = randomBytes(24).toString('base64url')
  const keytool = process.env.JAVA_HOME
    ? path.join(process.env.JAVA_HOME, 'bin', isWindows ? 'keytool.exe' : 'keytool')
    : 'keytool'
  const result = spawnSync(
    keytool,
    [
      '-genkeypair',
      '-keystore',
      storeFile,
      '-storetype',
      'PKCS12',
      '-alias',
      'upload',
      '-keyalg',
      'RSA',
      '-keysize',
      '2048',
      '-validity',
      '10000',
      '-storepass',
      password,
      '-keypass',
      password,
      '-dname',
      'CN=Carnavalero, C=UY',
    ],
    { stdio: 'inherit' },
  )
  if (result.status !== 0) fail('keytool no pudo crear la clave (¿JAVA_HOME apunta a un JDK?).')
  writeFileSync(
    propsFile,
    [
      `storeFile=${storeFile.replaceAll('\\', '/')}`,
      `storePassword=${password}`,
      'keyAlias=upload',
      `keyPassword=${password}`,
      '',
    ].join('\n'),
  )
  console.log(`Clave de subida creada en ${keyDir}`)
  console.log('  carnavalero-upload.jks    la clave')
  console.log('  keystore.properties       su contraseña y su alias')
  console.log('Guardá una copia de los dos archivos en un lugar seguro, fuera del repo.')
}

const args = process.argv.slice(2)
if (args[0] === 'keystore') {
  createKeystore()
  process.exit(0)
}

const mode = args[0]
const apk = args.includes('--apk')
if (mode !== 'beta' && mode !== 'produccion') {
  fail('uso: pnpm android:release <beta|produccion> [--apk]   |   pnpm android:keystore')
}
if (!existsSync(path.join(appDir, `.env.${mode}`))) {
  fail(`falta app/.env.${mode} (copiá app/.env.example y poné los datos del proyecto remoto).`)
}
if (!existsSync(propsFile)) {
  fail(
    `falta la clave de subida (${propsFile}). Creala con «pnpm android:keystore» o recuperá la copia.`,
  )
}

const { version, build } = JSON.parse(readFileSync(path.join(appDir, 'version.json'), 'utf8'))
console.log(`Carnavalero ${version} (build ${build}), modo ${mode}`)

run('corepack', ['pnpm', '--filter', 'app', 'exec', 'tsc', '-p', 'tsconfig.json'])
run('corepack', ['pnpm', '--filter', 'app', 'exec', 'vite', 'build', '--mode', mode])
run('corepack', ['pnpm', '--filter', 'app', 'exec', 'cap', 'sync', 'android'])
run(
  isWindows ? path.join(androidDir, 'gradlew.bat') : './gradlew',
  [apk ? 'assembleRelease' : 'bundleRelease'],
  {
    cwd: androidDir,
  },
)

const output = apk
  ? path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk')
  : path.join(androidDir, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab')
if (!existsSync(output)) fail(`Gradle terminó pero no está ${output}.`)
console.log(`\nListo: ${output} (${(statSync(output).size / 1024 / 1024).toFixed(1)} MB)`)
