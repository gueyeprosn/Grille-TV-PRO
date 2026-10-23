/**
 * Store V3 avec Prisma - Remplacement de store-v3.js
 * 
 * Utilise PostgreSQL comme source de vérité via Prisma
 * Compatible avec l'API existante
 */

import prisma from './lib/prisma.js'
import { Prisma, PrismaClient } from '@prisma/client'
import type { NotificationRule } from '@prisma/client'

type PrismaDatabase = PrismaClient | Prisma.TransactionClient

// ============================================
// GRIDS
// ============================================

export async function getGrids() {
  return prisma.grid.findMany({
    orderBy: [
      { isDefault: 'desc' }, // Grilles par défaut en premier
      { createdAt: 'desc' }
    ],
    include: {
      creator: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      }
    }
  })
}

export async function getDefaultGrid() {
  return prisma.grid.findFirst({
    where: { isDefault: true },
    include: {
      creator: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      }
    }
  })
}

export async function getGrid(id: string) {
  return prisma.grid.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      }
    }
  })
}

export async function setGrids(list: any[]) {
  // Non utilisé avec Prisma - utiliser saveGrid individuellement
  throw new Error('setGrids non supporté avec Prisma - utiliser saveGrid')
}

export async function saveGrid(grid: any, database: PrismaDatabase = prisma) {
  // Mapper le type de grille : Prisma accepte uniquement WEEKLY, DAILY, CUSTOM
  // La validation backend accepte aussi SPECIAL et RAMADAN
  const mapGridType = (type: string | undefined): 'WEEKLY' | 'DAILY' | 'CUSTOM' => {
    if (!type) return 'WEEKLY'
    const upper = type.toUpperCase()
    if (upper === 'WEEKLY' || upper === 'DAILY' || upper === 'CUSTOM') {
      return upper as 'WEEKLY' | 'DAILY' | 'CUSTOM'
    }
    // SPECIAL et RAMADAN → CUSTOM
    if (upper === 'SPECIAL' || upper === 'RAMADAN') return 'CUSTOM'
    return 'WEEKLY' // Par défaut
  }

  const data: any = {
    id: grid.id,
    name: grid.name,
    type: mapGridType(grid.type),
    startDate: new Date(grid.startDate),
    endDate: new Date(grid.endDate),
    status: (grid.status?.toUpperCase() || 'DRAFT') as any,
    publishedAt: grid.publishedAt ? new Date(grid.publishedAt) : null,
    archivedAt: grid.archivedAt ? new Date(grid.archivedAt) : null,
    isDefault: grid.isDefault === true || grid.isDefault === 'true',
    creator: {
      connect: { id: grid.createdBy }
    }
  }

  return database.grid.upsert({
    where: { id: grid.id },
    update: {
      name: data.name,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status,
      publishedAt: data.publishedAt,
      archivedAt: data.archivedAt,
      isDefault: data.isDefault
    },
    create: data
  })
}

export async function deleteGrid(id: string) {
  return prisma.grid.delete({
    where: { id }
  })
}

// ============================================
// PROGRAMS
// ============================================

export async function getPrograms(gridId: string | null = null) {
  const whereClause = gridId ? { gridId, archivedAt: null } : { archivedAt: null }
  return prisma.program.findMany({
    ...(Object.keys(whereClause).length > 0 && { where: whereClause }),
    orderBy: [
      { startTime: 'asc' },
      { createdAt: 'asc' }
    ],
    include: {
      creator: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      }
    }
  })
}

export async function getProgram(id: string) {
  return prisma.program.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          email: true,
          displayName: true
        }
      }
    }
  })
}

export async function setPrograms(list: any[]) {
  throw new Error('setPrograms non supporté avec Prisma - utiliser saveProgram')
}

