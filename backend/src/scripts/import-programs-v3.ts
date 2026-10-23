/**
 * Script d'import de programmes V3 dans une grille existante
 * Usage: tsx src/scripts/import-programs-v3.ts programmes.json [--overwrite]
 */

import fs from 'fs/promises'
import * as store from '../store-v3-prisma'

async function importPrograms(filePath: string, overwrite = false) {
  try {
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'))
    
    // Vérifier si c'est un tableau de programmes ou un objet avec grid/programs
    let programs = Array.isArray(content) ? content : (content.programs || [])
    
    if (programs.length === 0) {
      console.error('❌ Aucun programme trouvé dans le fichier')
      process.exit(1)
    }

    // Récupérer le gridId du premier programme
    const gridId = programs[0].gridId
    if (!gridId) {
      console.error('❌ gridId manquant dans les programmes')
      process.exit(1)
    }

    // Vérifier que la grille existe
    const grid = await store.getGrid(gridId)
    if (!grid) {
      console.error(`❌ Grille "${gridId}" non trouvée`)
      console.error('   Créez d\'abord la grille ou utilisez import-grid-v3.ts')
      process.exit(1)
    }

    console.log(`📋 Import de ${programs.length} programmes dans la grille "${(grid as any).name}" (${gridId})`)
    console.log('')

    let imported = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const program of programs) {
      try {
        // S'assurer que le gridId est correct
        program.gridId = gridId

        // Vérifier si le programme existe déjà
        const existingPrograms = await store.getPrograms(gridId)
        const existing = existingPrograms.find((p: any) => p.id === program.id)
        
        if (existing) {
          if (overwrite) {
            // Mettre à jour le programme existant
            const programToSave = {
              ...existing,
              ...program,
              gridId: gridId,
              // Compatibilité V2 → V3
              startTime: program.startTime || program.start,
              endTime: program.endTime || program.end,
              durationMin: program.durationMin || program.duration,
              type: program.type || program.typeDiffusion,
              opStatus: program.opStatus || (existing as any).opStatus || 'PLANNED',
              adsRequired: program.adsRequired !== undefined ? program.adsRequired : ((existing as any).adsRequired || false),
              updatedAt: new Date().toISOString(),
              createdBy: program.createdBy || (existing as any).createdBy || 'system',
            }
            
            await store.saveProgram(programToSave)
            updated++
            process.stdout.write(`\r   ✅ Mis à jour: ${program.title?.substring(0, 40) || program.id}...`)
          } else {
            skipped++
            process.stdout.write(`\r   ⏭️  Ignoré (existe): ${program.title?.substring(0, 40) || program.id}...`)
          }
        } else {
          // Créer un nouveau programme
          const programToSave = {
            ...program,
            gridId: gridId,
            // Compatibilité V2 → V3
            startTime: program.startTime || program.start,
            endTime: program.endTime || program.end,
            durationMin: program.durationMin || program.duration,
            type: program.type || program.typeDiffusion,
            opStatus: program.opStatus || 'PLANNED',
            adsRequired: program.adsRequired || false,
            createdAt: program.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: program.createdBy || 'system',
          }
          
          await store.saveProgram(programToSave)
          imported++
          process.stdout.write(`\r   ➕ Importé: ${program.title?.substring(0, 40) || program.id}...`)
        }
      } catch (error: any) {
        errors++
        console.error(`\n   ❌ Erreur sur "${program.title || program.id}": ${error.message}`)
      }
    }

    console.log('\n')
    console.log('📊 Résumé :')
    console.log(`   ✅ Importés : ${imported}`)
    console.log(`   🔄 Mis à jour : ${updated}`)
    console.log(`   ⏭️  Ignorés : ${skipped}`)
    if (errors > 0) {
      console.log(`   ❌ Erreurs : ${errors}`)
    }
    console.log(`   📋 Total traité : ${programs.length}`)

  } catch (error: any) {
    console.error('❌ Erreur lors de l\'import :', error.message)
    if (error.code === 'ENOENT') {
      console.error(`   Fichier non trouvé : ${filePath}`)
    }
    process.exit(1)
  }
}

// Point d'entrée
const file = process.argv[2]
if (!file) {
  console.error('Usage: tsx src/scripts/import-programs-v3.ts <fichier-programmes.json> [--overwrite]')
  console.error('\nExemple:')
  console.error('  tsx src/scripts/import-programs-v3.ts programs-ttv-2025-v3.json')
  console.error('  tsx src/scripts/import-programs-v3.ts programs-ttv-2025-v3.json --overwrite')
  process.exit(1)
}

const overwrite = process.argv.includes('--overwrite')
importPrograms(file, overwrite)

