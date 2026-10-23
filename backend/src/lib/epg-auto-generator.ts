/**
 * Service de génération automatique d'EPG
 * Génère automatiquement l'EPG lorsqu'une grille est modifiée
 */

import { PrismaClient } from '@prisma/client'
import { generateEPG } from './epg-generator.js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const prisma = new PrismaClient()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Dossier pour stocker les EPG générés automatiquement
const EPG_OUTPUT_DIR = path.join(__dirname, '../../epg-output')

// S'assurer que le dossier existe
if (!fs.existsSync(EPG_OUTPUT_DIR)) {
  fs.mkdirSync(EPG_OUTPUT_DIR, { recursive: true })
}

/**
 * Génère automatiquement l'EPG pour une grille et le sauvegarde
 * @param gridId ID de la grille
 */
export async function autoGenerateEPG(gridId: string): Promise<string | null> {
  try {
    // Générer l'EPG
    const epg = await generateEPG(gridId)
    
    // Récupérer le nom de la grille pour le nom de fichier
    const grid = await prisma.grid.findUnique({
      where: { id: gridId },
      select: { name: true },
    })
    
    const filename = `epg-${gridId}-${new Date().toISOString().split('T')[0]}.json`
      .replace(/[^a-z0-9.-]/gi, '-')
      .toLowerCase()
    
    const filepath = path.join(EPG_OUTPUT_DIR, filename)
    
    // Sauvegarder le fichier
    fs.writeFileSync(filepath, JSON.stringify(epg, null, 2), 'utf-8')
    
    console.log(`✅ EPG généré automatiquement: ${filepath}`)
    
    return filepath
  } catch (error: any) {
    console.error(`❌ Erreur génération automatique EPG pour ${gridId}:`, error.message)
    return null
  }
}

/**
 * Génère l'EPG pour toutes les grilles actives
 */
export async function autoGenerateEPGForAllActiveGrids(): Promise<void> {
  try {
    const today = new Date()
    const dayOfWeek = today.getDay()
    
    // Récupérer toutes les grilles actives
    const activeGrids = await prisma.grid.findMany({
      where: {
        programs: {
          some: {
            days: {
              has: dayOfWeek,
            },
          },
        },
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        name: true,
      },
      distinct: ['id'],
    })
    
    console.log(`📺 Génération automatique EPG pour ${activeGrids.length} grille(s) active(s)`)
    
    for (const grid of activeGrids) {
      await autoGenerateEPG(grid.id)
    }
    
    console.log(`✅ Génération automatique EPG terminée`)
  } catch (error: any) {
    console.error('❌ Erreur génération automatique EPG:', error.message)
  }
}

/**
 * Obtient le chemin du dernier EPG généré pour une grille
 */
export function getLatestEPGPath(gridId: string): string | null {
  try {
    const files = fs.readdirSync(EPG_OUTPUT_DIR)
    const gridFiles = files
      .filter(f => f.startsWith(`epg-${gridId}-`) && f.endsWith('.json'))
      .sort()
      .reverse()
    
    if (gridFiles.length === 0) {
      return null
    }
    
    const latestFile = gridFiles[0]
    if (!latestFile) {
      return null
    }
    return path.join(EPG_OUTPUT_DIR, latestFile)
  } catch (error: any) {
    console.error(`❌ Erreur lecture EPG pour ${gridId}:`, error.message)
    return null
  }
}