export async function saveProgram(program: any, database: PrismaDatabase = prisma) {
  // Convertir les jours si nécessaire
  let days: number[] = []
  if (Array.isArray(program.days)) {
    const dayMap: Record<string, number> = {
      'Dimanche': 0, 'Sunday': 0,
      'Lundi': 1, 'Monday': 1,
      'Mardi': 2, 'Tuesday': 2,
      'Mercredi': 3, 'Wednesday': 3,
      'Jeudi': 4, 'Thursday': 4,
      'Vendredi': 5, 'Friday': 5,
      'Samedi': 6, 'Saturday': 6
    }
    days = program.days.map((d: any) => {
      if (typeof d === 'number') return d
      if (typeof d === 'string') return dayMap[d] ?? parseInt(d)
      return 0
    }).filter((d: number) => d >= 0 && d <= 6)
  }

  // Mapper opStatus de la validation backend vers les valeurs Prisma
  // Prisma accepte : DRAFT, READY, AIRED, CANCELLED, DELAYED, OVERRUN, SKIPPED, MANUAL_OVERRIDE
  // Validation accepte : PLANNED, CONFIRMED, IN_PRODUCTION, READY, ON_AIR, DONE, CANCELED, DELAYED, OVERRUN, SKIPPED, MANUAL_OVERRIDE
  const mapOpStatus = (status: string | undefined): 'DRAFT' | 'READY' | 'AIRED' | 'CANCELLED' | 'DELAYED' | 'OVERRUN' | 'SKIPPED' | 'MANUAL_OVERRIDE' => {
    if (!status) return 'DRAFT'
    const upper = status.toUpperCase()
    // Mapping vers les valeurs Prisma
    if (upper === 'READY' || upper === 'CONFIRMED' || upper === 'IN_PRODUCTION') return 'READY'
    if (upper === 'AIRED' || upper === 'ON_AIR' || upper === 'DONE') return 'AIRED'
    if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED'
    if (upper === 'DELAYED') return 'DELAYED'
    if (upper === 'OVERRUN') return 'OVERRUN'
    if (upper === 'SKIPPED') return 'SKIPPED'
    if (upper === 'MANUAL_OVERRIDE') return 'MANUAL_OVERRIDE'
    // Par défaut : DRAFT (pour PLANNED, etc.)
    return 'DRAFT'
  }

  // Mapper le type de programme
  const mapProgramType = (type: string | undefined): 'LIVE' | 'REPLAY' | 'PAD' | 'ADS' | 'SPECIAL' => {
    if (!type) return 'PAD'
    const upper = type.toUpperCase()
    if (['LIVE', 'REPLAY', 'PAD', 'ADS', 'SPECIAL'].includes(upper)) {
      return upper as 'LIVE' | 'REPLAY' | 'PAD' | 'ADS' | 'SPECIAL'
    }
    // Mapping des anciens types
    if (upper === 'LIVE' || upper.includes('LIVE')) return 'LIVE'
    if (upper === 'REPLAY' || upper.includes('REPLAY')) return 'REPLAY'
    if (upper === 'ADS' || upper.includes('ADS') || upper.includes('PUBLICITE')) return 'ADS'
    if (upper === 'SPECIAL' || upper.includes('SPECIAL')) return 'SPECIAL'
    return 'PAD' // Par défaut
  }

  // Préparer les données pour Prisma (uniquement les champs du schéma)
  const updateData: any = {
    title: program.title,
    startTime: program.startTime || program.start,
    endTime: program.endTime || program.end,
    durationMin: program.durationMin || program.duration || 60,
    days,
    category: program.category || null,
    type: mapProgramType(program.type || program.typeDiffusion),
    typeDiffusion: program.typeDiffusion || null,
    description: program.description || null,
    opStatus: mapOpStatus(program.opStatus),
  }
  
  // Supprimer les champs undefined/null pour éviter les erreurs Prisma
  Object.keys(updateData).forEach(key => {
    if (updateData[key] === undefined) {
      delete updateData[key]
    }
  })

  console.error('[STORE] 🔍 Vérification programme existant:', program.id)
  const existing = await database.program.findUnique({ where: { id: program.id } })

  if (existing) {
    console.error('[STORE] 🔄 Mise à jour programme existant:', program.id)
    return database.program.update({
      where: { id: program.id },
      data: updateData
    })
  } else {
    console.error('[STORE] ➕ Création nouveau programme:', JSON.stringify({
      id: program.id,
      title: updateData.title,
      gridId: program.gridId,
      createdBy: program.createdBy,
      startTime: updateData.startTime,
      endTime: updateData.endTime,
      days: updateData.days
    }))
    try {
      const created = await database.program.create({
      data: {
        id: program.id,
        ...updateData,
        grid: {
          connect: { id: program.gridId }
        },
        creator: {
          connect: { id: program.createdBy }
        }
      }
    })
      console.error('[STORE] ✅ Programme créé avec succès dans Prisma:', created.id)
      return created
    } catch (error: any) {
      console.error('[STORE] ❌ Erreur Prisma lors de la création:', JSON.stringify({
        message: error.message,
        code: error.code,
        meta: error.meta
      }))
      throw error
    }
  }
}

export async function deleteProgram(id: string) {
  return prisma.program.delete({
    where: { id }
  })
}

// ============================================
// INCIDENTS
// ============================================

export async function getIncidents(gridId: string | null = null) {
  const whereClause = gridId ? { gridId } : {}
  return prisma.incident.findMany({
    ...(Object.keys(whereClause).length > 0 && { where: whereClause }),
    orderBy: { createdAt: 'desc' }
  })
}

