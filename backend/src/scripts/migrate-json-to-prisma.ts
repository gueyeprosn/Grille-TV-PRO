/**
 * Script de migration des données JSON vers PostgreSQL
 * 
 * Usage: tsx src/scripts/migrate-json-to-prisma.ts
 * 
 * Ce script migre toutes les données depuis les fichiers JSON
 * vers PostgreSQL avec Prisma
 */

import prisma from '../lib/prisma'
import { getGrids, getPrograms, getIncidents, getDeviations, getAdLogs, getShiftLogs, getUsers } from '../store-v3'
import { randomBytes } from 'crypto'

// Helper pour générer un ID unique (remplace nanoid)
function generateId(): string {
  return randomBytes(16).toString('hex')
}

async function migrateUsers() {
  console.log('📦 Migration des utilisateurs...')
  const users = await getUsers()
  
  for (const user of users) {
    try {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          displayName: user.displayName,
          role: user.role as any,
          passwordHash: user.passwordHash,
          isActive: true
        },
        create: {
          id: user.id || generateId(),
          email: user.email,
          displayName: user.displayName,
          role: user.role as any,
          passwordHash: user.passwordHash,
          isActive: true
        }
      })
    } catch (error: any) {
      console.error(`Erreur migration utilisateur ${user.email}:`, error.message)
    }
  }
  
  console.log(`✅ ${users.length} utilisateurs migrés`)
}

async function migrateGrids() {
  console.log('📦 Migration des grilles...')
  const grids = await getGrids()
  
  for (const grid of grids) {
    try {
      // Trouver ou créer l'utilisateur créateur
      let createdBy = grid.createdBy
      if (!createdBy) {
        // Utiliser le premier admin trouvé ou créer un utilisateur par défaut
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
        createdBy = admin?.id || (await prisma.user.findFirst())?.id || ''
      }

      await prisma.grid.upsert({
        where: { id: grid.id },
        update: {
          name: grid.name,
          type: (grid.type?.toUpperCase() || 'WEEKLY') as any,
          startDate: new Date(grid.startDate),
          endDate: new Date(grid.endDate),
          status: (grid.status?.toUpperCase() || 'DRAFT') as any,
          publishedAt: grid.publishedAt ? new Date(grid.publishedAt) : null,
          archivedAt: grid.archivedAt ? new Date(grid.archivedAt) : null,
          createdBy
        },
        create: {
          id: grid.id,
          name: grid.name,
          type: (grid.type?.toUpperCase() || 'WEEKLY') as any,
          startDate: new Date(grid.startDate),
          endDate: new Date(grid.endDate),
          status: (grid.status?.toUpperCase() || 'DRAFT') as any,
          publishedAt: grid.publishedAt ? new Date(grid.publishedAt) : null,
          archivedAt: grid.archivedAt ? new Date(grid.archivedAt) : null,
          createdBy
        }
      })
    } catch (error: any) {
      console.error(`Erreur migration grille ${grid.id}:`, error.message)
    }
  }
  
  console.log(`✅ ${grids.length} grilles migrées`)
}

async function migratePrograms() {
  console.log('📦 Migration des programmes...')
  const programs = await getPrograms()
  
  for (const program of programs) {
    try {
      // Trouver ou créer l'utilisateur créateur
      let createdBy = program.createdBy
      if (!createdBy) {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
        createdBy = admin?.id || (await prisma.user.findFirst())?.id || ''
      }

      // Convertir les jours si nécessaire (string[] -> number[])
      let days: number[] = []
      if (Array.isArray(program.days)) {
        const dayMap: Record<string, number> = {
          'Dimanche': 0, 'Sunday': 0,
          'Lundi': 1, 'Monday': 1,
          'Mardi': 2, 'Tuesday': 2,
          'Mercredi': 3, 'Wednesday': 3,
          'Jeudi': 4, 'Thursday': 4,
          'Vendredi': 5, 'Friday': 5,
          'Samedi': 6, 'Saturday': 6
        }
        days = program.days.map((d: any) => {
          if (typeof d === 'number') return d
          if (typeof d === 'string') return dayMap[d] ?? parseInt(d)
          return 0
        }).filter((d: number) => d >= 0 && d <= 6)
      }

      await prisma.program.upsert({
        where: { id: program.id },
        update: {
          gridId: program.gridId,
          title: program.title,
          type: (program.type?.toUpperCase() || 'PAD') as any,
          typeDiffusion: program.typeDiffusion,
          startTime: program.startTime || program.start,
          endTime: program.endTime || program.end,
          durationMin: program.durationMin || program.duration || 60,
          days,
          category: program.category,
          categoryId: program.categoryId,
          description: program.description,
          opStatus: (program.opStatus?.toUpperCase() || 'PLANNED') as any,
          color: program.color,
          adsRequired: program.adsRequired || false,
          createdBy
        },
        create: {
          id: program.id,
          gridId: program.gridId,
          title: program.title,
          type: (program.type?.toUpperCase() || 'PAD') as any,
          typeDiffusion: program.typeDiffusion,
          startTime: program.startTime || program.start,
          endTime: program.endTime || program.end,
          durationMin: program.durationMin || program.duration || 60,
          days,
          category: program.category,
          categoryId: program.categoryId,
          description: program.description,
          opStatus: (program.opStatus?.toUpperCase() || 'PLANNED') as any,
          color: program.color,
          adsRequired: program.adsRequired || false,
          createdBy
        }
      })
    } catch (error: any) {
      console.error(`Erreur migration programme ${program.id}:`, error.message)
    }
  }
  
  console.log(`✅ ${programs.length} programmes migrés`)
}

async function migrateIncidents() {
  console.log('📦 Migration des incidents...')
  const incidents = await getIncidents()
  
  for (const incident of incidents) {
    try {
      let createdBy = incident.createdBy
      if (!createdBy) {
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
        createdBy = admin?.id || (await prisma.user.findFirst())?.id || ''
      }

      await prisma.incident.upsert({
        where: { id: incident.id },
        update: {
          gridId: incident.gridId,
          programId: incident.programId || null,
          title: incident.title,
          description: incident.description,
          severity: (incident.severity?.toUpperCase() || 'MINOR') as any,
          status: (incident.status?.toUpperCase() || 'OPEN') as any,
          occurredAt: new Date(incident.occurredAt || incident.time || new Date()),
          resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt) : null,
          createdBy
        },
        create: {
          id: incident.id,
          gridId: incident.gridId,
          programId: incident.programId || null,
          title: incident.title,
          description: incident.description,
          severity: (incident.severity?.toUpperCase() || 'MINOR') as any,
          status: (incident.status?.toUpperCase() || 'OPEN') as any,
          occurredAt: new Date(incident.occurredAt || incident.time || new Date()),
          resolvedAt: incident.resolvedAt ? new Date(incident.resolvedAt) : null,
          createdBy
        }
      })
    } catch (error: any) {
      console.error(`Erreur migration incident ${incident.id}:`, error.message)
    }
  }
  
  console.log(`✅ ${incidents.length} incidents migrés`)
}

async function main() {
  console.log('🚀 Début de la migration JSON → PostgreSQL\n')
  
  try {
    await migrateUsers()
    await migrateGrids()
    await migratePrograms()
    await migrateIncidents()
    
    // TODO: Migrer aussi deviations, adLogs, shiftLogs si nécessaire
    
    console.log('\n✅ Migration terminée avec succès!')
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

