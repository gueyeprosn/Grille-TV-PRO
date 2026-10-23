/**
 * Serveur Express V4 avec Prisma, RBAC et Audit Trail
 * 
 * Remplace server.js avec:
 * - TypeScript
 * - Sécurité renforcée (Helmet, rate limiting)
 * - Support Prisma
 */

import express from 'express'
import morgan from 'morgan'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import apiV3Prisma from './api-v3-prisma.js'
import { securityHeaders, setupTrustProxy, generalLimiter } from './middleware/security.js'
import { corsMiddleware } from './middleware/cors.js'
import { errorHandler } from './middleware/errorHandler.js'
import { initializePermissions } from './lib/rbac.js'
import prisma from './lib/prisma.js'
import { initAlertSystem } from './alerts/alert-service.js'

dotenv.config()

const app = express()

// Obtenir le chemin du répertoire actuel
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Trust proxy (pour obtenir la vraie IP derrière un reverse proxy)
setupTrustProxy(app)

// Middleware de sécurité
app.use(securityHeaders)

// Body parser
app.use(express.json({ limit: '2mb' }))

// Logging
app.use(morgan('dev'))

// CORS sécurisé
app.use(corsMiddleware)

// Rate limiting global
app.use('/api', generalLimiter)
app.use('/grille/api', generalLimiter) // Support du base path /grille/

// Un poste de régie ne doit pas afficher l'API comme opérationnelle si la
// base qui porte la grille est indisponible.
const healthCheck = async (_req: express.Request, res: express.Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true, ts: Date.now(), database: 'connected', version: '4.0.0' })
  } catch {
    res.status(503).json({ ok: false, ts: Date.now(), database: 'disconnected', version: '4.0.0' })
  }
}
app.get('/api/health', healthCheck)
app.get('/grille/api/health', healthCheck)

// Les versions de contrat API restent indépendantes de la version produit V4.
// V3 est l’API active utilisée par le frontend. L’ancienne API /api reposait
// sur des fichiers JSON et exposait des lectures/imports sans authentification.
app.use('/api/v3', apiV3Prisma)
app.use('/grille/api/v3', apiV3Prisma)

const legacyApiDisabled: express.RequestHandler = (_req, res) => {
  res.status(410).json({
    error: 'API historique désactivée',
    message: 'Utilisez les routes /api/v3 protégées par authentification et permissions.',
  })
}
app.use('/api', legacyApiDisabled)
app.use('/grille/api', legacyApiDisabled)

// Servir les fichiers statiques du frontend (après les routes API)
const frontendDistPath = path.join(__dirname, '../../frontend/dist')
app.use(express.static(frontendDistPath))

// Pour toutes les routes non-API, servir index.html (SPA)
app.get('*', (req, res, next) => {
  // Ne pas intercepter les routes API
  if (req.path.startsWith('/api') || req.path.startsWith('/grille/api')) {
    return next()
  }
  // Servir index.html pour le routing côté client
  res.sendFile(path.join(frontendDistPath, 'index.html'))
})

// Gestion des erreurs (doit être le dernier middleware)
app.use(errorHandler)

// Initialisation au démarrage
async function initialize() {
  try {
    // Vérifier la connexion Prisma (optionnelle en mode développement local)
    try {
      await prisma.$connect()
      console.log('✅ Connexion PostgreSQL établie')

      // Synchroniser les permissions ajoutées par les évolutions du produit.
      // initializePermissions utilise des upserts non destructifs et préserve
      // les attributions personnalisées déjà enregistrées.
      await initializePermissions()
      console.log('✅ Permissions RBAC synchronisées')

      const { synchronizeAllProgramOccurrences } = await import('./lib/program-occurrences.js')
      await synchronizeAllProgramOccurrences()
      console.log('✅ Diffusions datées synchronisées')
    } catch (dbError: any) {
      console.warn('⚠️ Base de données PostgreSQL locale non disponible (vérifiez que PostgreSQL local est démarré):', dbError.message)
    }

    // Initialiser le système d'alertes broadcast
    try {
      initAlertSystem()
      console.log('✅ Système d\'alertes broadcast initialisé')
    } catch (error: any) {
      console.error('⚠️ Erreur initialisation alertes:', error.message)
      // Ne pas bloquer le démarrage si les alertes échouent
    }

    const port = process.env.PORT || 4000
    app.listen(port, () => {
      console.log(`✅ API démarrée sur http://localhost:${port}`)
      console.log(`   - API principale V3: /api/v3/*`)
      console.log(`   - API historique: désactivée (410 Gone)`)
      console.log(`   - Health: /api/health`)
    })
  } catch (error) {
    console.error('❌ Erreur initialisation:', error)
    process.exit(1)
  }
}

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
  console.log('\n🛑 Arrêt du serveur...')
  try { await prisma.$disconnect() } catch {}
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Arrêt du serveur...')
  try { await prisma.$disconnect() } catch {}
  process.exit(0)
})

// Démarrer le serveur (seulement si pas en mode test)
if (process.env.NODE_ENV !== 'test') {
  initialize()
}

export default app
