/**
 * API V3 avec Prisma, RBAC et Audit Trail
 * 
 * Remplace api-v3.js avec:
 * - Prisma comme source de vérité
 * - RBAC avancé avec permissions granulaires
 * - Audit trail automatique
 * - Sécurité renforcée (rate limiting)
 */

import { Router, type Request, type Response } from 'express'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import prisma from './lib/prisma.js'
import { generateGridTemplate, listAvailableAiModels, OpenCodeRequestError, validateSuggestedPrograms } from './lib/opencode-template.js'

import * as store from './store-v3-prisma.js'
import { signToken } from './lib/jwt.js'
import { ensureAuth, requireRole, requirePermission, requireAnyPermission } from './auth-v3-prisma.js'
import { auditCreate, auditUpdate, auditDelete, auditPublish, auditArchive, auditStatusChange, auditLogin, getAuditContext, writeAuditLogInTransaction } from './lib/audit.js'
import { synchronizeGridOccurrences, synchronizeProgramOccurrences } from './lib/program-occurrences.js'
// @ts-ignore - telegram-notifier.js est un fichier legacy JS
import { notifyTelegram } from './telegram-notifier.js'
// Système d'alertes broadcast
import { sendOnAirAlert, sendAnomalyAlert } from './alerts/index.js'
import { generalLimiter, authLimiter, writeLimiter } from './middleware/security.js'
import { asyncHandler } from './middleware/errorHandler.js'
import {
  validateCreateGrid,
  validateUpdateGrid,
  validateGridIdParam,
  validateCreateProgram,
  validateUpdateProgram,
  validateOccurrenceStatus,
  validateCreateIncident,
  validateCreateDeviation,
  validateCreateAdLog,
  validateCreateShiftLog,
  validateCreateNotificationRule,
  validateUpdateNotificationRule,
  handleValidationErrors
} from './middleware/validation.js'
import { parsePagination, createPaginatedResult, getSkip } from './lib/pagination.js'
import { getCached, invalidateCache } from './lib/cache.js'
import { calculateOnAirStatusForPrograms, mapOpStatusToFrontend } from './lib/onAirCalculator.js'

// Helper pour valider les paramètres
function requireParam(param: string | undefined, name: string): string {
  if (!param) {
    throw new Error(`${name} requis`)
  }
  return param
}

const router = Router()

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date
}

function dateOnlyUtcNow(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

// ============================================
// AUTH LOCAL - Endpoint pour authentification locale (email/password)
// ============================================
router.post('/auth/local-login', authLimiter, async (req: Request, res: Response) => {
  const { email, password } = req.body
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }

  try {
    let user
    try {
      user = await prisma.user.findUnique({
        where: { email }
      })
    } catch {
      return res.status(503).json({ error: 'Base de données indisponible' })
    }
    
    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    // Vérifier si l'utilisateur a un mot de passe (authentification locale)
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Ce compte ne possède pas de mot de passe local. Demandez à l’administrateur de configurer un accès local.' })
    }

    // Vérifier le mot de passe
    const passwordMatch = await bcrypt.compare(password, user.passwordHash)
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    const auditContext = getAuditContext(req)
    auditContext.userId = user.id
    await auditLogin(user.id, auditContext)

    // Générer un JWT
    const token = signToken({
      email: user.email,
      uid: user.id,
      role: user.role,
    })

    res.json({ 
      token, 
      user: { 
        email: user.email, 
        displayName: user.displayName || user.email,
        role: user.role, 
        id: user.id 
      } 
    })
  } catch (error: any) {
    console.error('Erreur auth locale:', error)
    res.status(500).json({ error: 'Erreur authentification' })
  }
})

// ============================================
// GRIDS
// ============================================
router.get('/grids/default', generalLimiter, ensureAuth, requirePermission('grid', 'read'), asyncHandler(async (req: Request, res: Response) => {
  const { getDefaultGrid } = await import('./store-v3-prisma.js')
  const defaultGrid = await getDefaultGrid()
  
  if (!defaultGrid) {
    return res.status(404).json({ error: 'Aucune grille par défaut définie' })
  }
  
  res.json(defaultGrid)
}))

router.get('/grids',
  generalLimiter,
  ensureAuth,
  requirePermission('grid', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const grids = await store.getGrids()
    console.log('📋 API /grids - Grilles retournées:', grids.length)
    console.log('⭐ Grilles par défaut:', grids.filter((g: any) => g.isDefault === true))
    res.json(grids)
  })
)

router.get('/grids/:id', generalLimiter, ensureAuth, requirePermission('grid', 'read'), async (req: Request, res: Response) => {
  const gridId = requireParam(req.params.id, "ID")
  if (!gridId) return res.status(400).json({ error: 'ID de grille requis' })
  const grid = await store.getGrid(gridId)
  if (!grid) return res.status(404).json({ error: 'Grille non trouvée' })
  res.json(grid)
})

router.post('/grids',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('grid', 'create'),
  validateCreateGrid,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const grid = {
      id: nanoid(),
      ...req.body,
      status: req.body.status || 'DRAFT',
      createdBy: req.user!.id,
    }
    
    const saved = await prisma.$transaction(async (transaction) => {
      const created = await store.saveGrid(grid, transaction)
      await writeAuditLogInTransaction(transaction, {
        entityType: 'Grid',
        entityId: created.id,
        action: 'CREATE',
        userId: req.user!.id,
        after: created,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      })
      return created
    })
    
    await notifyTelegram('GRID_CREATED', { grid: saved })
    
    // Invalider le cache des grilles
    await invalidateCache('grids:*')
    
    res.json(saved)
  })
)

router.put('/grids/:id',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('grid', 'update'),
  validateUpdateGrid,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const gridId = requireParam(req.params.id, 'ID de grille')
    const result = await prisma.$transaction(async (transaction) => {
      const before = await transaction.grid.findUnique({ where: { id: gridId } })
      if (!before) return null
      const grid = { ...before, ...req.body, id: gridId, createdBy: before.createdBy }
      const after = await store.saveGrid(grid, transaction)
      await synchronizeGridOccurrences(transaction, gridId)
      await writeAuditLogInTransaction(transaction, {
        entityType: 'Grid',
        entityId: gridId,
        action: 'UPDATE',
        userId: req.user!.id,
        before,
        after,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      })
      return after
    })
    if (!result) return res.status(404).json({ error: 'Grille non trouvée' })
    const after = result
    
    await notifyTelegram('GRID_UPDATED', { grid: after })
    res.json(after)
  })
)

