/**
 * Script pour effacer tous les programmes d'une grille et réimporter
 * Usage: tsx src/scripts/reset-and-import-programs.ts gridId programmes.json
 */

import fs from 'fs/promises'
import * as store from '../store-v3-prisma'

async function resetAndImport(gridId: string, filePath: string) {
  try {
    // Vérifier que la grille existe
    const grid = await store.getGrid(gridId)
    if (!grid) {
      console.error(`❌ Grille "${gridId}" non trouvée`)
      process.exit(1)
    }

    console.log(`📋 Grille: "${(grid as any).name}" (${gridId})`)
    console.log('')

    // Récupérer tous les programmes de la grille
    const allPrograms = await store.getPrograms(gridId)
    
    console.log(`🗑️  Suppression de ${allPrograms.length} programme(s) existant(s)...`)
    
    // Supprimer tous les programmes de la grille
    let deleted = 0
    for (const program of allPrograms) {
      await store.deleteProgram((program as any).id)
      deleted++
      process.stdout.write(`\r   🗑️  Supprimé: ${(program as any).title?.substring(0, 50) || (program as any).id}... (${deleted}/${allPrograms.length})`)
    }
    
    console.log('\n')
    console.log(`✅ ${deleted} programme(s) supprimé(s)`)
    console.log('')

    // Charger et importer les nouveaux programmes
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'))
    const programs = Array.isArray(content) ? content : (content.programs || [])
    
    if (programs.length === 0) {
      console.error('❌ Aucun programme trouvé dans le fichier')
      process.exit(1)
    }

    console.log(`📥 Import de ${programs.length} nouveau(x) programme(s)...`)
    console.log('')

    // Mapping des jours
    const dayToNumber: Record<string, number> = {
      'Lundi': 1, 'Mardi': 2, 'Mercredi': 3, 'Jeudi': 4,
      'Vendredi': 5, 'Samedi': 6, 'Dimanche': 0
    }

    // Fonction pour calculer la durée
    function calculateDuration(start: string, end: string): number {
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      let startMin = sh * 60 + sm
      let endMin = eh * 60 + em
      if (endMin < startMin) endMin += 24 * 60
      return endMin - startMin
    }

    // Fonction pour normaliser categoryId
    function normalizeCategoryId(category: string): string {
      if (!category) return 'other'
      return category.toLowerCase()
        .replace(/ & /g, '-')
        .replace(/ /g, '-')
        .replace(/é/g, 'e')
        .replace(/è/g, 'e')
        .replace(/[^a-z0-9-]/g, '')
    }

    // Fonction pour mapper typeDiffusion vers type V3
    function mapType(typeDiffusion: string): string {
      if (!typeDiffusion) return 'PAD'
      const upper = typeDiffusion.toUpperCase()
      if (upper === 'LIVE' || upper === 'DIRECT') return 'LIVE'
      if (upper === 'REPLAY' || upper === 'REDIF' || upper === 'REDIFFUSION') return 'REPLAY'
      if (upper === 'ADS' || upper === 'PUBLICITE' || upper === 'COMMERCIAL') return 'ADS'
      return 'PAD'
    }

    let imported = 0
    let errors = 0
    const now = new Date().toISOString()

    for (const program of programs) {
      try {
        // Convertir les jours en nombres si nécessaire
        let daysNumbers: number[] = []
        if (Array.isArray(program.days)) {
          daysNumbers = program.days.map((d: any) => {
            if (typeof d === 'string') {
              return dayToNumber[d] !== undefined ? dayToNumber[d] : parseInt(d)
            }
            return d
          })
        }

        // Calculer la durée si nécessaire
        let duration = program.duration || program.durationMin
        if (!duration && program.start && program.end) {
          duration = calculateDuration(program.start, program.end)
        }

        // Préparer le programme pour V3
        const programToSave: any = {
          id: program.id,
          gridId: gridId,
          title: program.title,
          category: program.category || '',
          categoryId: normalizeCategoryId(program.category),
          type: mapType(program.typeDiffusion || program.type),
          typeDiffusion: program.typeDiffusion || program.type || 'PAD',
          days: daysNumbers,
          startTime: program.startTime || program.start,
          start: program.startTime || program.start,
          endTime: program.endTime || program.end,
          end: program.endTime || program.end,
          durationMin: duration,
          duration: duration,
          opStatus: program.opStatus || 'PLANNED',
          adsRequired: program.adsRequired !== undefined 
            ? program.adsRequired 
            : (program.category && (program.category.includes('Publicités') || program.category.includes('Sponsoring'))),
          description: program.description || '',
          createdAt: program.createdAt || now,
          updatedAt: now,
          createdBy: program.createdBy || 'system',
        }

        // Garder color si présent
        if (program.color) {
          programToSave.color = program.color
        }

        await store.saveProgram(programToSave)
        imported++
        process.stdout.write(`\r   ➕ Importé: ${program.title?.substring(0, 50) || program.id}... (${imported}/${programs.length})`)
      } catch (error: any) {
        errors++
        console.error(`\n   ❌ Erreur sur "${program.title || program.id}": ${error.message}`)
      }
    }

    console.log('\n')
    console.log('📊 Résumé final :')
    console.log(`   🗑️  Supprimés : ${deleted}`)
    console.log(`   ✅ Importés : ${imported}`)
    if (errors > 0) {
      console.log(`   ❌ Erreurs : ${errors}`)
    }
    console.log(`   📋 Total : ${programs.length} programme(s)`)
    console.log('')
    console.log(`✅ Grille "${(grid as any).name}" mise à jour avec succès !`)

  } catch (error: any) {
    console.error('❌ Erreur :', error.message)
    if (error.code === 'ENOENT') {
      console.error(`   Fichier non trouvé : ${filePath}`)
    }
    process.exit(1)
  }
}

// Point d'entrée
const gridId = process.argv[2]
const file = process.argv[3]

if (!gridId || !file) {
  console.error('Usage: tsx src/scripts/reset-and-import-programs.ts <gridId> <fichier-programmes.json>')
  console.error('\nExemple:')
  console.error('  tsx src/scripts/reset-and-import-programs.ts grid-ttv-2025-weekly programs-ttv-2025-v3.json')
  process.exit(1)
}

resetAndImport(gridId, file)

