import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { loadEnv } from 'vite'

const mode = process.argv[2] || 'development'
const projectRoot = process.cwd()
const outputFile = path.resolve(projectRoot, 'public', 'app-config.runtime.js')

const runtimeKeys = [
  'VITE_API_URL',
  'VITE_APP_NAME',
  'VITE_JITSI_DOMAIN',
  'VITE_REVERB_APP_KEY',
  'VITE_REVERB_HOST',
  'VITE_REVERB_PORT',
  'VITE_REVERB_SCHEME',
  'VITE_USE_MOCKS',
]

const env = loadEnv(mode, projectRoot, 'VITE_')
const runtimeConfig = Object.fromEntries(
  runtimeKeys.map((key) => [key, env[key] ?? ''])
)

const fileContents = `window.__APP_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)}\n`

await mkdir(path.dirname(outputFile), { recursive: true })
await writeFile(outputFile, fileContents, 'utf8')

console.log(`[runtime-config] ${path.relative(projectRoot, outputFile)} genere pour le mode "${mode}"`)