router.post('/grids/:id/publish', generalLimiter, writeLimiter, ensureAuth, requirePermission('grid', 'publish'), async (req: Request, res: Response) => {
  try {
    const gridId = requireParam(req.params.id, 'ID de grille')
    const existing = await store.getGrid(gridId)
    if (!existing) return res.status(404).json({ error: 'Grille non trouvée' })
    
    const before = { ...existing }
    const grid = { ...existing, status: 'PUBLISHED', publishedAt: new Date().toISOString() }
    const after = await store.saveGrid(grid)
    
    // Audit trail
    await auditPublish('Grid', gridId, after, getAuditContext(req))
    
    await notifyTelegram('GRID_PUBLISHED', { grid: after })
    res.json(after)
  } catch (error: any) {
    console.error('Erreur publication grille:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/grids/:id/archive', generalLimiter, writeLimiter, ensureAuth, requirePermission('grid', 'archive'), async (req: Request, res: Response) => {
  try {
    const gridId = requireParam(req.params.id, 'ID de grille')
    const existing = await store.getGrid(gridId)
    if (!existing) return res.status(404).json({ error: 'Grille non trouvée' })
    
    const before = { ...existing }
    const grid = { ...existing, status: 'ARCHIVED', archivedAt: new Date().toISOString() }
    const after = await store.saveGrid(grid)
    
    // Audit trail
    await auditArchive('Grid', gridId, after, getAuditContext(req))
    
    res.json(after)
  } catch (error: any) {
    console.error('Erreur archivage grille:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/grids/:id/set-default', generalLimiter, writeLimiter, ensureAuth, requirePermission('grid', 'update'), async (req: Request, res: Response) => {
  try {
    const gridId = requireParam(req.params.id, 'ID de grille')
    const existing = await store.getGrid(gridId)
    if (!existing) return res.status(404).json({ error: 'Grille non trouvée' })
    
    // Désactiver toutes les autres grilles par défaut
    const prisma = (await import('./lib/prisma.js')).default
    await prisma.grid.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    })
    
    // Définir cette grille comme par défaut
    const updated = await prisma.grid.update({
      where: { id: gridId },
      data: { isDefault: true }
    })
    
    // Audit trail
    await auditUpdate('Grid', gridId, existing, { ...existing, isDefault: true }, getAuditContext(req))
    
    res.json(updated)
  } catch (error: any) {
    console.error('Erreur définition grille par défaut:', error)
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Grille non trouvée' })
    }
    res.status(500).json({ error: error.message || 'Erreur lors de la définition de la grille par défaut' })
  }
})

router.delete('/grids/:id', generalLimiter, writeLimiter, ensureAuth, requirePermission('grid', 'delete'), async (req: Request, res: Response) => {
  try {
    const gridId = requireParam(req.params.id, 'ID de grille')
    const archived = await prisma.$transaction(async (transaction) => {
      const before = await transaction.grid.findUnique({ where: { id: gridId } })
      if (!before) return null
      const after = await transaction.grid.update({
        where: { id: gridId },
        data: { status: 'ARCHIVED', archivedAt: new Date(), isDefault: false },
      })
      await writeAuditLogInTransaction(transaction, {
        entityType: 'Grid',
        entityId: gridId,
        action: 'ARCHIVE',
        userId: req.user!.id,
        before,
        after,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      })
      return after
    })
    if (!archived) return res.status(404).json({ error: 'Grille non trouvée' })
    res.json({ ok: true, archived: true })
  } catch (error: any) {
    console.error('Erreur suppression grille:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/grids/import', generalLimiter, writeLimiter, ensureAuth, requirePermission('grid', 'create'), async (req: Request, res: Response) => {
  try {
    const { grid, programs = [] } = req.body
    
    if (!grid || !grid.id) {
      return res.status(400).json({ error: 'Format invalide : propriété "grid" requise' })
    }

    // Vérifier si la grille existe
    const existing = await store.getGrid(grid.id)
    if (existing && !req.body.overwrite) {
      return res.status(409).json({ error: 'Grille existe déjà. Utilisez overwrite: true' })
    }

    // Sauvegarder la grille
    const gridToSave = {
      ...grid,
      createdBy: req.user!.id,
      status: grid.status || 'DRAFT'
    }
    const savedGrid = await prisma.$transaction(async (transaction) => {
      const saved = await store.saveGrid(gridToSave, transaction)
      await writeAuditLogInTransaction(transaction, {
        entityType: 'Grid',
        entityId: saved.id,
        action: 'CREATE',
        userId: req.user!.id,
        after: saved,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      })
      return saved
    })

    // Importer les programmes
    let imported = 0
    let skipped = 0

    for (const program of programs) {
      const existing = await store.getProgram(program.id)
      if (existing && !req.body.overwrite) {
        skipped++
        continue
      }

      const programToSave = {
        ...program,
        id: program.id || nanoid(),
        gridId: grid.id,
        startTime: program.startTime || program.start,
        endTime: program.endTime || program.end,
        durationMin: program.durationMin || program.duration,
        type: program.type || program.typeDiffusion || 'PAD',
        opStatus: program.opStatus || 'PLANNED',
        adsRequired: program.adsRequired || false,
        createdBy: req.user!.id,
      }

      const saved = await prisma.$transaction(async (transaction) => {
        const created = await store.saveProgram(programToSave, transaction)
        await synchronizeProgramOccurrences(transaction, created.id)
        await writeAuditLogInTransaction(transaction, {
          entityType: 'Program',
          entityId: created.id,
          action: 'CREATE',
          userId: req.user!.id,
          after: created,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        })
        return created
      })
      
      imported++
    }

    await notifyTelegram('GRID_IMPORTED', { grid: savedGrid, imported, skipped })
    
    res.json({
      ok: true,
      grid: savedGrid,
      programs: { imported, skipped, total: programs.length },
    })
  } catch (error: any) {
    console.error('Erreur import grille:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// PROGRAMS
// ============================================
router.get('/grids/:gridId/programs',
  generalLimiter,
  ensureAuth,
  requirePermission('program', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const pagination = parsePagination(req.query)
    
    // Utiliser le cache si disponible
    const cacheKey = `programs:grid:${requireParam(req.params.gridId, "ID de grille")}:page:${pagination.page}:limit:${pagination.limit}`
    
    const result = await getCached(
      cacheKey,
      async () => {
        const programs = await store.getPrograms(requireParam(req.params.gridId, "ID de grille"))
        
        // Calculer automatiquement le statut ON_AIR pour chaque programme
        const programsWithOnAir = calculateOnAirStatusForPrograms(
          programs.map((p: any) => ({
            startTime: p.startTime,
            endTime: p.endTime,
            days: p.days,
            opStatus: p.opStatus
          }))
        )
        
        // Mapper les statuts Prisma vers les statuts frontend et mettre à jour
        const programsWithCalculatedStatus = programs.map((p: any, index: number) => {
          const calculated = programsWithOnAir[index]
          if (!calculated) {
            return p
          }
          // Si le statut calculé est différent du statut actuel, le mettre à jour
          // (sauf si c'est un override manuel par ADMIN - à gérer côté frontend)
          const shouldUpdate = calculated.calculatedOpStatus !== p.opStatus
          
          return {
            ...p,
            opStatus: shouldUpdate ? calculated.calculatedOpStatus : p.opStatus,
            // Ajouter le statut frontend pour compatibilité
            opStatusFrontend: mapOpStatusToFrontend(shouldUpdate ? calculated.calculatedOpStatus : p.opStatus)
          }
        })
        
        return {
          data: programsWithCalculatedStatus,
          total: programsWithCalculatedStatus.length
        }
      },
      60 // Cache 1 minute (plus court pour refléter les changements ON_AIR en temps réel)
    )
    
    // Paginer les résultats
    const skip = getSkip(pagination.page!, pagination.limit!)
    const paginatedData = result.data.slice(skip, skip + pagination.limit!)
    
    res.json(createPaginatedResult(paginatedData, result.total, pagination))
  })
)

router.get('/grids/:gridId/occurrences',
  generalLimiter,
  ensureAuth,
  requirePermission('occurrence', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const gridId = requireParam(req.params.gridId, 'ID de grille')
    const from = parseDateOnly(req.query.from)
    const to = parseDateOnly(req.query.to)
    if (!from || !to || from > to) {
      return res.status(400).json({ error: 'Les paramètres from et to doivent être des dates valides au format YYYY-MM-DD.' })
    }
    const dayCount = Math.floor((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1
    if (dayCount > 31) {
      return res.status(400).json({ error: 'La période demandée ne peut pas dépasser 31 jours.' })
    }

    const occurrences = await prisma.programOccurrence.findMany({
      where: {
        serviceDate: { gte: from, lte: to },
        program: { gridId, archivedAt: null },
      },
      orderBy: [{ serviceDate: 'asc' }, { startTimeSnapshot: 'asc' }],
      select: {
        id: true,
        programId: true,
        serviceDate: true,
        titleSnapshot: true,
        startTimeSnapshot: true,
        endTimeSnapshot: true,
        durationMinSnapshot: true,
        status: true,
        updatedAt: true,
      },
    })
    res.json(occurrences)
  })
)

router.get('/programs/:id', generalLimiter, ensureAuth, requirePermission('program', 'read'), async (req: Request, res: Response) => {
  try {
    const program = await store.getProgram(requireParam(req.params.id, "ID"))
    if (!program) return res.status(404).json({ error: 'Programme non trouvé' })
    res.json(program)
  } catch (error: any) {
    console.error('Erreur programme:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/grids/:gridId/programs',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('program', 'create'),
  validateCreateProgram,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const gridId = requireParam(req.params.gridId, "ID de grille")
    console.error('[BACKEND] 📤 Création programme - Données reçues:', JSON.stringify({
      gridId,
      title: req.body.title,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      days: req.body.days,
      daysType: typeof req.body.days?.[0],
      userId: req.user!.id
    }))
    
    const program = {
      id: nanoid(),
      gridId,
      opStatus: 'DRAFT', // Utiliser DRAFT (valeur Prisma) au lieu de PLANNED
      adsRequired: false,
      createdBy: req.user!.id,
      ...req.body,
    }
    
    console.error('[BACKEND] 💾 Sauvegarde programme dans Prisma:', JSON.stringify({
      id: program.id,
      title: program.title,
      gridId: program.gridId,
      startTime: program.startTime,
      endTime: program.endTime,
      days: program.days
    }))
    
    try {
      const saved = await prisma.$transaction(async (transaction) => {
        const created = await store.saveProgram(program, transaction)
        await writeAuditLogInTransaction(transaction, {
          entityType: 'Program',
          entityId: created.id,
          action: 'CREATE',
          userId: req.user!.id,
          after: created,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
        })
        await synchronizeProgramOccurrences(transaction, created.id)
        return created
      })

      console.error('[BACKEND] ✅ Programme et diffusions datées sauvegardés:', JSON.stringify({
        id: saved.id,
        title: saved.title,
        gridId: saved.gridId
      }))
      
      await notifyTelegram('PROGRAM_CREATED', { program: saved })
      
      // Invalider le cache des programmes
      await invalidateCache(`programs:grid:${gridId}:*`)
      
      // Génération automatique EPG
      const { autoGenerateEPG } = await import('./lib/epg-auto-generator.js')
      autoGenerateEPG(gridId).catch((error) => {
        console.error('❌ Erreur génération automatique EPG:', error.message)
      })
      
      console.error('[BACKEND] 📤 Envoi réponse au frontend:', JSON.stringify({
        id: saved.id,
        title: saved.title
      }))
      
      res.json(saved)
    } catch (error: any) {
      console.error('[BACKEND] ❌ Erreur lors de la sauvegarde du programme:', error)
      console.error('[BACKEND] ❌ Détails de l\'erreur:', JSON.stringify({
        message: error.message,
        code: error.code,
        stack: error.stack
      }))
      throw error
    }
  })
)

router.put('/programs/:id',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requireAnyPermission([
    { resource: 'program', action: 'update' },
    { resource: 'program', action: 'status' }
  ]),
  validateUpdateProgram,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const programId = requireParam(req.params.id, "ID")
    console.error('[BACKEND] 📝 Mise à jour programme - Données reçues:', {
      programId,
      title: req.body.title,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      days: req.body.days,
      userId: req.user!.id
    })
    
    const result = await prisma.$transaction(async (transaction) => {
      const before = await transaction.program.findUnique({ where: { id: programId } })
      if (!before || before.archivedAt) return null
      const program = { ...before, ...req.body, id: programId, createdBy: before.createdBy }
      const after = await store.saveProgram(program, transaction)
      await synchronizeProgramOccurrences(transaction, programId)
      await writeAuditLogInTransaction(transaction, {
        entityType: 'Program',
        entityId: programId,
        action: 'UPDATE',
        userId: req.user!.id,
        before,
        after,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      })
      return { before, after }
    })
    if (!result) return res.status(404).json({ error: 'Programme non trouvé' })
    const { after } = result

    console.error('[BACKEND] ✅ Programme et diffusions futures mis à jour:', {
      id: after.id,
      title: after.title,
      gridId: after.gridId
    })
    
    // Invalider le cache pour cette grille
    await invalidateCache(`programs:grid:${after.gridId}:*`)
    
    await notifyTelegram('PROGRAM_UPDATED', { program: after })
    
    // Génération automatique EPG
    const { autoGenerateEPG } = await import('./lib/epg-auto-generator.js')
    autoGenerateEPG(after.gridId).catch((error) => {
      console.error('❌ Erreur génération automatique EPG:', error.message)
    })
    
    console.error('[BACKEND] 📤 Envoi réponse mise à jour:', {
      id: after.id,
      title: after.title
    })
    
    res.json(after)
  })
)

router.post('/programs/:id/occurrences/:serviceDate/status',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('occurrence', 'status'),
  validateOccurrenceStatus,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const programId = requireParam(req.params.id, 'ID du programme')
    const serviceDate = parseDateOnly(req.params.serviceDate)
    if (!serviceDate) return res.status(400).json({ error: 'Date de diffusion invalide.' })

    const existing = await prisma.programOccurrence.findUnique({
      where: { programId_serviceDate: { programId, serviceDate } },
      include: { program: { select: { archivedAt: true } } },
    })
    if (!existing || existing.program.archivedAt) {
      return res.status(404).json({ error: 'Diffusion datée introuvable.' })
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const occurrence = await transaction.programOccurrence.update({
        where: { id: existing.id },
        data: { status: req.body.status },
      })
      await writeAuditLogInTransaction(transaction, {
        entityType: 'ProgramOccurrence',
        entityId: occurrence.id,
        action: 'STATUS_CHANGE',
        userId: req.user!.id,
        before: { status: existing.status, serviceDate: req.params.serviceDate },
        after: { status: occurrence.status, serviceDate: req.params.serviceDate },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      })
      return occurrence
    })
    res.json(updated)
  })
)

router.delete('/programs/:id', generalLimiter, writeLimiter, ensureAuth, requirePermission('program', 'delete'), async (req: Request, res: Response) => {
  try {
    const programId = requireParam(req.params.id, 'ID')
    const archived = await prisma.$transaction(async (transaction) => {
      const before = await transaction.program.findUnique({ where: { id: programId } })
      if (!before || before.archivedAt) return null
      const after = await transaction.program.update({
        where: { id: programId },
        data: { archivedAt: new Date() },
      })
      await transaction.programOccurrence.updateMany({
        where: {
          programId,
          status: 'PLANNED',
          serviceDate: { gte: dateOnlyUtcNow() },
        },
        data: { status: 'CANCELLED' },
      })
      await writeAuditLogInTransaction(transaction, {
        entityType: 'Program',
        entityId: programId,
        action: 'ARCHIVE',
        userId: req.user!.id,
        before,
        after,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
      })
      return { before, after }
    })
    if (!archived) return res.status(404).json({ error: 'Programme non trouvé' })

    await notifyTelegram('PROGRAM_DELETED', { programId })
    
    // Génération automatique EPG
    const { autoGenerateEPG } = await import('./lib/epg-auto-generator.js')
    autoGenerateEPG(archived.before.gridId).catch((error) => {
      console.error('❌ Erreur génération automatique EPG:', error.message)
    })
    
    res.json({ ok: true, archived: true })
  } catch (error: any) {
    console.error('Erreur suppression programme:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// INCIDENTS
// ============================================
router.get('/grids/:gridId/incidents', generalLimiter, ensureAuth, requirePermission('incident', 'read'), async (req: Request, res: Response) => {
  try {
    const incidents = await store.getIncidents(requireParam(req.params.gridId, "ID de grille"))
    res.json(incidents)
  } catch (error: any) {
    console.error('Erreur liste incidents:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/incidents',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('incident', 'create'),
  validateCreateIncident,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const incident = {
      id: nanoid(),
      status: 'OPEN',
      severity: req.body.severity || 'MINOR',
      createdBy: req.user!.id,
      ...req.body,
    }
    
    const saved = await store.saveIncident(incident)
    
    // Audit trail
    await auditCreate('Incident', saved.id, saved, getAuditContext(req))
    
    if (saved.severity === 'CRITICAL') {
      await notifyTelegram('INCIDENT_CRITICAL', { incident: saved })
    } else {
      await notifyTelegram('INCIDENT_CREATED', { incident: saved })
    }
    
    res.json(saved)
  })
)

router.put('/incidents/:id', generalLimiter, writeLimiter, ensureAuth, requirePermission('incident', 'update'), async (req: Request, res: Response) => {
  try {
    const incidents = await store.getIncidents()
    const existing = incidents.find((i: any) => i.id === requireParam(req.params.id, "ID"))
    if (!existing) return res.status(404).json({ error: 'Incident non trouvé' })
    
    const before = { ...existing }
    const incident = { ...existing, ...req.body, id: requireParam(req.params.id, "ID") }
    const after = await store.saveIncident(incident)
    
    // Audit trail
    await auditUpdate('Incident', requireParam(req.params.id, "ID"), before, after, getAuditContext(req))
    
    res.json(after)
  } catch (error: any) {
    console.error('Erreur modification incident:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// DEVIATIONS
// ============================================
router.get('/grids/:gridId/deviations', generalLimiter, ensureAuth, requirePermission('deviation', 'read'), async (req: Request, res: Response) => {
  try {
    const deviations = await store.getDeviations(requireParam(req.params.gridId, "ID de grille"))
    res.json(deviations)
  } catch (error: any) {
    console.error('Erreur liste écarts:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/deviations',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('deviation', 'create'),
  validateCreateDeviation,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const deviation = {
      id: nanoid(),
      createdBy: req.user!.id,
      ...req.body,
    }
    
    const saved = await store.saveDeviation(deviation)
    
    // Audit trail
    await auditCreate('Deviation', saved.id, saved, getAuditContext(req))
    
    await notifyTelegram('DEVIATION_CREATED', { deviation: saved })
    res.json(saved)
  })
)

// ============================================
// AD LOGS
// ============================================
router.get('/grids/:gridId/ads', generalLimiter, ensureAuth, requirePermission('ads', 'read'), async (req: Request, res: Response) => {
  try {
    const ads = await store.getAdLogs(requireParam(req.params.gridId, "ID de grille"))
    res.json(ads)
  } catch (error: any) {
    console.error('Erreur liste publicités:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/ads',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('ads', 'create'),
  validateCreateAdLog,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const adLog = {
      id: nanoid(),
      status: 'SCHEDULED',
      adType: req.body.adType || 'SPOT',
      createdBy: req.user!.id,
      ...req.body,
    }
    
    const saved = await store.saveAdLog(adLog)
    
    // Audit trail
    await auditCreate('AdLog', saved.id, saved, getAuditContext(req))
    
    await notifyTelegram('AD_PLANNED', { adLog: saved })
    res.json(saved)
  })
)

router.put('/ads/:id', generalLimiter, writeLimiter, ensureAuth, requirePermission('ads', 'update'), async (req: Request, res: Response) => {
  try {
    const adLogs = await store.getAdLogs()
    const existing = adLogs.find((a: any) => a.id === requireParam(req.params.id, "ID"))
    if (!existing) return res.status(404).json({ error: 'Pub non trouvée' })
    
    const before = { ...existing }
    const adLog = { ...existing, ...req.body, id: requireParam(req.params.id, "ID") }
    const after = await store.saveAdLog(adLog)
    
    // Audit trail
    await auditUpdate('AdLog', requireParam(req.params.id, "ID"), before, after, getAuditContext(req))
    
    // Vérifier si la pub a été manquée (logique métier à implémenter si nécessaire)
    // Le modèle AdLog n'a pas de champ 'status' dans le schéma Prisma
    // if ((after as any).status === 'MISSED') {
    //   await notifyTelegram('AD_MISSED', { adLog: after })
    // }
    
    res.json(after)
  } catch (error: any) {
    console.error('Erreur modification publicité:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// SHIFT LOGS
// ============================================
router.get('/grids/:gridId/shiftlogs', generalLimiter, ensureAuth, requirePermission('shiftlog', 'read'), async (req: Request, res: Response) => {
  try {
    const shiftLogs = await store.getShiftLogs(requireParam(req.params.gridId, "ID de grille"))
    res.json(shiftLogs)
  } catch (error: any) {
    console.error('Erreur liste journaux:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/shiftlogs',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('shiftlog', 'create'),
  validateCreateShiftLog,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const shiftLog = {
      id: nanoid(),
      createdBy: req.user!.id,
      activities: [],
      incidents: [],
      pendingTasks: [],
      signatures: {},
      ...req.body,
    }
    
    const saved = await store.saveShiftLog(shiftLog)
    
    // Audit trail
    await auditCreate('ShiftLog', saved.id, saved, getAuditContext(req))
    
    res.json(saved)
  })
)

router.put('/shiftlogs/:id', generalLimiter, writeLimiter, ensureAuth, requirePermission('shiftlog', 'update'), async (req: Request, res: Response) => {
  try {
    const shiftLogs = await store.getShiftLogs()
    const existing = shiftLogs.find((s: any) => s.id === requireParam(req.params.id, "ID"))
    if (!existing) return res.status(404).json({ error: 'Journal non trouvé' })
    
    const before = { ...existing }
    const shiftLog = { ...existing, ...req.body, id: requireParam(req.params.id, "ID") }
    const after = await store.saveShiftLog(shiftLog)
    
    // Audit trail
    await auditUpdate('ShiftLog', requireParam(req.params.id, "ID"), before, after, getAuditContext(req))
    
    res.json(after)
  } catch (error: any) {
    console.error('Erreur modification journal:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// BROADCAST (Now/Next/Today)
// ============================================
router.get('/broadcast/now', generalLimiter, ensureAuth, requirePermission('program', 'read'), async (req: Request, res: Response) => {
  try {
    const now = new Date()
    const programs = await store.getPrograms()
    const current = programs.find((p: any) => {
      return p.opStatus === 'ON_AIR'
    })
    res.json(current || null)
  } catch (error: any) {
    console.error('Erreur broadcast now:', error)
    res.status(500).json({ error: error.message })
  }
})

router.get('/broadcast/next', generalLimiter, ensureAuth, requirePermission('program', 'read'), async (req: Request, res: Response) => {
  try {
    const programs = await store.getPrograms()
    const next = programs
      .filter((p: any) => ['CONFIRMED', 'READY', 'IN_PRODUCTION'].includes(p.opStatus))
      .sort((a: any, b: any) => a.startTime?.localeCompare(b.startTime) || 0)[0]
    res.json(next || null)
  } catch (error: any) {
    console.error('Erreur broadcast next:', error)
    res.status(500).json({ error: error.message })
  }
})

router.get('/broadcast/today', generalLimiter, ensureAuth, requirePermission('program', 'read'), async (req: Request, res: Response) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const programs = await store.getPrograms()
    // Filtrer par jour - logique simplifiée
    res.json(programs.slice(0, 20)) // Limite pour l'exemple
  } catch (error: any) {
    console.error('Erreur broadcast today:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// NOTIFICATION RULES
// ============================================
router.get('/notifications/rules', generalLimiter, ensureAuth, requirePermission('notification', 'read'), asyncHandler(async (_req: Request, res: Response) => {
  const rules = await store.getNotificationRules()
  res.json(rules)
}))

router.post('/notifications/rules',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('notification', 'create'),
  validateCreateNotificationRule,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const saved = await store.createNotificationRule(nanoid(), req.body)

    // Audit trail
    await auditCreate('NotificationRule', saved.id, saved, getAuditContext(req))

    res.json(saved)
  })
)

router.put('/notifications/rules/:id',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('notification', 'update'),
  validateUpdateNotificationRule,
  handleValidationErrors,
  asyncHandler(async (req: Request, res: Response) => {
    const id = requireParam(req.params.id, 'ID')

    const before = await store.getNotificationRule(id)
    if (!before) return res.status(404).json({ error: 'Règle non trouvée' })

    const after = await store.updateNotificationRule(id, req.body)

    // Audit trail
    await auditUpdate('NotificationRule', id, before, after, getAuditContext(req))

    res.json(after)
  })
)

router.delete('/notifications/rules/:id', generalLimiter, writeLimiter, ensureAuth, requirePermission('notification', 'delete'), asyncHandler(async (req: Request, res: Response) => {
  const id = requireParam(req.params.id, 'ID')

  const rule = await store.getNotificationRule(id)
  if (!rule) return res.status(404).json({ error: 'Règle non trouvée' })

  await store.deleteNotificationRule(id)

  // Audit trail
  await auditDelete('NotificationRule', id, rule, getAuditContext(req))

  res.json({ ok: true })
}))

// ============================================
// AUDIT LOGS
// ============================================

// Récupérer les logs d'audit pour une entité spécifique
router.get('/audit/:entityType/:entityId', generalLimiter, ensureAuth, requirePermission('audit', 'read'), async (req: Request, res: Response) => {
  try {
    const entityType = requireParam(req.params.entityType, "Type d'entité")
    const entityId = requireParam(req.params.entityId, "ID d'entité")
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50,
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
    res.json(logs)
  } catch (error: any) {
    console.error('Erreur logs audit:', error)
    res.status(500).json({ error: error.message })
  }
})

// Récupérer tous les logs d'audit avec filtres
router.get('/audit', generalLimiter, ensureAuth, requirePermission('audit', 'read'), async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, userId, action, startDate, endDate, limit = 100 } = req.query
    
    const where: any = {}
    
    if (entityType) where.entityType = entityType as string
    if (entityId) where.entityId = entityId as string
    if (userId) where.userId = userId as string
    if (action) where.action = action as string
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) where.createdAt.lte = new Date(endDate as string)
    }
    
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: Number(limit),
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
    
    res.json(logs)
  } catch (error: any) {
    console.error('Erreur logs audit:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================
// ENDPOINTS ALERTES BROADCAST
// ============================================

/**
 * POST /api/v3/alerts/daily-schedule
 * Envoie le programme journalier (matin ou soir)
 * Requiert: ADMIN ou DIRECTION
 */
router.post('/alerts/daily-schedule',
  generalLimiter,
  ensureAuth,
  requireAnyPermission([
    { resource: 'alert', action: 'send' },
    { resource: 'admin', action: 'all' }
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { gridId, period } = req.body
    
    if (!gridId) {
      return res.status(400).json({ error: 'gridId requis' })
    }
    
    if (period !== 'MORNING' && period !== 'EVENING') {
      return res.status(400).json({ error: 'period doit être MORNING ou EVENING' })
    }
    
    const { sendDailySchedule } = await import('./alerts/index.js')
    const success = await sendDailySchedule(gridId, period)
    
    if (success) {
      res.json({ 
        ok: true, 
        message: `Programme ${period.toLowerCase()} envoyé avec succès`,
        period,
        gridId 
      })
    } else {
      res.status(500).json({ error: 'Erreur lors de l\'envoi du programme' })
    }
  })
)

/**
 * POST /api/v3/alerts/preparation/:programId
 * Envoie une alerte de préparation pour un programme
 * Requiert: ADMIN ou DIRECTION
 */
router.post('/alerts/preparation/:programId',
  generalLimiter,
  ensureAuth,
  requireAnyPermission([
    { resource: 'alert', action: 'send' },
    { resource: 'admin', action: 'all' }
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const programId = requireParam(req.params.programId, "ID de programme")
    
    const { sendPreparationAlert } = await import('./alerts/index.js')
    const success = await sendPreparationAlert(programId)
    
    if (success) {
      res.json({ 
        ok: true, 
        message: 'Alerte de préparation envoyée avec succès',
        programId 
      })
    } else {
      res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'alerte' })
    }
  })
)

/**
 * POST /api/v3/alerts/on-air/:programId
 * Envoie une alerte ON AIR pour un programme
 * Requiert: ADMIN ou DIRECTION
 */
router.post('/alerts/on-air/:programId',
  generalLimiter,
  ensureAuth,
  requireAnyPermission([
    { resource: 'alert', action: 'send' },
    { resource: 'admin', action: 'all' }
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const programId = requireParam(req.params.programId, "ID de programme")
    
    const { sendOnAirAlert } = await import('./alerts/index.js')
    const success = await sendOnAirAlert(programId)
    
    if (success) {
      res.json({ 
        ok: true, 
        message: 'Alerte ON AIR envoyée avec succès',
        programId 
      })
    } else {
      res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'alerte ON AIR' })
    }
  })
)

/**
 * POST /api/v3/alerts/anomaly/:programId
 * Envoie une alerte d'anomalie pour un programme
 * Requiert: ADMIN ou DIRECTION
 */
router.post('/alerts/anomaly/:programId',
  generalLimiter,
  ensureAuth,
  requireAnyPermission([
    { resource: 'alert', action: 'send' },
    { resource: 'admin', action: 'all' }
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const programId = requireParam(req.params.programId, "ID de programme")
    const { type, expectedTime, actualTime } = req.body
    
    if (!type || !['NOT_STARTED', 'DELAYED', 'OVERRUN', 'SKIPPED', 'MANUAL_OVERRIDE'].includes(type)) {
      return res.status(400).json({ error: 'type invalide (NOT_STARTED, DELAYED, OVERRUN, SKIPPED, MANUAL_OVERRIDE)' })
    }
    
    const { sendAnomalyAlert } = await import('./alerts/index.js')
    const success = await sendAnomalyAlert(programId, type, expectedTime, actualTime)
    
    if (success) {
      res.json({ 
        ok: true, 
        message: 'Alerte d\'anomalie envoyée avec succès',
        programId,
        type 
      })
    } else {
      res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'alerte d\'anomalie' })
    }
  })
)

/**
 * POST /api/v3/alerts/end-of-service
 * Envoie le rapport de fin de service
 * Requiert: ADMIN ou DIRECTION
 */
router.post('/alerts/end-of-service',
  generalLimiter,
  ensureAuth,
  requireAnyPermission([
    { resource: 'alert', action: 'send' },
    { resource: 'admin', action: 'all' }
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { gridId, date } = req.body
    
    if (!gridId) {
      return res.status(400).json({ error: 'gridId requis' })
    }
    
    const reportDate = date ? new Date(date) : new Date()
    const { sendEndOfServiceReport } = await import('./alerts/index.js')
    const success = await sendEndOfServiceReport(gridId, reportDate)
    
    if (success) {
      res.json({ 
        ok: true, 
        message: 'Rapport de fin de service envoyé avec succès',
        gridId,
        date: reportDate.toISOString()
      })
    } else {
      res.status(500).json({ error: 'Erreur lors de l\'envoi du rapport' })
    }
  })
)

/**
 * GET /api/v3/alerts/config
 * Récupère la configuration des alertes (sans secrets)
 * Requiert: ADMIN
 */
router.get('/alerts/config',
  generalLimiter,
  ensureAuth,
  requirePermission('admin', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const { loadAlertConfig } = await import('./alerts/config.js')
    const config = loadAlertConfig()
    
    // Ne pas exposer les secrets
    res.json({
      telegram: {
        enabled: config.telegram.enabled,
        chatIdConfigured: !!config.telegram.chatId,
        botTokenConfigured: !!config.telegram.botToken,
      },
      email: {
        enabled: config.email.enabled,
        smtpHost: config.email.smtpHost,
        smtpPort: config.email.smtpPort,
        fromEmail: config.email.fromEmail,
        toEmailsCount: config.email.toEmails.length,
      },
      schedules: config.schedules,
      preparationAlerts: config.preparationAlerts,
    })
  })
)

// ============================================
// ENDPOINTS TEMPLATES RAMADAN
// ============================================

// Génération assistée de modèles génériques via un serveur OpenCode configuré.
router.get('/templates/ai/models',
  generalLimiter,
  ensureAuth,
  requirePermission('grid', 'create'),
  asyncHandler(async (_req: Request, res: Response) => {
    try {
      res.json(await listAvailableAiModels())
    } catch (error) {
      if (error instanceof OpenCodeRequestError) {
        return res.status(error.status).json({ error: error.message })
      }
      throw error
    }
  })
)

router.post('/templates/ai/generate',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('grid', 'create'),
  asyncHandler(async (req: Request, res: Response) => {
    const brief = typeof req.body?.brief === 'string' ? req.body.brief.trim() : ''
    const { providerID, modelID, source } = req.body ?? {}
    const hasProvider = providerID !== undefined
    const hasModel = modelID !== undefined
    if ((source !== undefined && source !== 'opencode' && source !== 'direct') || hasProvider !== hasModel || (hasProvider && (
      typeof providerID !== 'string' ||
      typeof modelID !== 'string' ||
      !providerID.trim() ||
      !modelID.trim() ||
      providerID.length > 120 ||
      modelID.length > 120
    ))) {
      return res.status(400).json({ error: 'Sélectionnez un fournisseur et un modèle OpenCode valides.' })
    }
    const selection = hasProvider
      ? { source: source ?? 'opencode', providerID: providerID.trim(), modelID: modelID.trim() }
      : undefined
    const selectedSource = selection?.source ?? 'opencode'
    if (brief.length < 12 || brief.length > 2000) {
      return res.status(400).json({ error: 'Décrivez le modèle en 12 à 2 000 caractères.' })
    }
    if (selectedSource === 'opencode' && !process.env.OPENCODE_BASE_URL?.trim()) {
      return res.status(503).json({ error: 'OpenCode n’est pas configuré. Définissez OPENCODE_BASE_URL dans backend/.env, puis redémarrez le backend.' })
    }
    try {
      const programs = await generateGridTemplate(brief, selection)
      res.json({ programs })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (error instanceof OpenCodeRequestError) {
        return res.status(error.status).json({ error: message })
      }
      if (selectedSource === 'direct' && message) {
        return res.status(502).json({ error: message })
      }
      const freeTierUnavailable = message.includes('free tier can only be used from within OpenCode')
      if (freeTierUnavailable) {
        return res.status(503).json({
          error: 'Le forfait gratuit OpenCode ne permet pas la génération via cette API. Configurez dans OpenCode un fournisseur et un modèle utilisables par le serveur (par exemple un modèle local), puis réessayez.',
        })
      }
      const knownConfigurationError = message.startsWith('OPENCODE_BASE_URL') || message.startsWith('La génération IA n’est pas configurée')
      res.status(knownConfigurationError ? 503 : 502).json({
        error: knownConfigurationError ? message : 'OpenCode est injoignable ou le modèle configuré a refusé la génération. Vérifiez le serveur et le modèle OpenCode.',
      })
    }
  })
)

router.post('/templates/ai/create',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('grid', 'create'),
  requirePermission('program', 'create'),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, startDate, endDate } = req.body ?? {}
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      return res.status(400).json({ error: 'Le nom du modèle est requis (120 caractères maximum).' })
    }
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
      return res.status(400).json({ error: 'La période de la grille est invalide.' })
    }
    let programs
    try {
      programs = validateSuggestedPrograms({ programs: req.body?.programs })
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Modèle invalide.' })
    }
    const gridId = nanoid()
    const savedGrid = await prisma.$transaction(async tx => {
      const grid = await tx.grid.create({ data: {
        id: gridId,
        name: name.trim(),
        type: 'WEEKLY',
        startDate: start,
        endDate: end,
        status: 'DRAFT',
        createdBy: req.user!.id,
      } })
      await tx.program.createMany({ data: programs.map(program => ({
        id: nanoid(), gridId, title: program.title,
        category: program.category ?? null, type: program.type,
        startTime: program.startTime, endTime: program.endTime,
        durationMin: program.durationMin, days: program.days,
        description: program.description ?? null,
        opStatus: 'DRAFT' as const, createdBy: req.user!.id,
      })) })
      return grid
    })
    await auditCreate('Grid', savedGrid.id, { ...savedGrid, programsCount: programs.length }, getAuditContext(req))
    await invalidateCache('grids:*')
    res.status(201).json({ grid: savedGrid, programsCreated: programs.length })
  })
)

/**
 * GET /api/v3/ramadan/templates
 * Liste tous les templates Ramadan disponibles
 */
router.get('/ramadan/templates',
  generalLimiter,
  ensureAuth,
  requireAnyPermission([
    { resource: 'grid', action: 'create' },
    { resource: 'grid', action: 'update' },
    { resource: 'admin', action: 'all' }
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { getAllTemplates } = await import('./ramadan/templates.js')
    const templates = getAllTemplates()
    
    // Formater pour l'API (sans les programmes complets)
    const templatesList = templates.map(t => ({
      id: t.id,
      name: t.name,
      type: t.type,
      description: t.description,
      programsCount: t.programs.length,
      metadata: t.metadata,
    }))
    
    res.json(templatesList)
  })
)

/**
 * GET /api/v3/ramadan/templates/:type
 * Récupère un template spécifique avec ses programmes
 */
router.get('/ramadan/templates/:type',
  generalLimiter,
  ensureAuth,
  requireAnyPermission([
    { resource: 'grid', action: 'create' },
    { resource: 'grid', action: 'update' },
    { resource: 'admin', action: 'all' }
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { RamadanTemplateType } = await import('./ramadan/types.js')
    const { getTemplate } = await import('./ramadan/templates.js')
    
    const type = req.params.type as any
    
    if (!Object.values(RamadanTemplateType).includes(type)) {
      return res.status(400).json({ error: 'Type de template invalide' })
    }
    
    const template = getTemplate(type)
    res.json(template)
  })
)

/**
 * POST /api/v3/ramadan/apply
 * Applique un template Ramadan à une grille
 */
router.post('/ramadan/apply',
  generalLimiter,
  ensureAuth,
  requireAnyPermission([
    { resource: 'grid', action: 'update' },
    { resource: 'admin', action: 'all' }
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { RamadanTemplateType } = await import('./ramadan/types.js')
    const { applyRamadanTemplate, applyRamadanTemplatesByWeek } = await import('./ramadan/apply.js')
    
    const { gridId, templateType, startDate, endDate, overwriteExisting, applyToWeek } = req.body
    
    if (!gridId) {
      return res.status(400).json({ error: 'gridId requis' })
    }
    
    const userId = (req as any).user?.id
    if (!userId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' })
    }
    
    if (applyToWeek) {
      // Appliquer les templates pour toute la semaine
      const results = await applyRamadanTemplatesByWeek(
        gridId,
        new Date(startDate || Date.now()),
        new Date(endDate || Date.now()),
        userId,
        overwriteExisting || false
      )
      
      res.json({
        success: results.every(r => r.success),
        results,
        summary: {
          totalProgramsCreated: results.reduce((sum, r) => sum + r.programsCreated, 0),
          totalProgramsSkipped: results.reduce((sum, r) => sum + r.programsSkipped, 0),
          totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
        },
      })
    } else {
      // Appliquer un template spécifique
      if (!templateType || !Object.values(RamadanTemplateType).includes(templateType)) {
        return res.status(400).json({ error: 'templateType invalide' })
      }
      
      const result = await applyRamadanTemplate({
        gridId,
        templateType,
        startDate: new Date(startDate || Date.now()),
        endDate: new Date(endDate || Date.now()),
        userId,
        overwriteExisting: overwriteExisting || false,
      })
      
      res.json(result)
    }
  })
)

/**
 * GET /api/v3/grids/:gridId/epg
 * Génère l'EPG (Electronic Program Guide) au format JSON pour vMix
 */
router.get('/grids/:gridId/epg',
  generalLimiter,
  ensureAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { generateEPG, generateEPGForPeriod } = await import('./lib/epg-generator.js')
    const gridId = req.params.gridId
    
    if (!gridId) {
      return res.status(400).json({ error: 'gridId requis' })
    }

    // Paramètres optionnels
    const { date, startDate, endDate } = req.query
    
    try {
      let epg
      
      if (startDate && endDate) {
        // Générer pour une période
        epg = await generateEPGForPeriod(
          gridId,
          new Date(startDate as string),
          new Date(endDate as string)
        )
      } else if (date) {
        // Générer pour une date spécifique
        epg = await generateEPG(gridId, new Date(date as string))
      } else {
        // Générer pour aujourd'hui
        epg = await generateEPG(gridId)
      }
      
      res.json(epg)
    } catch (error: any) {
      console.error('Erreur génération EPG:', error)
      res.status(500).json({ error: error.message || 'Erreur génération EPG' })
    }
  })
)

/**
 * GET /api/v3/grids/:gridId/epg/download
 * Télécharge l'EPG au format JSON
 */
router.get('/grids/:gridId/epg/download',
  generalLimiter,
  ensureAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { generateEPG, generateEPGForPeriod } = await import('./lib/epg-generator.js')
    const gridId = req.params.gridId
    
    if (!gridId) {
      return res.status(400).json({ error: 'gridId requis' })
    }

    // Paramètres optionnels
    const { date, startDate, endDate } = req.query
    
    try {
      let epg
      
      if (startDate && endDate) {
        // Générer pour une période
        epg = await generateEPGForPeriod(
          gridId,
          new Date(startDate as string),
          new Date(endDate as string)
        )
      } else if (date) {
        // Générer pour une date spécifique
        epg = await generateEPG(gridId, new Date(date as string))
      } else {
        // Générer pour aujourd'hui
        epg = await generateEPG(gridId)
      }
      
      // Récupérer le nom de la grille pour le nom de fichier
      const grid = await prisma.grid.findUnique({
        where: { id: gridId },
        select: { name: true },
      })
      
      const filename = `epg-${grid?.name || gridId}-${new Date().toISOString().split('T')[0]}.json`
        .replace(/[^a-z0-9.-]/gi, '-')
        .toLowerCase()
      
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.json(epg)
    } catch (error: any) {
      console.error('Erreur génération EPG:', error)
      res.status(500).json({ error: error.message || 'Erreur génération EPG' })
    }
  })
)

/**
 * GET /api/v3/grids/:gridId/coordination/messages
 * Liste les messages de coordination d'une grille.
 */
router.get(
  '/grids/:gridId/coordination/messages',
  generalLimiter,
  ensureAuth,
  requirePermission('grid', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const gridId = requireParam(req.params.gridId, 'ID de grille')
    const messages = await prisma.coordinationMessage.findMany({
      where: { gridId },
      orderBy: { createdAt: 'asc' },
      include: {
        from: { select: { id: true, email: true, displayName: true, role: true } },
      },
    })
    res.json(
      messages.map((m) => ({
        id: m.id,
        from: m.fromName || m.from.email,
        fromId: m.fromId,
        to: undefined,
        content: m.content,
        timestamp: m.createdAt.toISOString(),
        type: (m.type as 'INFO' | 'ALERT' | 'QUESTION') || 'INFO',
      }))
    )
  })
)

/**
 * POST /api/v3/grids/:gridId/coordination/messages
 * Crée un message de coordination.
 */
router.post(
  '/grids/:gridId/coordination/messages',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('grid', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const gridId = requireParam(req.params.gridId, 'ID de grille')
    const { content, type } = req.body

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Le contenu du message est requis' })
    }

    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    const message = await prisma.coordinationMessage.create({
      data: {
        gridId,
        fromId: user.id,
        fromName: user.email,
        content: content.trim(),
        type: type || 'INFO',
      },
      include: {
        from: { select: { id: true, email: true, displayName: true, role: true } },
      },
    })

    // Audit trail
    await auditCreate(
      'CoordinationMessage',
      message.id,
      message,
      getAuditContext(req)
    )

    res.status(201).json({
      id: message.id,
      from: message.fromName || message.from.email,
      fromId: message.fromId,
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      type: message.type as 'INFO' | 'ALERT' | 'QUESTION',
    })
  })
)

/**
 * GET /api/v3/grids/:gridId/coordination/tasks
 * Liste les tâches de coordination d'une grille.
 */
router.get(
  '/grids/:gridId/coordination/tasks',
  generalLimiter,
  ensureAuth,
  requirePermission('grid', 'read'),
  asyncHandler(async (req: Request, res: Response) => {
    const gridId = requireParam(req.params.gridId, 'ID de grille')
    const tasks = await prisma.task.findMany({
      where: { gridId },
      orderBy: [{ state: 'asc' }, { createdAt: 'desc' }],
      include: {
        owner: { select: { id: true, email: true, displayName: true, role: true } },
        creator: { select: { id: true, email: true, displayName: true, role: true } },
      },
    })
    res.json(
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        owner: t.ownerName || t.owner?.email || 'Non assigné',
        ownerId: t.ownerId,
        state: t.state as 'TODO' | 'IN_PROGRESS' | 'DONE',
        deadline: t.deadline?.toISOString(),
        description: t.description,
        createdBy: t.createdBy,
        createdAt: t.createdAt.toISOString(),
      }))
    )
  })
)

/**
 * POST /api/v3/grids/:gridId/coordination/tasks
 * Crée une tâche de coordination.
 */
router.post(
  '/grids/:gridId/coordination/tasks',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('grid', 'update'),
  asyncHandler(async (req: Request, res: Response) => {
    const gridId = requireParam(req.params.gridId, 'ID de grille')
    const { title, ownerId, ownerName, state, deadline, description } = req.body

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Le titre de la tâche est requis' })
    }

    const user = req.user
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' })
    }

    let safeOwnerId: string | null = null
    if (ownerId && typeof ownerId === 'string') {
      const existingUser = await prisma.user.findUnique({ where: { id: ownerId } })
      if (existingUser) {
        safeOwnerId = existingUser.id
      }
    }

    const task = await prisma.task.create({
      data: {
        gridId,
        title: title.trim(),
        ownerId: safeOwnerId,
        ownerName: ownerName?.trim() || 'Non assigné',
        state: state || 'TODO',
        deadline: deadline ? new Date(deadline) : null,
        description: description || '',
        createdBy: user.id,
      },
      include: {
        owner: { select: { id: true, email: true, displayName: true, role: true } },
        creator: { select: { id: true, email: true, displayName: true, role: true } },
      },
    })

    // Audit trail
    await auditCreate(
      'CoordinationTask',
      task.id,
      task,
      getAuditContext(req)
    )

    res.status(201).json({
      id: task.id,
      title: task.title,
      owner: task.ownerName || task.owner?.email || 'Non assigné',
      ownerId: task.ownerId,
      state: task.state as 'TODO' | 'IN_PROGRESS' | 'DONE',
      deadline: task.deadline?.toISOString(),
      description: task.description,
      createdBy: task.createdBy,
      createdAt: task.createdAt.toISOString(),
    })
  })
)

/**
 * PUT /api/v3/coordination/tasks/:id
 * Met à jour une tâche (statut, propriétaire, échéance, description).
 */
router.put(
  '/coordination/tasks/:id',
  generalLimiter,
  writeLimiter,
  ensureAuth,
  requirePermission('grid', 'update'),
  asyncHandler(async (req: Request, res: Response) => {
    const taskId = requireParam(req.params.id, 'ID de tâche')
    const { title, ownerId, ownerName, state, deadline, description } = req.body

    const existing = await prisma.task.findUnique({
      where: { id: taskId },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Tâche introuvable' })
    }

    const before = { ...existing }

    let safeOwnerId: string | null | undefined = undefined
    if (ownerId !== undefined) {
      if (ownerId === null || ownerId === '') {
        safeOwnerId = null
      } else if (typeof ownerId === 'string') {
        const existingUser = await prisma.user.findUnique({ where: { id: ownerId } })
        safeOwnerId = existingUser ? existingUser.id : null
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(safeOwnerId !== undefined && { ownerId: safeOwnerId }),
        ...(ownerName !== undefined && { ownerName: ownerName?.trim() || 'Non assigné' }),
        ...(state !== undefined && { state }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(description !== undefined && { description }),
      },
      include: {
        owner: { select: { id: true, email: true, displayName: true, role: true } },
        creator: { select: { id: true, email: true, displayName: true, role: true } },
      },
    })

    // Audit trail
    await auditUpdate(
      'CoordinationTask',
      task.id,
      before,
      task,
      getAuditContext(req)
    )

    res.json({
      id: task.id,
      title: task.title,
      owner: task.ownerName || task.owner?.email || 'Non assigné',
      ownerId: task.ownerId,
      state: task.state as 'TODO' | 'IN_PROGRESS' | 'DONE',
      deadline: task.deadline?.toISOString(),
      description: task.description,
      createdBy: task.createdBy,
      createdAt: task.createdAt.toISOString(),
    })
  })
)

export default router
