/**
 * RBAC (Role-Based Access Control) avancé avec permissions granulaires
 * 
 * Système de permissions basé sur le modèle Role/Permission/RolePermission
 * Permet des permissions fines par ressource et action
 */

import { PrismaClient, Role } from '@prisma/client'
import type { Request, Response, NextFunction } from 'express'
import prisma from './prisma.js'

// ============================================
// TYPES ET INTERFACES
// ============================================

export interface PermissionCheck {
  resource: string
  action: string
}

export interface Permission {
  resource: string
  action: string
}

export interface UserWithPermissions {
  id: string
  email: string
  role: Role
  permissions?: Permission[]
}

// ============================================
// PERMISSIONS PAR DÉFAUT PAR RÔLE
// ============================================

const DEFAULT_ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    // Toutes les permissions
    '*:*'
  ],
  PROGRAMMER: [
    'grid:read',
    'grid:create',
    'grid:update',
    'grid:delete',
    'grid:publish',
    'program:read',
    'program:create',
    'program:update',
    'program:delete',
    'category:read',
    'category:create',
    'category:update',
    'incident:read',
    'deviation:read',
    'ads:read',
    'report:read'
  ],
  PRODUCTION: [
    'grid:read',
    'program:read',
    'program:create',
    'program:update',
    'occurrence:read',
    'occurrence:status',
    'incident:read',
    'incident:create',
    'incident:update',
    'deviation:read',
    'deviation:create',
    'shiftlog:read',
    'shiftlog:create',
    'shiftlog:update'
  ],
  COMMERCIAL: [
    'grid:read',
    'program:read',
    'ads:read',
    'ads:create',
    'ads:update',
    'ads:delete'
  ],
  DIRECTION: [
    'grid:read',
    'program:read',
    'program:create',
    'program:update',
    'occurrence:read',
    'occurrence:status',
    'report:read',
    'audit:read'
  ],
  VIEWER: [
    'grid:read',
    'program:read'
  ],
  REGIE: [
    'grid:read',
    'program:read',
    'occurrence:read'
  ]
}

// ============================================
// INITIALISATION DES PERMISSIONS
// ============================================

/**
 * Initialise les permissions par défaut dans la base de données
 * À appeler au démarrage de l'application ou via un script de migration
 */
export async function initializePermissions(): Promise<void> {
  const permissions = [
    // Grids
    { name: 'grid:read', resource: 'grid', action: 'read', description: 'Lire les grilles' },
    { name: 'grid:create', resource: 'grid', action: 'create', description: 'Créer des grilles' },
    { name: 'grid:update', resource: 'grid', action: 'update', description: 'Modifier les grilles' },
    { name: 'grid:delete', resource: 'grid', action: 'delete', description: 'Supprimer les grilles' },
    { name: 'grid:publish', resource: 'grid', action: 'publish', description: 'Publier des grilles' },
    { name: 'grid:archive', resource: 'grid', action: 'archive', description: 'Archiver des grilles' },
    
    // Programs
    { name: 'program:read', resource: 'program', action: 'read', description: 'Lire les programmes' },
    { name: 'program:create', resource: 'program', action: 'create', description: 'Créer des programmes' },
    { name: 'program:update', resource: 'program', action: 'update', description: 'Modifier les programmes' },
    { name: 'program:delete', resource: 'program', action: 'delete', description: 'Supprimer les programmes' },
    { name: 'program:status', resource: 'program', action: 'status', description: 'Changer le statut opérationnel' },

    // Diffusions datées
    { name: 'occurrence:read', resource: 'occurrence', action: 'read', description: 'Lire les diffusions datées' },
    { name: 'occurrence:status', resource: 'occurrence', action: 'status', description: 'Changer le statut d’une diffusion datée' },
    
    // Categories
    { name: 'category:read', resource: 'category', action: 'read', description: 'Lire les catégories' },
    { name: 'category:create', resource: 'category', action: 'create', description: 'Créer des catégories' },
    { name: 'category:update', resource: 'category', action: 'update', description: 'Modifier les catégories' },
    { name: 'category:delete', resource: 'category', action: 'delete', description: 'Supprimer les catégories' },
    
    // Incidents
    { name: 'incident:read', resource: 'incident', action: 'read', description: 'Lire les incidents' },
    { name: 'incident:create', resource: 'incident', action: 'create', description: 'Créer des incidents' },
    { name: 'incident:update', resource: 'incident', action: 'update', description: 'Modifier les incidents' },
    
    // Deviations
    { name: 'deviation:read', resource: 'deviation', action: 'read', description: 'Lire les écarts' },
    { name: 'deviation:create', resource: 'deviation', action: 'create', description: 'Créer des écarts' },
    
    // Ads
    { name: 'ads:read', resource: 'ads', action: 'read', description: 'Lire les publicités' },
    { name: 'ads:create', resource: 'ads', action: 'create', description: 'Créer des publicités' },
    { name: 'ads:update', resource: 'ads', action: 'update', description: 'Modifier les publicités' },
    { name: 'ads:delete', resource: 'ads', action: 'delete', description: 'Supprimer les publicités' },
    
    // Shift Logs
    { name: 'shiftlog:read', resource: 'shiftlog', action: 'read', description: 'Lire les journaux de bord' },
    { name: 'shiftlog:create', resource: 'shiftlog', action: 'create', description: 'Créer des journaux de bord' },
    { name: 'shiftlog:update', resource: 'shiftlog', action: 'update', description: 'Modifier les journaux de bord' },
    
    // Reports
    { name: 'report:read', resource: 'report', action: 'read', description: 'Lire les rapports' },
    
    // Audit
    { name: 'audit:read', resource: 'audit', action: 'read', description: 'Lire les logs d\'audit' },
    
    // Users
    { name: 'user:read', resource: 'user', action: 'read', description: 'Lire les utilisateurs' },
    { name: 'user:create', resource: 'user', action: 'create', description: 'Créer des utilisateurs' },
    { name: 'user:update', resource: 'user', action: 'update', description: 'Modifier les utilisateurs' },
    { name: 'user:delete', resource: 'user', action: 'delete', description: 'Supprimer les utilisateurs' },
    
    // Notifications
    { name: 'notification:read', resource: 'notification', action: 'read', description: 'Lire les règles de notification' },
    { name: 'notification:create', resource: 'notification', action: 'create', description: 'Créer des règles de notification' },
    { name: 'notification:update', resource: 'notification', action: 'update', description: 'Modifier les règles de notification' },
    { name: 'notification:delete', resource: 'notification', action: 'delete', description: 'Supprimer les règles de notification' },
  ]

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm
    })
  }

  // Assigner les permissions par défaut aux rôles
  for (const [role, permissionNames] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    for (const permName of permissionNames) {
      if (permName === '*:*') {
        // Admin a toutes les permissions
        const allPerms = await prisma.permission.findMany()
        for (const perm of allPerms) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: role as Role,
                permissionId: perm.id
              }
            },
            update: {},
            create: {
              role: role as Role,
              permissionId: perm.id
            }
          })
        }
      } else {
        const perm = await prisma.permission.findUnique({ where: { name: permName } })
        if (perm) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: role as Role,
                permissionId: perm.id
              }
            },
            update: {},
            create: {
              role: role as Role,
              permissionId: perm.id
            }
          })
        }
      }
    }
  }
}

