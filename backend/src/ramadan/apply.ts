/**
 * Application de templates Ramadan à une grille
 */

import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'
import type { ApplyTemplateOptions, ApplyTemplateResult, RamadanProgram } from './types.js'
import { getTemplate } from './templates.js'
import { RamadanTemplateType } from './types.js'

const prisma = new PrismaClient()

/**
 * Convertit un programme Ramadan en format Prisma
 */
function convertRamadanProgramToPrisma(
  ramadanProgram: RamadanProgram,
  gridId: string,
  userId: string
) {
  // Stocker les flags dans la description (format JSON)
  const flagsJson = JSON.stringify(ramadanProgram.flags)
  const description = ramadanProgram.description 
    ? `${ramadanProgram.description}\n\n[RAMADAN_FLAGS]${flagsJson}[/RAMADAN_FLAGS]`
    : `[RAMADAN_FLAGS]${flagsJson}[/RAMADAN_FLAGS]`

  return {
    id: nanoid(),
    gridId,
    title: ramadanProgram.title,
    category: ramadanProgram.category || null,
    type: ramadanProgram.type,
    startTime: ramadanProgram.startTime,
    endTime: ramadanProgram.endTime,
    durationMin: ramadanProgram.durationMin,
    days: ramadanProgram.days,
    description,
    opStatus: ramadanProgram.opStatus,
    createdBy: userId,
  }
}

/**
 * Extrait les flags Ramadan depuis la description
 */
export function extractRamadanFlags(description: string | null): any {
  if (!description) return null
  
  const match = description.match(/\[RAMADAN_FLAGS\]([\s\S]*?)\[\/RAMADAN_FLAGS\]/)
  if (!match || !match[1]) return null
  
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

/**
 * Applique un template Ramadan à une grille
 */
export async function applyRamadanTemplate(
  options: ApplyTemplateOptions
): Promise<ApplyTemplateResult> {
  const { gridId, templateType, userId, overwriteExisting = false } = options

  const result: ApplyTemplateResult = {
    success: false,
    programsCreated: 0,
    programsSkipped: 0,
    errors: [],
    templateId: '',
    templateName: '',
  }

  try {
    // Vérifier que la grille existe
    const grid = await prisma.grid.findUnique({
      where: { id: gridId },
    })

    if (!grid) {
      result.errors.push(`Grille ${gridId} introuvable`)
      return result
    }

    // Récupérer le template
    const template = getTemplate(templateType)
    result.templateId = template.id
    result.templateName = template.name

    // Si overwriteExisting, supprimer les programmes existants
    if (overwriteExisting) {
      await prisma.program.deleteMany({
        where: { gridId },
      })
    }

    // Créer les programmes
    const programsToCreate = template.programs.map((ramadanProgram) =>
      convertRamadanProgramToPrisma(ramadanProgram, gridId, userId)
    )

    // Vérifier les conflits si on ne remplace pas
    if (!overwriteExisting) {
      for (const program of programsToCreate) {
        const existing = await prisma.program.findFirst({
          where: {
            gridId,
            startTime: program.startTime,
            days: {
              hasSome: program.days,
            },
          },
        })

        if (existing) {
          result.programsSkipped++
          continue
        }

        try {
          await prisma.program.create({ data: program })
          result.programsCreated++
        } catch (error: any) {
          result.errors.push(`Erreur création ${program.title}: ${error.message}`)
        }
      }
    } else {
      // Créer tous les programmes
      try {
        await prisma.program.createMany({
          data: programsToCreate,
          skipDuplicates: true,
        })
        result.programsCreated = programsToCreate.length
      } catch (error: any) {
        result.errors.push(`Erreur création en masse: ${error.message}`)
      }
    }

    // Créer un log d'audit
    try {
      await prisma.auditLog.create({
        data: {
          entityType: 'GRID',
          entityId: gridId,
          action: 'RAMADAN_TEMPLATE_APPLIED',
          userId,
          changes: JSON.stringify({
            templateId: template.id,
            templateName: template.name,
            templateType,
            programsCreated: result.programsCreated,
            programsSkipped: result.programsSkipped,
            overwriteExisting,
          }),
        },
      })
    } catch (error: any) {
      // Log d'audit non critique
      console.warn('Erreur création log audit:', error.message)
    }

    result.success = result.errors.length === 0
    return result
  } catch (error: any) {
    result.errors.push(`Erreur fatale: ${error.message}`)
    return result
  }
}

/**
 * Applique plusieurs templates selon les jours de la semaine
 */
export async function applyRamadanTemplatesByWeek(
  gridId: string,
  startDate: Date,
  endDate: Date,
  userId: string,
  overwriteExisting: boolean = false
): Promise<ApplyTemplateResult[]> {
  const results: ApplyTemplateResult[] = []

  // Appliquer le template Semaine pour Lundi-Jeudi
  const weekResult = await applyRamadanTemplate({
    gridId,
    templateType: RamadanTemplateType.WEEK,
    startDate,
    endDate,
    userId,
    overwriteExisting,
  })
  results.push(weekResult)

  // Appliquer le template Vendredi
  const fridayResult = await applyRamadanTemplate({
    gridId,
    templateType: RamadanTemplateType.FRIDAY,
    startDate,
    endDate,
    userId,
    overwriteExisting: false, // Ne pas écraser les programmes de la semaine
  })
  results.push(fridayResult)

  // Appliquer le template Week-end
  const weekendResult = await applyRamadanTemplate({
    gridId,
    templateType: RamadanTemplateType.WEEKEND,
    startDate,
    endDate,
    userId,
    overwriteExisting: false,
  })
  results.push(weekendResult)

  return results
}