export async function saveIncident(incident: any) {
  const updateData: any = {
    title: incident.title,
    description: incident.description,
    severity: incident.severity || null,
  }

  if (incident.programId !== undefined) {
    updateData.programId = incident.programId || null
  }

  const existing = await prisma.incident.findUnique({ where: { id: incident.id } })

  if (existing) {
    return prisma.incident.update({
      where: { id: incident.id },
      data: updateData
    })
  } else {
    return prisma.incident.create({
      data: {
        id: incident.id,
        ...updateData,
        gridId: incident.gridId
      }
    })
  }
}

export async function deleteIncident(id: string) {
  return prisma.incident.delete({
    where: { id }
  })
}

// ============================================
// DEVIATIONS
// ============================================

export async function getDeviations(gridId: string | null = null) {
  const whereClause = gridId ? { gridId } : {}
  return prisma.deviation.findMany({
    ...(Object.keys(whereClause).length > 0 && { where: whereClause }),
    orderBy: { createdAt: 'desc' }
  })
}

export async function saveDeviation(deviation: any) {
  const updateData: any = {
    plannedTime: deviation.plannedTime || deviation.planned?.start || '00:00',
    actualTime: deviation.actualTime || deviation.aired?.start || '00:00',
    plannedDuration: deviation.plannedDuration || 
      (deviation.planned?.duration ? parseInt(deviation.planned.duration) : 60),
    actualDuration: deviation.actualDuration || 
      (deviation.aired?.duration ? parseInt(deviation.aired.duration) : 60),
    reason: deviation.reason || deviation.justification,
  }

  if (deviation.programId !== undefined) {
    updateData.programId = deviation.programId || null
  }

  const existing = await prisma.deviation.findUnique({ where: { id: deviation.id } })

  if (existing) {
    return prisma.deviation.update({
      where: { id: deviation.id },
      data: updateData
    })
  } else {
    return prisma.deviation.create({
      data: {
        id: deviation.id,
        ...updateData,
        gridId: deviation.gridId
      }
    })
  }
}

// ============================================
// AD LOGS
// ============================================

export async function getAdLogs(gridId: string | null = null) {
  const whereClause = gridId ? { gridId } : {}
  return prisma.adLog.findMany({
    ...(Object.keys(whereClause).length > 0 && { where: whereClause }),
    orderBy: { createdAt: 'asc' }
  })
}

export async function saveAdLog(adLog: any) {
  const updateData: any = {
    title: adLog.title || adLog.spotTitle,
    durationMin: adLog.durationMin || (adLog.durationSec ? Math.ceil(adLog.durationSec / 60) : null),
  }

  if (adLog.programId !== undefined) {
    updateData.programId = adLog.programId || null
  }

  const existing = await prisma.adLog.findUnique({ where: { id: adLog.id } })

  if (existing) {
    return prisma.adLog.update({
      where: { id: adLog.id },
      data: updateData
    })
  } else {
    return prisma.adLog.create({
      data: {
        id: adLog.id || undefined,
        ...updateData,
        gridId: adLog.gridId
      }
    })
  }
}

// ============================================
// SHIFT LOGS
// ============================================

export async function getShiftLogs(gridId: string | null = null) {
  const whereClause = gridId ? { gridId } : {}
  return prisma.shiftLog.findMany({
    ...(Object.keys(whereClause).length > 0 && { where: whereClause }),
    orderBy: { createdAt: 'desc' }
  })
}

export async function saveShiftLog(shiftLog: any) {
  const updateData: any = {
    shiftDate: new Date(shiftLog.shiftDate || shiftLog.shiftStart || new Date()),
    shiftType: (shiftLog.shiftType?.toUpperCase() || 'DAY') as any,
    operatorName: shiftLog.operatorName || shiftLog.outgoingTeam,
    activities: shiftLog.activities ? (typeof shiftLog.activities === 'string' ? shiftLog.activities : JSON.stringify(shiftLog.activities)) : null,
    notes: shiftLog.notes || shiftLog.handoverNotes,
    issues: shiftLog.issues || shiftLog.specialInstructions,
    handoverTo: shiftLog.handoverTo || shiftLog.incomingTeam,
  }

  const existing = await prisma.shiftLog.findUnique({ where: { id: shiftLog.id } })

  if (existing) {
    return prisma.shiftLog.update({
      where: { id: shiftLog.id },
      data: updateData
    })
  } else {
    return prisma.shiftLog.create({
      data: {
        id: shiftLog.id,
        ...updateData,
        grid: {
          connect: { id: shiftLog.gridId }
        },
        creator: {
          connect: { id: shiftLog.createdBy }
        }
      }
    })
  }
}

// ============================================
// NOTIFICATION RULES
// ============================================

