/**
 * Script pour réinitialiser complètement la base de données
 * - Supprime toutes les grilles et programmes
 *
 * - Importe une nouvelle grille par défaut depuis un fichier JSON
 */

import prisma from '../lib/prisma.js'
import { nanoid } from 'nanoid'
import fs from 'fs'
import path from 'path'

interface ProgramInput {
  id?: string
  title: string
  category?: string
  typeDiffusion?: string
  start: string
  end: string
  duration?: number
  description?: string
  days: string[]
  opStatus?: string
}

interface GridInput {
  id?: string
  name: string
  type: 'weekly' | 'special' | 'ramadan'
  startDate: string
  endDate: string
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
}

// Convertir les jours en français/anglais vers indices numériques (0-6)
function convertDaysToIndices(days: string[]): number[] {
  const dayMap: Record<string, number> = {
    'Dimanche': 0, 'Sunday': 0,
    'Lundi': 1, 'Monday': 1,
    'Mardi': 2, 'Tuesday': 2,
    'Mercredi': 3, 'Wednesday': 3,
    'Jeudi': 4, 'Thursday': 4,
    'Vendredi': 5, 'Friday': 5,
    'Samedi': 6, 'Saturday': 6
  }
  
  const indices = days
    .map(day => {
      if (typeof day === 'number') return day
      const normalized = day.trim()
      return dayMap[normalized] ?? null
    })
    .filter((idx): idx is number => idx !== null)
  
  // Supprimer les doublons
  return [...new Set(indices)]
}

// Convertir le type de diffusion
function convertTypeDiffusion(type?: string): string {
  if (!type) return 'PAD'
  const normalized = type.toUpperCase()
  if (normalized === 'DIRECT' || normalized === 'LIVE') return 'LIVE'
  if (normalized === 'REPLAY' || normalized === 'REDIF') return 'REPLAY'
  if (normalized === 'COMMERCIAL' || normalized === 'PUBLICITÉ' || normalized === 'PUBLICITE') return 'ADS'
  if (normalized === 'SPECIAL') return 'SPECIAL'
  return 'PAD'
}

// Calculer la durée en minutes
function calculateDuration(start: string, end: string): number {
  const [h1, m1] = start.split(':').map(Number)
  const [h2, m2] = end.split(':').map(Number)
  let a = h1 * 60 + m1
  let b = h2 * 60 + m2
  let diff = b - a
  if (diff <= 0) diff += 24 * 60
  return diff
}

// Normaliser le format d'heure
function normalizeTime(time: string): string {
  if (!time) return '00:00'
  // Supprimer les secondes si présentes
  return time.split(':').slice(0, 2).join(':').padStart(5, '0')
}

async function resetDatabase() {
  console.log('🗑️  Suppression de toutes les données...')
  
  // Supprimer dans l'ordre pour respecter les contraintes de clés étrangères
  await prisma.program.deleteMany({})
  console.log('   ✅ Programmes supprimés')
  
  await prisma.incident.deleteMany({})
  console.log('   ✅ Incidents supprimés')
  
  await prisma.deviation.deleteMany({})
  console.log('   ✅ Écarts supprimés')
  
  await prisma.adLog.deleteMany({})
  console.log('   ✅ Publicités supprimées')
  
  await prisma.shiftLog.deleteMany({})
  console.log('   ✅ Journaux de bord supprimés')
  
  await prisma.grid.deleteMany({})
  console.log('   ✅ Grilles supprimées')
  
  console.log('✅ Base de données réinitialisée\n')
}

