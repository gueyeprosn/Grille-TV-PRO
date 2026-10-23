/**
 * Audit Trail - Système de traçabilité complet
 * 
 * Enregistre automatiquement toutes les modifications dans la base de données
 * pour traçabilité et conformité
 */

import { Prisma, PrismaClient } from '@prisma/client'
import type { Request } from 'express'
import prisma from './prisma.js'

// ============================================
// TYPES ET INTERFACES
// ============================================

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'PUBLISH' | 'ARCHIVE' | 'STATUS_CHANGE' | 'LOGIN' | 'LOGOUT'

export interface AuditContext {
  userId?: string
  ipAddress?: string | undefined
  userAgent?: string | undefined
  metadata?: Record<string, any>
}

export interface AuditData {
  entityType: string
  entityId: string
  action: AuditAction
  before?: any
  after?: any
  changes?: any
  context?: AuditContext
}

export interface TransactionalAuditData {
  entityType: string
  entityId: string
  action: AuditAction
  userId: string
  before?: unknown
  after?: unknown
  ipAddress?: string | undefined
  userAgent?: string | undefined
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

/** Écrit l'audit dans la transaction métier ; l'opération échoue si sa trace ne peut pas être conservée. */
export async function writeAuditLogInTransaction(
  transaction: Prisma.TransactionClient,
  data: TransactionalAuditData
): Promise<void> {
  const changes: Record<string, { before: unknown; after: unknown }> = {}
  if (data.before && data.after && typeof data.before === 'object' && typeof data.after === 'object') {
    const beforeRecord = data.before as Record<string, unknown>
    const afterRecord = data.after as Record<string, unknown>
    const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)])
    for (const key of keys) {
      if (JSON.stringify(beforeRecord[key]) !== JSON.stringify(afterRecord[key])) {
        changes[key] = { before: beforeRecord[key], after: afterRecord[key] }
      }
    }
  }

  await transaction.auditLog.create({
    data: {
      entityType: data.entityType,
      entityId: data.entityId,
      action: data.action,
      userId: data.userId,
      ...(data.before !== undefined ? { before: toJsonValue(data.before) } : {}),
      ...(data.after !== undefined ? { after: toJsonValue(data.after) } : {}),
      ...(Object.keys(changes).length > 0 ? { changes: toJsonValue(changes) } : {}),
      ...(data.ipAddress ? { ipAddress: data.ipAddress } : {}),
      ...(data.userAgent ? { userAgent: data.userAgent } : {}),
    },
  })
}

// ============================================
// CALCUL DES CHANGEMENTS
// ============================================

/**
 * Calcule la différence entre deux objets
 */
function calculateChanges(before: any, after: any): Record<string, any> {
  const changes: Record<string, any> = {}
  const allKeys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})])

  for (const key of allKeys) {
    const beforeVal = before?.[key]
    const afterVal = after?.[key]

    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      changes[key] = {
        before: beforeVal,
        after: afterVal
      }
    }
  }

  return changes
}

// ============================================
// ENREGISTREMENT D'AUDIT
// ============================================

/**
 * Enregistre une entrée d'audit
 */
export async function logAudit(data: AuditData): Promise<void> {
  try {
    // Vérifier que le modèle auditLog existe
    if (!prisma || !prisma.auditLog || !prisma.auditLog.create) {
      console.warn('⚠️ Modèle auditLog non disponible - audit désactivé')
      return
    }

    const changes = data.before && data.after 
      ? calculateChanges(data.before, data.after)
      : null

    await prisma.auditLog.create({
      data: {
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        ...(data.context?.userId && { userId: data.context.userId }),
        ...(data.before && { before: JSON.parse(JSON.stringify(data.before)) }),
        ...(data.after && { after: JSON.parse(JSON.stringify(data.after)) }),
        ...(changes && { changes: JSON.parse(JSON.stringify(changes)) }),
        ...(data.context?.ipAddress && { ipAddress: data.context.ipAddress }),
        ...(data.context?.userAgent && { userAgent: data.context.userAgent }),
        ...(data.context?.metadata && { metadata: JSON.parse(JSON.stringify(data.context.metadata)) })
      }
    })
  } catch (error) {
    // Ne pas faire échouer l'opération principale si l'audit échoue
    // Mais logger l'erreur pour debugging
    console.error('Erreur lors de l\'enregistrement de l\'audit:', error)
  }
}