// L'interface envoie `event` et un délai en secondes ; le validateur et le
// notifier Telegram acceptent aussi `eventType` et `throttleMin`. Les entrées
// sont normalisées ici pour que la base ne stocke qu'une seule forme.
export type NotificationRuleInput = {
  event?: unknown
  eventType?: unknown
  chatId?: unknown
  target?: unknown
  channelId?: unknown
  enabled?: unknown
  throttlingSec?: unknown
  throttleMin?: unknown
  lastSentAt?: unknown
}

function readEventType(input: NotificationRuleInput): string | undefined {
  const value = input.eventType ?? input.event
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readThrottleSec(input: NotificationRuleInput): number | undefined {
  if (typeof input.throttlingSec === 'number' && Number.isFinite(input.throttlingSec)) {
    return Math.max(0, Math.round(input.throttlingSec))
  }
  if (typeof input.throttleMin === 'number' && Number.isFinite(input.throttleMin)) {
    return Math.max(0, Math.round(input.throttleMin * 60))
  }
  return undefined
}

function readText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readLastSentAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }
  return undefined
}

// Forme exposée par l'API : l'interface lit `event` et `throttlingSec`, et le
// notifier Telegram accepte ces deux noms.
function serializeNotificationRule(rule: NotificationRule) {
  return {
    id: rule.id,
    event: rule.eventType,
    chatId: rule.chatId,
    target: rule.target,
    channelId: rule.channelId,
    enabled: rule.enabled,
    throttlingSec: rule.throttleSec,
    lastSentAt: rule.lastSentAt,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  }
}

export type NotificationRuleView = ReturnType<typeof serializeNotificationRule>

export async function getNotificationRules(): Promise<NotificationRuleView[]> {
  const rules = await prisma.notificationRule.findMany({
    orderBy: { createdAt: 'desc' }
  })
  return rules.map(serializeNotificationRule)
}

export async function getNotificationRule(id: string): Promise<NotificationRuleView | null> {
  const rule = await prisma.notificationRule.findUnique({ where: { id } })
  return rule ? serializeNotificationRule(rule) : null
}

export async function createNotificationRule(
  id: string,
  input: NotificationRuleInput
): Promise<NotificationRuleView> {
  const eventType = readEventType(input)
  if (!eventType) {
    throw new Error('eventType requis')
  }
  const chatId = readText(input.chatId)
  if (!chatId) {
    throw new Error('chatId requis')
  }

  const data: Prisma.NotificationRuleUncheckedCreateInput = {
    id,
    eventType,
    chatId,
  }

  const target = readText(input.target)
  if (target) data.target = target
  const channelId = readText(input.channelId)
  if (channelId) data.channelId = channelId
  if (typeof input.enabled === 'boolean') data.enabled = input.enabled
  const throttleSec = readThrottleSec(input)
  if (throttleSec !== undefined) data.throttleSec = throttleSec
  const lastSentAt = readLastSentAt(input.lastSentAt)
  if (lastSentAt !== undefined) data.lastSentAt = lastSentAt

  const created = await prisma.notificationRule.create({ data })
  return serializeNotificationRule(created)
}

// Mise à jour partielle : seuls les champs réellement fournis sont écrits, afin
// qu'un envoi partiel depuis l'interface n'efface pas le reste de la règle.
export async function updateNotificationRule(
  id: string,
  input: NotificationRuleInput
): Promise<NotificationRuleView> {
  const data: Prisma.NotificationRuleUncheckedUpdateInput = {}

  const eventType = readEventType(input)
  if (eventType) data.eventType = eventType
  const chatId = readText(input.chatId)
  if (chatId) data.chatId = chatId
  const target = readText(input.target)
  if (target) data.target = target
  const channelId = readText(input.channelId)
  if (channelId) data.channelId = channelId
  if (typeof input.enabled === 'boolean') data.enabled = input.enabled
  const throttleSec = readThrottleSec(input)
  if (throttleSec !== undefined) data.throttleSec = throttleSec
  const lastSentAt = readLastSentAt(input.lastSentAt)
  if (lastSentAt !== undefined) data.lastSentAt = lastSentAt

  const updated = await prisma.notificationRule.update({ where: { id }, data })
  return serializeNotificationRule(updated)
}

export async function deleteNotificationRule(id: string) {
  return prisma.notificationRule.delete({ where: { id } })
}

// ============================================
// USERS
// ============================================

export async function getUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      passwordHash: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  })
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      passwordHash: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    }
  })
}

export async function saveUser(user: any) {
  const data: any = {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: (user.role?.toUpperCase() || 'VIEWER') as any,
    passwordHash: user.passwordHash,
    isActive: user.isActive !== undefined ? user.isActive : true
  }

  return prisma.user.upsert({
    where: { email: user.email },
    update: {
      displayName: data.displayName,
      role: data.role,
      passwordHash: data.passwordHash,
      isActive: data.isActive,
    },
    create: data
  })
}

