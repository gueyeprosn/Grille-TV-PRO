/**
 * EXEMPLE D'INTÉGRATION - API V3 avec Prisma, RBAC et Audit
 * 
 * Ce fichier montre comment adapter api-v3.js pour utiliser:
 * - Prisma au lieu de store-v3.js
 * - RBAC avancé avec permissions
 * - Audit trail automatique
 */

import express from 'express'
import prisma from '../lib/prisma.js'
import { checkPermission, checkAnyPermission } from '../lib/rbac.js'
import { auditCreate, auditUpdate, auditDelete, getAuditContext } from '../lib/audit.js'
import { generalLimiter, writeLimiter } from '../middleware/security.js'

const router = express.Router()

// ============================================
// EXEMPLE: CRÉER UN PROGRAMME
// ============================================

router.post(
  '/grids/:gridId/programs',
  generalLimiter,
  writeLimiter,
  checkPermission('program', 'create'), // RBAC: vérifie la permission program:create
  async (req, res) => {
    try {
      const { gridId } = req.params
      const userId = (req as any).user.id

      // Vérifier que la grille existe
      const grid = await prisma.grid.findUnique({
        where: { id: gridId }
      })

      if (!grid) {
        return res.status(404).json({ error: 'Grille non trouvée' })
      }

      // Créer le programme
      const program = await prisma.program.create({
        data: {
          gridId,
          title: req.body.title,
          type: req.body.type || 'PAD',
          typeDiffusion: req.body.typeDiffusion,
          startTime: req.body.startTime,
          endTime: req.body.endTime,
          durationMin: req.body.durationMin,
          days: req.body.days || [],
          category: req.body.category,
          categoryId: req.body.categoryId,
          description: req.body.description,
          opStatus: req.body.opStatus || 'PLANNED',
          color: req.body.color,
          adsRequired: req.body.adsRequired || false,
          createdBy: userId
        }
      })

      // Audit trail automatique
      await auditCreate('Program', program.id, program, getAuditContext(req))

      res.json(program)
    } catch (error: any) {
      console.error('Erreur création programme:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

// ============================================
// EXEMPLE: MODIFIER UN PROGRAMME
// ============================================

router.put(
  '/programs/:id',
  generalLimiter,
  writeLimiter,
  checkAnyPermission([
    { resource: 'program', action: 'update' },
    { resource: 'program', action: 'status' } // Peut modifier si c'est juste le statut
  ]),
  async (req, res) => {
    try {
      const { id } = req.params
      const userId = (req as any).user.id

      // Récupérer l'état avant
      const before = await prisma.program.findUnique({
        where: { id }
      })

      if (!before) {
        return res.status(404).json({ error: 'Programme non trouvé' })
      }

      // Vérifier si changement de statut uniquement
      const isStatusChangeOnly = 
        Object.keys(req.body).length === 1 && 
        req.body.opStatus && 
        req.body.opStatus !== before.opStatus

      // Mettre à jour
      const after = await prisma.program.update({
        where: { id },
        data: {
          ...req.body,
          updatedAt: new Date()
        }
      })

      // Audit trail
      if (isStatusChangeOnly) {
        await auditUpdate('Program', id, before, after, getAuditContext(req))
      } else {
        await auditUpdate('Program', id, before, after, getAuditContext(req))
      }

      res.json(after)
    } catch (error: any) {
      console.error('Erreur modification programme:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

// ============================================
// EXEMPLE: SUPPRIMER UN PROGRAMME
// ============================================

router.delete(
  '/programs/:id',
  generalLimiter,
  writeLimiter,
  checkPermission('program', 'delete'),
  async (req, res) => {
    try {
      const { id } = req.params

      // Récupérer avant suppression pour l'audit
      const before = await prisma.program.findUnique({
        where: { id }
      })

      if (!before) {
        return res.status(404).json({ error: 'Programme non trouvé' })
      }

      // Supprimer
      await prisma.program.delete({
        where: { id }
      })

      // Audit trail
      await auditDelete('Program', id, before, getAuditContext(req))

      res.json({ success: true })
    } catch (error: any) {
      console.error('Erreur suppression programme:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

// ============================================
// EXEMPLE: LISTER LES PROGRAMMES D'UNE GRILLE
// ============================================

router.get(
  '/grids/:gridId/programs',
  generalLimiter,
  checkPermission('program', 'read'), // RBAC: lecture
  async (req, res) => {
    try {
      const { gridId } = req.params
      const { opStatus, category, day } = req.query

      const programs = await prisma.program.findMany({
        where: {
          gridId,
          ...(opStatus && { opStatus: opStatus as any }),
          ...(category && { category }),
          ...(day !== undefined && { days: { has: parseInt(day as string) } })
        },
        orderBy: [
          { startTime: 'asc' },
          { createdAt: 'asc' }
        ],
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              displayName: true
            }
          }
        }
      })

      res.json(programs)
    } catch (error: any) {
      console.error('Erreur liste programmes:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

// ============================================
// EXEMPLE: PUBLIER UNE GRILLE
// ============================================

router.post(
  '/grids/:id/publish',
  generalLimiter,
  writeLimiter,
  checkPermission('grid', 'publish'),
  async (req, res) => {
    try {
      const { id } = req.params

      const before = await prisma.grid.findUnique({ where: { id } })
      if (!before) {
        return res.status(404).json({ error: 'Grille non trouvée' })
      }

      const after = await prisma.grid.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      })

      // Audit trail
      await auditUpdate('Grid', id, before, after, getAuditContext(req))

      res.json(after)
    } catch (error: any) {
      console.error('Erreur publication grille:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

// ============================================
// EXEMPLE: CONSULTER LES LOGS D'AUDIT
// ============================================

router.get(
  '/audit/:entityType/:entityId',
  generalLimiter,
  checkPermission('audit', 'read'),
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params

      const logs = await prisma.auditLog.findMany({
        where: {
          entityType,
          entityId
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              displayName: true,
              role: true
            }
          }
        },
        take: 50
      })

      res.json(logs)
    } catch (error: any) {
      console.error('Erreur logs audit:', error)
      res.status(500).json({ error: error.message })
    }
  }
)

export default router

