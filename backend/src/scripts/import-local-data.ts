import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as store from '../store-v3-prisma.js'
import prisma from '../lib/prisma.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function importAll() {
  try {
    const dataDir = path.resolve(__dirname, '../../data/v3')
    const gridsFile = path.join(dataDir, 'grids.json')
    const programsFile = path.join(dataDir, 'programs.json')

    if (!fs.existsSync(gridsFile) || !fs.existsSync(programsFile)) {
      console.error('Fichiers de données introuvables')
      process.exit(1)
    }

    const grids = JSON.parse(fs.readFileSync(gridsFile, 'utf-8'))
    const programs = JSON.parse(fs.readFileSync(programsFile, 'utf-8'))

    console.log(`🚀 Importation de ${grids.length} grilles...`)
    for (const grid of grids) {
      grid.createdBy = 'admin'
      await store.saveGrid(grid)
      console.log(`✅ Grille importée: ${grid.name} (${grid.id})`)
    }

    console.log(`🚀 Importation de ${programs.length} programmes...`)
    let imported = 0
    for (const prog of programs) {
      prog.createdBy = 'admin'
      try {
        await store.saveProgram(prog)
        imported++
      } catch (err: any) {
        console.error(`⚠️ Erreur import programme ${prog.title}:`, err.message)
      }
    }

    console.log(`🎉 Succès: ${grids.length} grilles et ${imported}/${programs.length} programmes importés dans PostgreSQL !`)
  } catch (error: any) {
    console.error('❌ Erreur générale:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importAll()
