/**
 * Script d'import de grille V3
 * Usage: tsx src/scripts/import-grid-v3.ts grille.json [--overwrite]
 */

import fs from 'fs/promises'
import path from 'path'
import * as store from '../store-v3-prisma'

async function importGrid(filePath: string) {
  try {
    const content = JSON.parse(await fs.readFile(filePath, 'utf-8'))
    
    // Vérifier la structure
    if (!content.grid) {
      console.error('❌ Format invalide : propriété "grid" manquante')
      process.exit(1)
    }

    const grid = content.grid
    const programs = content.programs || []

    // Vérifier si la grille existe déjà
    const existingGrid = await store.getGrid(grid.id)
    if (existingGrid) {
      console.log(`⚠️  Grille "${grid.name}" (${grid.id}) existe déjà.`)
      const overwrite = process.argv.includes('--overwrite')
      if (!overwrite) {
        console.log('   Utilisez --overwrite pour remplacer.')
        return
      }
      console.log('   Remplacement de la grille existante...')
    }

    // Sauvegarder la grille
    const gridToSave = {
      ...grid,
      createdAt: grid.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: grid.createdBy || 'system', // ID utilisateur système par défaut
    }
    await store.saveGrid(gridToSave)
    console.log(`✅ Grille "${grid.name}" importée (${grid.id})`)

    // Importer les programmes
    let imported = 0
    let skipped = 0
    let errors = 0

    for (const program of programs) {
      try {
        // Vérifier si le programme existe déjà
        const existingPrograms = await store.getPrograms(grid.id)
        const existing = existingPrograms.find((p: any) => p.id === program.id)
        
        if (existing && !process.argv.includes('--overwrite')) {
          skipped++
          continue
        }

        const programToSave = {
          ...program,
          gridId: grid.id,
          createdAt: program.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: program.createdBy || 'system',
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
    console.log(`   ✅ Importés : ${imported}`)
    if (skipped > 0) {
      console.log(`   ⏭️  Ignorés : ${skipped}`)
    }
    if (errors > 0) {
      console.log(`   ❌ Erreurs : ${errors}`)
    }
    console.log(`   📋 Total : ${programs.length} programme(s)`)
    console.log('')
    console.log(`✅ Grille "${grid.name}" importée avec succès !`)

  } catch (error: any) {
    console.error('❌ Erreur :', error.message)
    if (error.code === 'ENOENT') {
      console.error(`   Fichier non trouvé : ${filePath}`)
    }
    process.exit(1)
  }
}

// Point d'entrée
const filePath = process.argv[2]

if (!filePath) {
  console.error('Usage: tsx src/scripts/import-grid-v3.ts <fichier-grille.json> [--overwrite]')
  console.error('\nExemple:')
  console.error('  tsx src/scripts/import-grid-v3.ts programs-ttv-2025-v3.json --overwrite')
  process.exit(1)
}

importGrid(filePath)

