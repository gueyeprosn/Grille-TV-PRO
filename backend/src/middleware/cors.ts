/**
 * Middleware CORS sécurisé
 * 
 * Restreint les origines autorisées selon la configuration
 */

import cors from 'cors'
import type { Request } from 'express'

/**
 * Parse les origines autorisées depuis ALLOW_ORIGIN
 */
function getAllowedOrigins(): string[] {
  const allowOrigin = process.env.ALLOW_ORIGIN
  
  if (!allowOrigin) {
    // En développement, autoriser localhost par défaut
    if (process.env.NODE_ENV !== 'production') {
      return ['http://localhost:5173', 'http://localhost:3000']
    }
    // En production, exiger une configuration explicite
    throw new Error('ALLOW_ORIGIN doit être défini en production')
  }
  
  // Vérifier si '*' est utilisé (interdit en production)
  if (allowOrigin === '*') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ALLOW_ORIGIN ne peut pas être "*" en production')
    }
    console.warn('⚠️  CORS ouvert à toutes les origines (non sécurisé pour la production)')
    return ['*']
  }
  
  // Parser la liste d'origines (séparées par des virgules)
  return allowOrigin
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
}

const allowedOrigins = getAllowedOrigins()

/**
 * Middleware CORS sécurisé
 */
export const corsMiddleware = cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Autoriser les requêtes sans origine (mobile apps, Postman, curl, etc.)
    if (!origin) {
      return callback(null, true)
    }
    
    // Si '*' est autorisé (développement uniquement)
    if (allowedOrigins.includes('*')) {
      return callback(null, true)
    }
    
    // Vérifier si l'origine est dans la liste autorisée
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      const error = new Error(`Origin ${origin} not allowed by CORS`)
      console.warn(`🚫 CORS bloqué: ${origin}`)
      console.warn(`   Origines autorisées: ${allowedOrigins.join(', ')}`)
      callback(error)
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
})

