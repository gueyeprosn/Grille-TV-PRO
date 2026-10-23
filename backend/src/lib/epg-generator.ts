/**
 * Générateur d'EPG (Electronic Program Guide) pour vMix
 * Format JSON compatible avec vMix EPG
 */

import { PrismaClient } from '@prisma/client'
import { calculateOnAirStatusForPrograms } from './onAirCalculator.js'

const prisma = new PrismaClient()

export interface EPGProgram {
  title: string
  start: string // ISO 8601 timestamp
  stop: string // ISO 8601 timestamp
  description?: string | undefined
  category?: string | undefined
  type?: string | undefined
  status?: string | undefined
}

export interface EPGChannel {
  id: string
  name: string
  displayName: string
  programs: EPGProgram[]
}

export interface EPGData {
  version: string
  generatedAt: string
  channel: EPGChannel
}

/**
 * Génère l'EPG pour une grille donnée
 * @param gridId ID de la grille
 * @param date Date pour laquelle générer l'EPG (optionnel, par défaut aujourd'hui)
 * @returns EPG au format JSON compatible vMix
 */
export async function generateEPG(gridId: string, date?: Date): Promise<EPGData> {
  const targetDate = date || new Date()
  const dayOfWeek = targetDate.getDay() // 0 = Dimanche, 6 = Samedi
  
  // Récupérer la grille
  const grid = await prisma.grid.findUnique({
    where: { id: gridId },
    select: {
      id: true,
      name: true,
      type: true,
    },
  })

  if (!grid) {
    throw new Error(`Grille ${gridId} introuvable`)
  }

  // Récupérer les programmes du jour
  const programs = await prisma.program.findMany({
    where: {
      gridId,
      days: {
        has: dayOfWeek,
      },
    },
    orderBy: {
      startTime: 'asc',
        },
  })

  // Calculer les statuts ON AIR
  const programsWithStatus = calculateOnAirStatusForPrograms(programs)

  // Convertir en format EPG
  const epgPrograms: EPGProgram[] = programs.map((program, index) => {
    const statusData = programsWithStatus[index]
    // Construire les timestamps ISO 8601
    const [startHours, startMinutes] = (statusData?.startTime || program.startTime).split(':').map(Number)
    const [endHours, endMinutes] = (statusData?.endTime || program.endTime).split(':').map(Number)
    
    const startDate = new Date(targetDate)
    startDate.setHours(startHours || 0, startMinutes || 0, 0, 0)
    
    const endDate = new Date(targetDate)
    endDate.setHours(endHours || 0, endMinutes || 0, 0, 0)
    
    // Si l'heure de fin est avant l'heure de début, c'est le lendemain
    if (endDate <= startDate) {
      endDate.setDate(endDate.getDate() + 1)
    }

    return {
      title: program.title,
      start: startDate.toISOString(),
      stop: endDate.toISOString(),
      description: program.description ?? undefined,
      category: program.category ?? undefined,
      type: program.type ?? undefined,
      status: (statusData?.calculatedOpStatus || program.opStatus) ?? undefined,
    }
  })

  // Créer l'objet EPG
  const epg: EPGData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    channel: {
      id: grid.id,
      name: grid.name,
      displayName: grid.name,
      programs: epgPrograms,
    },
  }

  return epg
}

/**
 * Génère l'EPG pour une période (plusieurs jours)
 * @param gridId ID de la grille
 * @param startDate Date de début
 * @param endDate Date de fin
 * @returns EPG avec programmes pour tous les jours de la période
 */
export async function generateEPGForPeriod(
  gridId: string,
  startDate: Date,
  endDate: Date
): Promise<EPGData> {
  const grid = await prisma.grid.findUnique({
    where: { id: gridId },
    select: {
      id: true,
      name: true,
      type: true,
    },
  })

  if (!grid) {
    throw new Error(`Grille ${gridId} introuvable`)
  }

  // Récupérer tous les programmes de la grille
  const allPrograms = await prisma.program.findMany({
    where: {
      gridId,
    },
    orderBy: {
      startTime: 'asc',
    },
  })

  // Calculer les statuts ON AIR
  const programsWithStatus = calculateOnAirStatusForPrograms(allPrograms)

  // Convertir en format EPG pour tous les jours de la période
  const epgPrograms: EPGProgram[] = []
  
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    
    // Filtrer les programmes pour ce jour (utiliser les programmes originaux)
    const dayPrograms = allPrograms.filter((p) => (p.days || []).includes(dayOfWeek))
    
    for (const program of dayPrograms) {
      // Trouver le statut calculé correspondant
      const statusIndex = allPrograms.findIndex(p => p.id === program.id)
      const statusData = statusIndex >= 0 ? programsWithStatus[statusIndex] : null
      
      const [startHours, startMinutes] = (statusData?.startTime || program.startTime).split(':').map(Number)
      const [endHours, endMinutes] = (statusData?.endTime || program.endTime).split(':').map(Number)
      
      const startDateObj = new Date(currentDate)
      startDateObj.setHours(startHours || 0, startMinutes || 0, 0, 0)
      
      const endDateObj = new Date(currentDate)
      endDateObj.setHours(endHours || 0, endMinutes || 0, 0, 0)
      
      // Si l'heure de fin est avant l'heure de début, c'est le lendemain
      if (endDateObj <= startDateObj) {
        endDateObj.setDate(endDateObj.getDate() + 1)
      }

      epgPrograms.push({
        title: program.title,
        start: startDateObj.toISOString(),
        stop: endDateObj.toISOString(),
        description: program.description ?? undefined,
        category: program.category ?? undefined,
        type: program.type ?? undefined,
        status: (statusData?.calculatedOpStatus || program.opStatus) ?? undefined,
      })
    }
    
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Trier par date de début
  epgPrograms.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

  const epg: EPGData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    channel: {
      id: grid.id,
      name: grid.name,
      displayName: grid.name,
      programs: epgPrograms,
    },
  }

  return epg
}