// ============================================
// VÉRIFICATION DES PERMISSIONS
// ============================================

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
export async function hasPermission(
  userId: string,
  resource: string,
  action: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || !user.isActive) {
    return false
  }

  // Admin a toutes les permissions
  if (user.role === 'ADMIN') {
    return true
  }

  // Vérifier les permissions via RolePermission (pas de relation directe sur User)
  
  // Trouver la permission spécifique
  const permission = await prisma.permission.findFirst({
    where: {
      OR: [
        { name: '*:*' }, // Permission globale
        { name: `${resource}:*` }, // Toutes les actions sur la ressource
        { resource, action } // Permission spécifique
      ]
    }
  })

  if (!permission) {
    return false
  }

  // Vérifier les permissions du rôle (globales)
  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      role: user.role,
      userId: null, // Permissions globales du rôle
      permissionId: permission.id
    },
    include: {
      permission: true
    }
  })

  if (rolePermissions.length > 0) {
    return true
  }

  // Vérifier les permissions spécifiques à l'utilisateur
  const userPermission = await prisma.permission.findFirst({
    where: {
      OR: [
        { name: '*:*' },
        { name: `${resource}:*` },
        { resource, action }
      ]
    }
  })

  if (userPermission) {
    const userPermissions = await prisma.rolePermission.findMany({
      where: {
        userId: userId,
        permissionId: userPermission.id
      },
      include: {
        permission: true
      }
    })

    if (userPermissions.length > 0) {
      return true
    }
  }

  return false
}

/**
 * Récupère toutes les permissions d'un utilisateur
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user || !user.isActive) {
    return []
  }

  if (user.role === 'ADMIN') {
    return ['*:*']
  }

  const rolePermissions = await prisma.rolePermission.findMany({
    where: {
      OR: [
        { role: user.role, userId: null as string | null },
        { userId: userId }
      ]
    },
    include: {
      permission: true
    }
  })

  return rolePermissions.map(rp => rp.permission.name)
}

// ============================================
// MIDDLEWARE EXPRESS
// ============================================

/**
 * Middleware pour vérifier une permission spécifique
 * Usage: router.post('/programs', checkPermission('program:create'), handler)
 */
export function checkPermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id

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
 * Middleware pour vérifier plusieurs permissions (OR)
 * Usage: checkAnyPermission(['program:create', 'program:update'])
 */
export function checkAnyPermission(permissions: PermissionCheck[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id

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

/**
 * Middleware pour vérifier toutes les permissions (AND)
 */
export function checkAllPermissions(permissions: PermissionCheck[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    for (const perm of permissions) {
      if (!(await hasPermission(userId, perm.resource, perm.action))) {
        return res.status(403).json({ 
          error: 'Permission refusée',
          required: `${perm.resource}:${perm.action}`
        })
      }
    }

    next()
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Vérifie si un utilisateur peut modifier une ressource
 * (créateur ou admin)
 */
export async function canModifyResource(
  userId: string,
  resourceType: string,
  resourceId: string,
  createdByField: string = 'createdBy'
): Promise<boolean> {
  // Admin peut tout modifier
  if (await hasPermission(userId, '*', '*')) {
    return true
  }

  // Vérifier si l'utilisateur est le créateur
  const modelMap: Record<string, any> = {
    'Program': prisma.program,
    'Grid': prisma.grid,
    'Incident': prisma.incident,
    'Deviation': prisma.deviation,
    'AdLog': prisma.adLog,
    'ShiftLog': prisma.shiftLog
  }

  const model = modelMap[resourceType]
  if (!model) {
    return false
  }

  const resource = await model.findUnique({
    where: { id: resourceId },
    select: { [createdByField]: true }
  })

  return resource?.[createdByField] === userId
}

