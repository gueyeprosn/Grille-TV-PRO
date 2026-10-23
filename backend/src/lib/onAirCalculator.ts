/**
 * Calcul automatique du statut ON_AIR pour les programmes
 * 
 * Règles métier :
 * - Basé sur startTime, endTime, date courante et fuseau horaire
 * - Calcul côté backend uniquement
 * - Override manuel possible pour ADMIN
 */

import { OpStatus } from '@prisma/client'

export interface ProgramTimeData {
  startTime: string // Format "HH:MM"
  endTime: string // Format "HH:MM"
  days?: number[] // Jours de diffusion (0=Dimanche, 1=Lundi, ..., 6=Samedi)
  opStatus?: OpStatus
}

// Mapping entre les statuts Prisma et les statuts frontend
// Prisma : DRAFT, READY, AIRED, CANCELLED, DELAYED, OVERRUN, SKIPPED, MANUAL_OVERRIDE
// Frontend : PLANNED, CONFIRMED, IN_PRODUCTION, READY, ON_AIR, DONE, CANCELED, DELAYED, OVERRUN, SKIPPED, MANUAL_OVERRIDE
export function mapOpStatusToFrontend(status: OpStatus): string {
  const mapping: Record<OpStatus, string> = {
    'DRAFT': 'PLANNED',
    'READY': 'READY',
    'AIRED': 'ON_AIR', // AIRED = ON_AIR en frontend
    'CANCELLED': 'CANCELED',
    'DELAYED': 'DELAYED',
    'OVERRUN': 'OVERRUN',
    'SKIPPED': 'SKIPPED',
    'MANUAL_OVERRIDE': 'MANUAL_OVERRIDE'
  }
  return mapping[status] || 'PLANNED'
}

export function mapOpStatusFromFrontend(status: string): OpStatus {
  const upper = status.toUpperCase()
  if (upper === 'READY' || upper === 'CONFIRMED' || upper === 'IN_PRODUCTION') return 'READY'
  if (upper === 'AIRED' || upper === 'ON_AIR' || upper === 'DONE') return 'AIRED'
  if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED'
  if (upper === 'DELAYED') return 'DELAYED'
  if (upper === 'OVERRUN') return 'OVERRUN'
  if (upper === 'SKIPPED') return 'SKIPPED'
  if (upper === 'MANUAL_OVERRIDE' || upper === 'MANUAL_OVERRIDE') return 'MANUAL_OVERRIDE'
  return 'DRAFT'
}

/**
 * Convertit une heure "HH:MM" en minutes depuis minuit
 */
function timeToMinutes(time: string): number {
  const parts = time.split(':')
  const hours = parts[0] ? Number(parts[0]) : 0
  const minutes = parts[1] ? Number(parts[1]) : 0
  return hours * 60 + minutes
}

/**
 * Vérifie si un jour est dans la liste des jours de diffusion
 */
function isDayInSchedule(dayIndex: number, days?: number[]): boolean {
  if (!days || days.length === 0) return true // Si pas de jours spécifiés, considérer tous les jours
  return days.includes(dayIndex)
}

function getBroadcastTime(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  const weekday = values.weekday
  const dayIndex = weekday
    ? ({ Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 } as Record<string, number>)[weekday]
    : undefined
  return { dayIndex, minutes: Number(values.hour) * 60 + Number(values.minute) }
}

/**
 * Calcule automatiquement le statut ON_AIR d'un programme
 * 
 * @param program Données du programme avec startTime, endTime, days
 * @param timezone Fuseau horaire (défaut: "Africa/Dakar" pour SN+)
 * @param currentDate Date/heure de référence (défaut: maintenant)
 * @returns Le statut calculé (ON_AIR si en cours, sinon conserve le statut existant)
 */
export function calculateOnAirStatus(
  program: ProgramTimeData,
  timezone: string = 'Africa/Dakar',
  currentDate: Date = new Date()
): OpStatus {
  // Un choix explicite de la régie ne doit pas être remplacé par le calcul horaire.
  if (program.opStatus === 'MANUAL_OVERRIDE') return 'MANUAL_OVERRIDE'
  
  try {
    const { dayIndex: currentDayIndex, minutes: currentMinutes } = getBroadcastTime(currentDate, timezone)
    if (currentDayIndex === undefined) return program.opStatus || 'DRAFT'

    const startMinutes = timeToMinutes(program.startTime)
    const endMinutes = timeToMinutes(program.endTime)
    const crossesMidnight = endMinutes <= startMinutes
    // Après minuit, un programme de nuit appartient au jour où il a commencé.
    const isAfterMidnightPart = crossesMidnight && currentMinutes < endMinutes
    const scheduledDay = isAfterMidnightPart ? (currentDayIndex + 6) % 7 : currentDayIndex

    if (!isDayInSchedule(scheduledDay, program.days)) {
      // Le programme n'est pas programmé aujourd'hui, ne pas mettre ON_AIR
      return program.opStatus || 'DRAFT'
    }
    
    // Vérifier si on est dans la plage horaire du programme
    // Gérer le cas où le programme passe minuit (ex: 23:00 - 01:00)
    let isInTimeRange = false
    
    if (!crossesMidnight) {
      // Cas normal : programme dans la même journée
      isInTimeRange = currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      // Cas où le programme passe minuit (ex: 23:00 - 01:00)
      isInTimeRange = currentMinutes >= startMinutes || currentMinutes < endMinutes
    }
    
    if (isInTimeRange) {
      // En Prisma, ON_AIR est représenté par AIRED
      return 'AIRED'
    }
    
    // Si on est avant le début, retourner le statut existant ou DRAFT
    if (!isAfterMidnightPart && currentMinutes < startMinutes) {
      return program.opStatus || 'DRAFT'
    }
    
    // Si on est après la fin, retourner AIRED (terminé) si le statut n'est pas déjà défini
    if (!isAfterMidnightPart && (crossesMidnight || currentMinutes >= endMinutes)) {
      // Si le statut est déjà défini (ex: CANCELLED), le conserver
      if (program.opStatus && program.opStatus !== 'DRAFT') {
        return program.opStatus
      }
      // Programmes terminés restent en AIRED (équivalent à DONE en frontend)
      return 'AIRED'
    }
    
    // Par défaut, conserver le statut existant
    return program.opStatus || 'DRAFT'
  } catch (error) {
    console.error('Erreur calcul statut ON_AIR:', error)
    // En cas d'erreur, conserver le statut existant
    return program.opStatus || 'DRAFT'
  }
}

/**
 * Met à jour automatiquement le statut ON_AIR pour une liste de programmes
 */
export function calculateOnAirStatusForPrograms(
  programs: ProgramTimeData[],
  timezone: string = 'Africa/Dakar',
  currentDate: Date = new Date()
): Array<ProgramTimeData & { calculatedOpStatus: OpStatus }> {
  return programs.map(program => ({
    ...program,
    calculatedOpStatus: calculateOnAirStatus(program, timezone, currentDate)
  }))
}
