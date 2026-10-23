/**
 * Module sécurisé pour la gestion JWT
 * 
 * Valide et sécurise la configuration JWT_SECRET
 */

import jwt from 'jsonwebtoken'

/**
 * Récupère et valide le JWT_SECRET
 * @throws Error si le secret est invalide en production
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET doit être défini en production')
    }
    console.warn('⚠️  JWT_SECRET non défini, utilisation d\'un secret temporaire')
    console.warn('⚠️  ⚠️  ⚠️  NON SÉCURISÉ POUR LA PRODUCTION ⚠️  ⚠️  ⚠️')
    return 'dev-temp-secret-change-in-production'
  }
  
  // Vérifier les valeurs par défaut dangereuses
  const unsafeDefaults = ['dev', 'change_this', 'secret', 'password', 'test']
  if (unsafeDefaults.includes(secret.toLowerCase())) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET ne peut pas utiliser une valeur par défaut en production')
    }
    console.warn(`⚠️  JWT_SECRET utilise une valeur non sécurisée: "${secret}"`)
    console.warn('⚠️  Changez cette valeur avant de déployer en production')
  }
  
  // Vérifier la longueur minimale en production
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('JWT_SECRET doit faire au moins 32 caractères en production')
  }
  
  return secret
}

/**
 * Génère un token JWT
 */
export function signToken(payload: object, expiresIn: string | number = '7d'): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return jwt.sign(payload, getJwtSecret(), { expiresIn } as any)
}

/**
 * Vérifie et décode un token JWT
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, getJwtSecret())
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expiré')
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token invalide')
    }
    throw error
  }
}

/**
 * Décode un token sans vérification (pour debug uniquement)
 */
export function decodeToken(token: string): any {
  return jwt.decode(token)
}

