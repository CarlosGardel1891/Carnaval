/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { releaseEnvProblems } from './src/lib/releaseEnv.ts'

const appRoot = path.dirname(fileURLToPath(import.meta.url))

// La versión visible y el número de build salen de un solo lugar (decisión 81): también los
// lee `android/app/build.gradle`.
const appVersion = JSON.parse(readFileSync(path.join(appRoot, 'version.json'), 'utf8')) as {
  version: string
  build: number
}

/** Frena un build de tienda (`beta` o `produccion`) que saldría mal apuntado (decisión 81). */
function releaseGuard(): Plugin {
  return {
    name: 'carnavalero-release-guard',
    config(_config, { command, mode }) {
      if (command !== 'build') return
      const problems = releaseEnvProblems(mode, loadEnv(mode, appRoot, 'VITE_'))
      if (problems.length > 0) {
        throw new Error(
          `No se puede compilar en modo «${mode}»: ${problems.join('; ')}. Revisá app/.env.${mode}.`,
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [releaseGuard(), react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion.version),
    __APP_BUILD__: JSON.stringify(appVersion.build),
  },
  server: { port: 5173 },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
