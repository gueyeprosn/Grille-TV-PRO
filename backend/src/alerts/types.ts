/**
 * Types pour le système d'alertes broadcast
 */

// Types alignés avec Prisma schema
export type ProgramType = 'LIVE' | 'REPLAY' | 'PAD' | 'ADS' | 'SPECIAL'
export type OpStatus = 'DRAFT' | 'READY' | 'AIRED' | 'CANCELLED' | 'DELAYED' | 'OVERRUN' | 'SKIPPED' | 'MANUAL_OVERRIDE'

export interface Program {
  id: string
  title: string
  startTime: string // Format HH:MM
  endTime: string // Format HH:MM
  durationMin: number
  type: ProgramType
  category: string
  opStatus: OpStatus
  days: number[] // 0-6 (Dimanche-Samedi)
  description?: string | null
}

export interface DailyScheduleBlock {
  period: 'MORNING' | 'EVENING'
  startTime: string // Format HH:MM
  endTime: string // Format HH:MM
  programs: Program[]
  hasGap: boolean // Si aucun programme dans la plage
  gridName?: string // Nom de la grille
}

export interface PreparationAlert {
  program: Program
  alertType: 'DIRECT' | 'COMMERCIAL' | 'SPECIAL' // COMMERCIAL = ADS en Prisma
  minutesBefore: number
  scheduledTime: Date
}

export interface OnAirAlert {
  program: Program
  timeRemaining: number // Minutes restantes
  startedAt: Date
}

export interface AnomalyAlert {
  type: 'NOT_STARTED' | 'DELAYED' | 'OVERRUN' | 'SKIPPED' | 'MANUAL_OVERRIDE'
  program: Program
  expectedTime?: string
  actualTime?: string
  message: string
}

export interface EndOfServiceReport {
  date: Date
  totalPrograms: number
  directCount: number
  commercialCount: number
  specialCount: number
  incidents: AnomalyAlert[]
  summary: string
  gridName?: string // Nom de la grille
}

