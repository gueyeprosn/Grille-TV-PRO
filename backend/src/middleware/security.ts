/**
 * Middleware de sécurité pour Express
 * 
 * Ajoute helmet et rate limiting pour protéger l'API
 */

import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import type { Request, Response } from 'express'

// ============================================
// HELMET - Headers de sécurité
// ============================================

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
})

// ============================================
// RATE LIMITING
// ============================================

/**
 * Rate limiter général pour toutes les routes
 */
// Rate limiter général - augmenté pour éviter les 429
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limite chaque IP à 1000 requêtes par fenêtre (augmenté de 500 à 1000)
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Ignorer le rate limiting pour les health checks
    return req.path === '/health' || req.path === '/api/health'
  },
  // Permettre de réinitialiser le compteur après un certain temps
  skipFailedRequests: false,
})

/**
 * Rate limiter strict pour l'authentification
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limite à 50 tentatives de connexion (augmenté pour éviter les blocages)
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.',
  skipSuccessfulRequests: true, // Ne pas compter les connexions réussies
  standardHeaders: true,
  legacyHeaders: false,
  // Permettre plus de tentatives pour éviter les blocages
  skipFailedRequests: false,
})

/**
 * Rate limiter pour les opérations d'écriture
 */
export const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limite à 30 opérations d'écriture par minute
  message: 'Trop d\'opérations d\'écriture, veuillez ralentir.',
  standardHeaders: true,
  legacyHeaders: false,
})

/**
 * Rate limiter pour les exports
 */
export const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 10, // Limite à 10 exports par heure
  message: 'Trop d\'exports, veuillez réessayer plus tard.',
  standardHeaders: true,
  legacyHeaders: false,
})

// ============================================
// TRUST PROXY
// ============================================

/**
 * Configure Express pour faire confiance aux proxies
 * Nécessaire pour obtenir la vraie IP du client derrière un reverse proxy
 */
export function setupTrustProxy(app: any) {
  app.set('trust proxy', 1) // Faire confiance au premier proxy
}

