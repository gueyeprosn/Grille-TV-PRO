// Wrapper de démarrage pour PM2.
//
// Lance l'API compilée avec node. L'ancienne version utilisait `require` dans
// un paquet déclaré `"type": "module"` — elle échouait donc sur
// « require is not defined » — et lançait `tsx watch` en production.
import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const backendDir = dirname(fileURLToPath(import.meta.url))
const serverPath = join(backendDir, 'dist', 'server.js')

if (!existsSync(serverPath)) {
  console.error("dist/server.js est absent. Lancez d'abord : npm run build")
  process.exit(1)
}

const child = spawn(process.execPath, [serverPath], {
  cwd: backendDir,
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'production' },
  stdio: 'inherit'
})

child.on('error', (err) => {
  console.error('Erreur démarrage:', err)
  process.exit(1)
})

child.on('exit', (code) => {
  console.log(`Processus terminé avec le code ${code}`)
  process.exit(code ?? 0)
})

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => child.kill(signal))
}
