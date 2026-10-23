/**
 * Authentification V3 avec Prisma et RBAC
 * 
 * Remplace auth-v3.js avec support Prisma et permissions granulaires
 */

import type { Request, Response, NextFunction } from 'express'
import prisma from './lib/prisma.js'
import { signToken, verifyToken } from './lib/jwt.js'
import { hasPermission } from './lib/rbac.js'

// Extension de Request pour inclure user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string
        uid?: string
      }
    }
  }
}

/**
 * Middleware d'authentification V3 avec Prisma
 */
export async function ensureAuth(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null
  
  if (!token) {
    return res.status(401).json({ error: 'Missing token' })
  }
  
  let decoded: any
  try {
    decoded = verifyToken(token)
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  if (typeof decoded?.email !== 'string' || !decoded.email) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  let user
  try {
    user = await prisma.user.findUnique({ where: { email: decoded.email } })
  } catch {
    return res.status(503).json({ error: 'Base de données indisponible' })
  }

  if (!user) {
    return res.status(401).json({ error: 'Compte introuvable' })
  }
  if (!user.isActive) {
    return res.status(403).json({ error: 'Compte désactivé' })
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    uid: user.id
  }

  next()
}

/**
 * Vérifie que l'utilisateur a un des rôles requis (compatibilité)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({ 
        error: 'Accès refusé',
        required: roles,
        current: user?.role 
      })
    }
    next()
  }
}

/**
 * Vérifie une permission spécifique (nouveau système RBAC)
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const hasPerm = await hasPermission(userId, resource, action)

    if (!hasPerm) {
      return res.status(403).json({ 
        error: 'Permission refusée',
        required: `${resource}:${action}`
      })
    }

    next()
  }
}

/**
 * Vérifie plusieurs permissions (OR)
 */
export function requireAnyPermission(permissions: Array<{ resource: string; action: string }>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    for (const perm of permissions) {
      if (await hasPermission(userId, perm.resource, perm.action)) {
        return next()
      }
    }

    return res.status(403).json({ 
      error: 'Permission refusée',
      required: permissions.map(p => `${p.resource}:${p.action}`)
    })
  }
}

