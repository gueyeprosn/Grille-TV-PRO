/**
 * Modèles de données V3 - GrilleTV Pro
 */

// 2.1 Grid (Grille)
export const GridSchema = {
  id: 'string',
  channelId: 'string',
  name: 'string',
  type: 'string', // "weekly" | "special" | "ramadan"
  startDate: 'string', // YYYY-MM-DD
  endDate: 'string',
  timezone: 'string', // "Africa/Dakar"
  status: 'string', // "draft" | "published" | "archived"
  version: 'number',
  createdBy: 'string',
  createdAt: 'string',
  updatedAt: 'string',
}

// 2.2 Program (Programme) - Version étendue
export const ProgramSchema = {
  id: 'string',
  gridId: 'string',
  title: 'string',
  categoryId: 'string',
  category: 'string', // Compatibilité V2
  type: 'string', // "LIVE" | "PAD" | "REPLAY" | "SPECIAL"
  typeDiffusion: 'string', // Compatibilité V2
  days: 'array', // number[] ou string[]
  startTime: 'string', // "HH:MM"
  start: 'string', // Compatibilité V2
  endTime: 'string', // "HH:MM"
  end: 'string', // Compatibilité V2
  durationMin: 'number',
  duration: 'number', // Compatibilité V2
  description: 'string',
  
  // Coordination (communication)
  opStatus: 'string', // "PLANNED" | "CONFIRMED" | "IN_PRODUCTION" | "READY" | "ON_AIR" | "DONE" | "CANCELED"
  productionNotes: 'string',
  commercialNotes: 'string',
  
  // Commercial
  adsRequired: 'boolean',
  sponsorName: 'string',
  sponsorRef: 'string',
  
  createdAt: 'string',
  updatedAt: 'string',
}

// 2.3 Incident
export const IncidentSchema = {
  id: 'string',
  gridId: 'string',
  programId: 'string',
  time: 'string', // ISO
  area: 'string', // "TECH" | "POST" | "PROD" | "PLAYOUT" | "NETWORK"
  severity: 'string', // "LOW" | "MEDIUM" | "CRITICAL"
  description: 'string',
  impact: 'string',
  actionTaken: 'string',
  actionNext: 'string',
  status: 'string', // "OPEN" | "IN_PROGRESS" | "RESOLVED"
  assignedTo: 'string',
  createdBy: 'string',
  createdAt: 'string',
  updatedAt: 'string',
}

// 2.4 Deviation (Écart)
export const DeviationSchema = {
  id: 'string',
  gridId: 'string',
  programId: 'string',
  type: 'string', // "REPORT" | "REPLACEMENT" | "CANCELLATION"
  planned: 'object', // { title, start, end }
  aired: 'object', // { title, start, end }
  justification: 'string',
  approvedBy: 'string',
  createdBy: 'string',
  createdAt: 'string',
}

// 2.5 AdLog (Publicités)
export const AdLogSchema = {
  id: 'string',
  gridId: 'string',
  timePlanned: 'string', // ISO
  advertiser: 'string',
  spotTitle: 'string',
  durationSec: 'number',
  status: 'string', // "AIRED" | "MISSED"
  notes: 'string',
  relatedProgramId: 'string',
  createdBy: 'string',
  createdAt: 'string',
}

// 2.6 ShiftLog (Journal de bord)
export const ShiftLogSchema = {
  id: 'string',
  gridId: 'string',
  shiftStart: 'string', // ISO
  shiftEnd: 'string', // ISO
  outgoingTeam: 'string',
  incomingTeam: 'string',
  activities: 'array', // [{ time, action, status, notes }]
  incidents: 'array', // string[] (ids)
  pendingTasks: 'array', // [{ title, owner, state, deadline }]
  handoverNotes: 'string',
  specialInstructions: 'string',
  signatures: 'object', // { outgoing, incoming }
  createdBy: 'string',
  createdAt: 'string',
}

// 2.7 NotificationRule (Telegram)
export const NotificationRuleSchema = {
  id: 'string',
  channelId: 'string',
  event: 'string', // "PROGRAM_UPDATED", "INCIDENT_CRITICAL", etc.
  target: 'string', // "TELEGRAM"
  chatId: 'string',
  enabled: 'boolean',
  throttlingSec: 'number',
  createdAt: 'string',
  updatedAt: 'string',
}

// 2.8 User (avec rôles)
export const UserSchema = {
  id: 'string',
  email: 'string',
  displayName: 'string',
  role: 'string', // "ADMIN" | "PROGRAMMER" | "PRODUCTION" | "COMMERCIAL" | "DIRECTION"
  createdAt: 'string',
}

