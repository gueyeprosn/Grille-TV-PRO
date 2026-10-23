/**
 * Middleware de gestion d'erreurs centralisé
 */

import type { Request, Response, NextFunction } from 'express'
import { AppError } from '../lib/errors.js'

/**
 * Middleware de gestion d'erreurs
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Erreur personnalisée AppError
  if (err instanceof AppError) {
    // Logger les erreurs de validation pour le débogage
    if (err.code === 'VALIDATION_ERROR') {
      console.error('❌ Erreur de validation:', {
        message: err.message,
        details: err.details,
        url: req.url,
        method: req.method,
        body: req.body
      })
    }
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
      timestamp: new Date().toISOString()
    })
  }
  
  // Erreur JWT
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: err.name === 'TokenExpiredError' ? 'Token expiré' : 'Token invalide',
      code: 'INVALID_TOKEN',
      timestamp: new Date().toISOString()
    })
  }
  
  // Erreur de validation Prisma
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'Erreur de validation des données',
      code: 'VALIDATION_ERROR',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
      timestamp: new Date().toISOString()
    })
  }
  
  // Erreur Prisma (contrainte unique, etc.)
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: 'Un enregistrement avec cette valeur existe déjà',
        code: 'DUPLICATE_ENTRY',
        timestamp: new Date().toISOString()
      })
    }
    if (prismaError.code === 'P2025') {
      return res.status(404).json({
        error: 'Enregistrement non trouvé',
        code: 'NOT_FOUND',
        timestamp: new Date().toISOString()
      })
    }
  }
  
  // Erreur inattendue
  console.error('❌ Erreur serveur:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query
  })
  
  res.status(500).json({
    error: 'Erreur serveur interne',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  })
}

/**
 * Wrapper pour async handlers (évite try/catch répétitifs)
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