async function importGridFromFile(filePath: string, adminUserId: string) {
  console.log(`📥 Import de la grille depuis ${filePath}...\n`)
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Fichier non trouvé : ${filePath}`)
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const data = JSON.parse(fileContent)
  
  // Adapter le format du fichier
  let programs: ProgramInput[] = []
  let gridData: GridInput | null = null
  
  if (data.programs && Array.isArray(data.programs)) {
    // Format avec propriété "programs"
    programs = data.programs
  } else if (Array.isArray(data)) {
    // Format tableau direct
    programs = data
  } else {
    throw new Error('Format de fichier invalide : propriété "programs" ou tableau attendu')
  }
  
  // Créer une grille par défaut si non présente
  if (!gridData) {
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    gridData = {
      id: `grid-default-${nanoid(8)}`,
      name: 'Grille Officielle 2025',
      type: 'weekly',
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: 'PUBLISHED'
    }
  }
  
  // Créer la grille
  const grid = await prisma.grid.create({
    data: {
      id: gridData.id || `grid-${nanoid(8)}`,
      name: gridData.name,
      type: gridData.type.toUpperCase() as any,
      startDate: new Date(gridData.startDate),
      endDate: new Date(gridData.endDate),
      status: (gridData.status || 'PUBLISHED').toUpperCase() as any,
      createdBy: adminUserId,
      publishedAt: gridData.status === 'PUBLISHED' ? new Date() : null
    }
  })
  
  console.log(`✅ Grille créée : "${grid.name}" (${grid.id})\n`)
  
  // Importer les programmes
  let imported = 0
  let skipped = 0
  let errors = 0
  
  for (const program of programs) {
    try {
      // Validation
      if (!program.title || !program.start || !program.end) {
        console.warn(`   ⏭️  Programme ignoré: données incomplètes (${program.title || 'Sans titre'})`)
        skipped++
        continue
      }
      
      const startTime = normalizeTime(program.start)
      const endTime = normalizeTime(program.end)
      
      if (!startTime.match(/^\d{2}:\d{2}$/) || !endTime.match(/^\d{2}:\d{2}$/)) {
        console.warn(`   ⏭️  Programme ignoré: format d'heure invalide (${program.title})`)
        skipped++
        continue
      }
      
      if (endTime <= startTime) {
        console.warn(`   ⏭️  Programme ignoré: endTime doit être après startTime (${program.title})`)
        skipped++
        continue
      }
      
      const dayIndices = convertDaysToIndices(program.days || [])
      if (dayIndices.length === 0) {
        console.warn(`   ⏭️  Programme ignoré: aucun jour valide (${program.title})`)
        skipped++
        continue
      }
      
      const duration = program.duration || calculateDuration(startTime, endTime)
      if (duration <= 0) {
        console.warn(`   ⏭️  Programme ignoré: durée invalide (${program.title})`)
        skipped++
        continue
      }
      
      const programId = program.id || `prog-${nanoid(8)}`
      const type = convertTypeDiffusion(program.typeDiffusion)
      
      await prisma.program.create({
        data: {
          id: programId,
          gridId: grid.id,
          title: program.title,
          description: program.description || null,
          category: program.category || null,
          startTime: startTime,
          endTime: endTime,
          durationMin: duration,
          days: dayIndices,
          opStatus: (program.opStatus || 'READY').toUpperCase() as any,
          createdBy: adminUserId
        }
      })
      
      imported++
    } catch (error: any) {
      console.error(`   ❌ Erreur sur "${program.title || program.id}": ${error.message}`)
      errors++
    }
  }
  
  console.log('\n📊 Résumé final :')
  console.log(`   ✅ Importés : ${imported}`)
  console.log(`   ⏭️  Ignorés : ${skipped}`)
  if (errors > 0) {
    console.log(`   ❌ Erreurs : ${errors}`)
  }
  console.log(`   📋 Total traité : ${programs.length}`)
  console.log('')
  console.log(`✅ Grille "${grid.name}" importée avec succès !`)
  
  return grid
}

async function main() {
  const filePath = process.argv[2] || path.join(process.cwd(), '../../grille-programmes-2025-12-23.json')
  
  if (!filePath) {
    console.error('Usage: tsx src/scripts/reset-and-import-default-grid.ts <fichier-grille.json>')
    console.error('\nExemple:')
    console.error('  tsx src/scripts/reset-and-import-default-grid.ts ../../grille-programmes-2025-12-23.json')
    process.exit(1)
  }
  
  try {
    // Trouver ou créer un utilisateur admin
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN', isActive: true }
    })
    
    if (!adminUser) {
      // Créer un utilisateur admin par défaut
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@grilletv.local',
          displayName: 'Administrateur',
          role: 'ADMIN',
          isActive: true
        }
      })
      console.log('✅ Utilisateur admin créé\n')
    }
    
    // Réinitialiser la base de données
    await resetDatabase()
    
    // Importer la nouvelle grille
    await importGridFromFile(filePath, adminUser.id)
    
    console.log('\n✅ Opération terminée avec succès!')
  } catch (error: any) {
    console.error('❌ Erreur :', error.message)
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