/**
 * Extrait le contexte depuis une requête Express
 */
export function getAuditContext(req: Request): AuditContext {
  const context: AuditContext = {
    metadata: {
      method: req.method,
      path: req.path,
      query: req.query,
      params: req.params
    }
  }
  if ((req as any).user?.id) {
    context.userId = (req as any).user.id
  }
  const ipAddress = req.ip || req.socket.remoteAddress
  if (ipAddress) {
    context.ipAddress = ipAddress
  }
  const userAgent = req.get('user-agent')
  if (userAgent) {
    context.userAgent = userAgent
  }
  return context
}

// ============================================
// HELPERS POUR ACTIONS SPÉCIFIQUES
// ============================================

export async function auditCreate(
  entityType: string,
  entityId: string,
  entity: any,
  context: AuditContext
): Promise<void> {
  await logAudit({
    entityType,
    entityId,
    action: 'CREATE',
    after: entity,
    context
  })
}

export async function auditUpdate(
  entityType: string,
  entityId: string,
  before: any,
  after: any,
  context: AuditContext
): Promise<void> {
  await logAudit({
    entityType,
    entityId,
    action: 'UPDATE',
    before,
    after,
    context
  })
}

export async function auditDelete(
  entityType: string,
  entityId: string,
  entity: any,
  context: AuditContext
): Promise<void> {
  await logAudit({
    entityType,
    entityId,
    action: 'DELETE',
    before: entity,
    context
  })
}

export async function auditStatusChange(
  entityType: string,
  entityId: string,
  before: any,
  after: any,
  context: AuditContext
): Promise<void> {
  await logAudit({
    entityType,
    entityId,
    action: 'STATUS_CHANGE',
    before,
    after,
    context
  })
}

export async function auditPublish(
  entityType: string,
  entityId: string,
  entity: any,
  context: AuditContext
): Promise<void> {
  await logAudit({
    entityType,
    entityId,
    action: 'PUBLISH',
    after: entity,
    context
  })
}

export async function auditArchive(
  entityType: string,
  entityId: string,
  entity: any,
  context: AuditContext
): Promise<void> {
  await logAudit({
    entityType,
    entityId,
    action: 'ARCHIVE',
    after: entity,
    context
  })
}

export async function auditLogin(
  userId: string,
  context: AuditContext
): Promise<void> {
  await logAudit({
    entityType: 'User',
    entityId: userId,
    action: 'LOGIN',
    context: { ...context, userId }
  })
}

export async function auditLogout(
  userId: string,
  context: AuditContext
): Promise<void> {
  await logAudit({
    entityType: 'User',
    entityId: userId,
    action: 'LOGOUT',
    context: { ...context, userId }
  })
}

// ============================================
// PRISMA MIDDLEWARE POUR AUDIT AUTOMATIQUE
// ============================================

/**
 * Configure Prisma pour enregistrer automatiquement les audits
 * À appeler une fois au démarrage de l'application
 */
export function setupPrismaAuditMiddleware() {
  // Note: Prisma n'a pas de middleware pour les opérations CRUD standard
  // L'audit doit être fait manuellement dans les fonctions de service
  // ou via des Prisma Extensions (disponible dans Prisma 5+)
  
  // Pour Prisma 5+, utiliser:
  // const prismaWithAudit = prisma.$extends(auditExtension)
  
  // Pour l'instant, utiliser les fonctions audit* manuellement
}

// ============================================
// REQUÊTES D'AUDIT
// ============================================

/**
 * Récupère les logs d'audit pour une entité
 */
export async function getEntityAuditLogs(
  entityType: string,
  entityId: string,
  limit: number = 50
) {
  return prisma.auditLog.findMany({
    where: {
      entityType,
      entityId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      }
    }
  })
}

/**
 * Récupère les logs d'audit pour un utilisateur
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 50
) {
  return prisma.auditLog.findMany({
    where: {
      userId
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      }
    }
  })
}

/**
 * Récupère les logs d'audit récents
 */
export async function getRecentAuditLogs(
  limit: number = 100,
  entityType?: string
) {
  const whereClause = entityType ? { entityType } : {}
  return prisma.auditLog.findMany({
    ...(Object.keys(whereClause).length > 0 && { where: whereClause }),
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true
        }
      }
    }
  })
}

