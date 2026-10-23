/**
 * Générateurs de programmes Ramadan réalistes
 */

import { ProgramType, OpStatus } from '@prisma/client'
import type { RamadanProgram, RamadanFlags } from './types.js'

/**
 * Crée un programme avec flags Ramadan
 */
function createRamadanProgram(
  title: string,
  type: ProgramType,
  startTime: string,
  endTime: string,
  days: number[],
  flags: Partial<RamadanFlags> = {},
  category?: string,
  description?: string
): RamadanProgram {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startMinutes = (startH || 0) * 60 + (startM || 0)
  const endMinutes = (endH || 0) * 60 + (endM || 0)
  const durationMin = endMinutes - startMinutes

  const result: RamadanProgram = {
    title,
    type,
    startTime,
    endTime,
    durationMin,
    days,
    opStatus: OpStatus.READY,
    flags: {
      isRamadan: true,
      isCritical: false,
      isEvent: false,
      isCommercial: false,
      ...flags,
    },
  }
  
  if (category) {
    result.category = category
  }
  
  if (description) {
    result.description = description
  }
  
  return result
}

/**
 * Programme de secours (fallback)
 */
export function createFallbackProgram(
  startTime: string,
  endTime: string,
  days: number[]
): RamadanProgram {
  return createRamadanProgram(
    '🎵 Animation / Xassida / Coran',
    ProgramType.PAD,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: false,
      isEvent: false,
      isCommercial: false,
      fallbackContent: 'Animation musicale, récitations coraniques, invocations',
    },
    'Animation',
    'Programme de secours - Animation musicale et religieuse'
  )
}

/**
 * SUHUR (repas avant l'aube)
 */
export function createSuhurProgram(
  startTime: string,
  endTime: string,
  days: number[]
): RamadanProgram {
  return createRamadanProgram(
    'Suhur',
    ProgramType.LIVE,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: true,
      isEvent: false,
      isCommercial: false,
    },
    'Religieux',
    'Repas avant l\'aube - Préparation au jeûne'
  )
}

/**
 * FAJR (prière de l'aube)
 */
export function createFajrProgram(
  startTime: string,
  endTime: string,
  days: number[]
): RamadanProgram {
  return createRamadanProgram(
    'Fajr',
    ProgramType.LIVE,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: true,
      isEvent: false,
      isCommercial: false,
    },
    'Religieux',
    'Prière de l\'aube en direct'
  )
}

/**
 * TAFSIR (exégèse coranique)
 */
export function createTafsirProgram(
  startTime: string,
  endTime: string,
  days: number[]
): RamadanProgram {
  return createRamadanProgram(
    'Tafsir',
    ProgramType.REPLAY,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: false,
      isEvent: false,
      isCommercial: false,
    },
    'Religieux',
    'Exégèse coranique'
  )
}

/**
 * PLATEAU PRÉ-IFTAR
 */
export function createPreIftarPlateauProgram(
  startTime: string,
  endTime: string,
  days: number[],
  isCommercial: boolean = false
): RamadanProgram {
  return createRamadanProgram(
    'Plateau Pré-Iftar',
    ProgramType.LIVE,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: false,
      isEvent: true,
      isCommercial,
    },
    'Magazine',
    'Plateau d\'animation avant la rupture du jeûne'
  )
}

/**
 * IFTAR EN DIRECT
 */
export function createIftarProgram(
  startTime: string,
  endTime: string,
  days: number[]
): RamadanProgram {
  return createRamadanProgram(
    'Iftar EN DIRECT',
    ProgramType.LIVE,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: true,
      isEvent: true,
      isCommercial: false,
    },
    'Religieux',
    'Rupture du jeûne en direct'
  )
}

/**
 * TARAWIH EN DIRECT
 */
export function createTarawihProgram(
  startTime: string,
  endTime: string,
  days: number[]
): RamadanProgram {
  return createRamadanProgram(
    'Tarawih EN DIRECT',
    ProgramType.LIVE,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: true,
      isEvent: true,
      isCommercial: false,
    },
    'Religieux',
    'Prière du Tarawih en direct depuis la mosquée'
  )
}

/**
 * XASSIDA / CORAN / INVOCATION
 */
export function createXassidaProgram(
  startTime: string,
  endTime: string,
  days: number[]
): RamadanProgram {
  return createRamadanProgram(
    'Xassida / Coran / Invocation',
    ProgramType.PAD,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: false,
      isEvent: false,
      isCommercial: false,
    },
    'Religieux',
    'Récitations religieuses'
  )
}

/**
 * Programme commercial/sponsorisé
 */
export function createCommercialProgram(
  title: string,
  startTime: string,
  endTime: string,
  days: number[],
  sponsor?: string
): RamadanProgram {
  return createRamadanProgram(
    title,
    ProgramType.ADS,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: false,
      isEvent: true,
      isCommercial: true,
    },
    'Commercial',
    sponsor ? `Programme sponsorisé par ${sponsor}` : 'Programme commercial'
  )
}

/**
 * Programme générique (replay, pad, etc.)
 */
export function createGenericProgram(
  title: string,
  type: ProgramType,
  startTime: string,
  endTime: string,
  days: number[],
  category?: string
): RamadanProgram {
  return createRamadanProgram(
    title,
    type,
    startTime,
    endTime,
    days,
    {
      isRamadan: true,
      isCritical: false,
      isEvent: false,
      isCommercial: false,
    },
    category
  )
}

