/**
 * GÉNÉRATEUR DE RAPPORT DE DIFFUSION QUOTIDIEN
 * GrilleTV Pro - Système Broadcast Professionnel
 * 
 * Génère un rapport officiel de diffusion quotidien destiné simultanément à :
 * - La régie ON AIR
 * - La direction des programmes
 * - Le service commercial
 * 
 * Format : Texte structuré lisible sur Telegram et Email
 */

import type { Program } from './types.js'

export interface DailyBroadcastData {
  date: Date
  programs: ProgramWithStatus[]
  incidents?: Incident[]
  globalStatus?: 'OK' | 'ATTENTION' | 'CRITIQUE'
  gridName?: string
}

export interface ProgramWithStatus extends Program {
  status: 'DIFFUSÉ' | 'NON DIFFUSÉ'
  actualStartTime?: string
  actualEndTime?: string
  notes?: string
}

export interface Incident {
  time: string
  type: string
  description: string
  programId?: string
  severity: 'MINEUR' | 'MAJEUR' | 'CRITIQUE'
}

export interface DailyReport {
  telegramText: string
  emailHtml: string
  emailSubject: string
  emailText: string
}

/**
 * Génère le rapport de diffusion quotidien
 */
export function generateDailyBroadcastReport(data: DailyBroadcastData): DailyReport {
  const dateStr = formatDate(data.date)
  const dayName = data.date.toLocaleDateString('fr-FR', { weekday: 'long' })
  
  // Organiser les programmes par blocs horaires
  const morningBlock = getProgramsInBlock(data.programs, 'MATIN')
  const afternoonBlock = getProgramsInBlock(data.programs, 'APRÈS-MIDI')
  const eveningBlock = getProgramsInBlock(data.programs, 'SOIR')
  
  // Générer les sections
  const header = buildHeader(dateStr, dayName, data.gridName)
  const morningSection = buildBlockSection('MATIN', morningBlock)
  const afternoonSection = buildBlockSection('APRÈS-MIDI', afternoonBlock)
  const eveningSection = buildBlockSection('SOIR', eveningBlock)
  const regieSummary = buildRegieSummary(data)
  const directionSummary = buildDirectionSummary(data)
  const commercialSummary = buildCommercialSummary(data)
  const observationsSection = buildObservationsSection(data)
  const generationSection = buildGenerationSection(data.date)
  
  // Assembler le message Telegram
  const telegramText = formatTelegram(
    header,
    morningSection,
    afternoonSection,
    eveningSection,
    regieSummary,
    directionSummary,
    commercialSummary,
    observationsSection,
    generationSection
  )
  
  // Assembler le message Email
  const { html, subject, text } = formatEmail(
    header,
    morningSection,
    afternoonSection,
    eveningSection,
    regieSummary,
    directionSummary,
    commercialSummary,
    observationsSection,
    generationSection
  )
  
  return {
    telegramText,
    emailHtml: html,
    emailSubject: subject,
    emailText: text,
  }
}

/**
 * Formate la date en français
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Organise les programmes par bloc horaire
 */
function getProgramsInBlock(
  programs: ProgramWithStatus[],
  block: 'MATIN' | 'APRÈS-MIDI' | 'SOIR'
): ProgramWithStatus[] {
  const blockRanges = {
    MATIN: { start: '00:00', end: '12:00' },
    'APRÈS-MIDI': { start: '12:00', end: '18:00' },
    SOIR: { start: '18:00', end: '23:59' },
  }
  
  const range = blockRanges[block]
  
  return programs
    .filter(p => {
      const start = timeToMinutes(p.startTime)
      const blockStart = timeToMinutes(range.start)
      const blockEnd = timeToMinutes(range.end)
      return start >= blockStart && start < blockEnd
    })
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
}

/**
 * Convertit une heure HH:MM en minutes depuis minuit
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

/**
 * Construit l'en-tête du rapport
 */
function buildHeader(dateStr: string, dayName: string, gridName?: string): string {
  let header = `📺 GRILLETV PRO — RAPPORT DE DIFFUSION QUOTIDIEN\n`
  header += `📅 ${dayName} ${dateStr}\n`
  if (gridName) {
    header += `📋 Grille : ${gridName}\n`
  }
  return header
}

/**
 * Construit une section de bloc horaire
 */
function buildBlockSection(
  blockName: 'MATIN' | 'APRÈS-MIDI' | 'SOIR',
  programs: ProgramWithStatus[]
): string {
  let section = `\n${'═'.repeat(50)}\n`
  section += `📺 ${blockName}\n`
  section += `${'═'.repeat(50)}\n\n`
  
  if (programs.length === 0) {
    section += `⚠️ AUCUN PROGRAMME PLANIFIÉ\n`
    section += `   Remplissage antenne : Animation / Xassida / Auto-play\n\n`
    return section
  }
  
  // Détecter les plages horaires vides
  const timeSlots = detectEmptyTimeSlots(programs, blockName)
  
  let currentTime = getBlockStartTime(blockName)
  
  for (const program of programs) {
    // Vérifier s'il y a un gap avant ce programme
    const programStart = timeToMinutes(program.startTime)
    const currentTimeMinutes = timeToMinutes(currentTime)
    
    if (programStart > currentTimeMinutes) {
      const gapDuration = programStart - currentTimeMinutes
      section += `⚠️ PLAGE HORAIRE VIDE\n`
      section += `   ${currentTime} → ${program.startTime} (${formatDuration(gapDuration)})\n`
      section += `   Remplissage antenne : Animation / Xassida / Auto-play\n\n`
    }
    
    // Afficher le programme
    section += `🕐 ${program.startTime}\n`
    section += `📺 ${program.title}\n`
    section += `⏱️  Durée : ${formatDuration(program.durationMin)}\n`
    section += `📊 Statut : ${getStatusEmoji(program.status)} ${program.status}\n`
    section += `🎬 Type : ${getProgramTypeLabel(program.type)}\n`
    if (program.category) {
      section += `📂 Catégorie : ${program.category}\n`
    }
    if (program.actualStartTime && program.actualStartTime !== program.startTime) {
      section += `⏰ Début réel : ${program.actualStartTime}\n`
    }
    if (program.actualEndTime && program.actualEndTime !== program.endTime) {
      section += `⏰ Fin réelle : ${program.actualEndTime}\n`
    }
    if (program.notes) {
      section += `📝 Note : ${program.notes}\n`
    }
    section += `\n`
    
    currentTime = program.endTime
  }
  
  // Vérifier s'il y a un gap après le dernier programme
  const blockEnd = getBlockEndTime(blockName)
  const lastProgramEnd = timeToMinutes(programs[programs.length - 1]?.endTime || currentTime)
  const blockEndMinutes = timeToMinutes(blockEnd)
  
  if (lastProgramEnd < blockEndMinutes) {
    const gapDuration = blockEndMinutes - lastProgramEnd
    section += `⚠️ PLAGE HORAIRE VIDE\n`
    section += `   ${programs[programs.length - 1]?.endTime || currentTime} → ${blockEnd} (${formatDuration(gapDuration)})\n`
    section += `   Remplissage antenne : Animation / Xassida / Auto-play\n\n`
  }
  
  return section
}

/**
 * Détecte les plages horaires vides dans un bloc
 */
function detectEmptyTimeSlots(
  programs: ProgramWithStatus[],
  block: 'MATIN' | 'APRÈS-MIDI' | 'SOIR'
): Array<{ start: string; end: string; duration: number }> {
  const gaps: Array<{ start: string; end: string; duration: number }> = []
  
  if (programs.length === 0) {
    const blockStart = getBlockStartTime(block)
    const blockEnd = getBlockEndTime(block)
    gaps.push({
      start: blockStart,
      end: blockEnd,
      duration: timeToMinutes(blockEnd) - timeToMinutes(blockStart),
    })
    return gaps
  }
  
  const blockStart = getBlockStartTime(block)
  const blockEnd = getBlockEndTime(block)
  const firstProgram = programs[0]
  if (!firstProgram) return gaps
  
  // Gap avant le premier programme
  const firstProgramStart = timeToMinutes(firstProgram.startTime)
  const blockStartMinutes = timeToMinutes(blockStart)
  if (firstProgramStart > blockStartMinutes) {
    gaps.push({
      start: blockStart,
      end: firstProgram.startTime,
      duration: firstProgramStart - blockStartMinutes,
    })
  }
  
  // Gaps entre programmes
  for (let i = 0; i < programs.length - 1; i++) {
    const current = programs[i]
    const next = programs[i + 1]
    if (!current || !next) continue
    const currentEnd = timeToMinutes(current.endTime)
    const nextStart = timeToMinutes(next.startTime)
    
    if (nextStart > currentEnd) {
      gaps.push({
        start: current.endTime,
        end: next.startTime,
        duration: nextStart - currentEnd,
      })
    }
  }
  
  // Gap après le dernier programme
  const lastProgram = programs[programs.length - 1]
  if (!lastProgram) return gaps
  const lastProgramEnd = timeToMinutes(lastProgram.endTime)
  const blockEndMinutes = timeToMinutes(blockEnd)
  if (lastProgramEnd < blockEndMinutes) {
    gaps.push({
      start: lastProgram.endTime,
      end: blockEnd,
      duration: blockEndMinutes - lastProgramEnd,
    })
  }
  
  return gaps
}

/**
 * Retourne l'heure de début d'un bloc
 */
function getBlockStartTime(block: 'MATIN' | 'APRÈS-MIDI' | 'SOIR'): string {
  const times = {
    MATIN: '00:00',
    'APRÈS-MIDI': '12:00',
    SOIR: '18:00',
  }
  return times[block]
}

/**
 * Retourne l'heure de fin d'un bloc
 */
function getBlockEndTime(block: 'MATIN' | 'APRÈS-MIDI' | 'SOIR'): string {
  const times = {
    MATIN: '12:00',
    'APRÈS-MIDI': '18:00',
    SOIR: '23:59',
  }
  return times[block]
}

/**
 * Construit la synthèse Régie
 */
function buildRegieSummary(data: DailyBroadcastData): string {
  const totalPrograms = data.programs.length
  const diffusedPrograms = data.programs.filter(p => p.status === 'DIFFUSÉ').length
  const nonDiffusedPrograms = totalPrograms - diffusedPrograms
  const incidentsCount = data.incidents?.length || 0
  
  let summary = `\n${'═'.repeat(50)}\n`
  summary += `🎛️ SYNTHÈSE RÉGIE\n`
  summary += `${'═'.repeat(50)}\n\n`
  summary += `📊 Programmes planifiés : ${totalPrograms}\n`
  summary += `✅ Programmes diffusés : ${diffusedPrograms}\n`
  summary += `❌ Programmes non diffusés : ${nonDiffusedPrograms}\n`
  summary += `⚠️  Incidents signalés : ${incidentsCount}\n`
  
  if (data.globalStatus) {
    summary += `\n📈 Statut global : ${getStatusEmoji(data.globalStatus)} ${data.globalStatus}\n`
  }
  
  if (incidentsCount > 0 && data.incidents) {
    summary += `\n🔍 Détails incidents :\n`
    for (const incident of data.incidents) {
      summary += `   • ${incident.time} - ${incident.type} : ${incident.description}\n`
    }
  }
  
  summary += `\n`
  
  return summary
}

/**
 * Construit la synthèse Direction
 */
function buildDirectionSummary(data: DailyBroadcastData): string {
  const totalPrograms = data.programs.length
  const diffusedPrograms = data.programs.filter(p => p.status === 'DIFFUSÉ').length
  const conformityRate = totalPrograms > 0 ? (diffusedPrograms / totalPrograms) * 100 : 0
  const incidentsCount = data.incidents?.length || 0
  
  let summary = `\n${'═'.repeat(50)}\n`
  summary += `📊 SYNTHÈSE DIRECTION\n`
  summary += `${'═'.repeat(50)}\n\n`
  summary += `📈 Taux de conformité : ${conformityRate.toFixed(1)}%\n`
  summary += `📺 Programmes diffusés : ${diffusedPrograms}/${totalPrograms}\n`
  
  if (incidentsCount > 0) {
    const criticalIncidents = data.incidents?.filter(i => i.severity === 'CRITIQUE').length || 0
    const majorIncidents = data.incidents?.filter(i => i.severity === 'MAJEUR').length || 0
    
    summary += `\n⚠️  Écarts signalés :\n`
    summary += `   • Critiques : ${criticalIncidents}\n`
    summary += `   • Majeurs : ${majorIncidents}\n`
    summary += `   • Mineurs : ${incidentsCount - criticalIncidents - majorIncidents}\n`
  } else {
    summary += `\n✅ Aucun écart signalé\n`
  }
  
  summary += `\n`
  
  return summary
}

/**
 * Construit la synthèse Commerciale
 */
function buildCommercialSummary(data: DailyBroadcastData): string {
  const commercialPrograms = data.programs.filter(p => p.type === 'ADS')
  const diffusedCommercials = commercialPrograms.filter(p => p.status === 'DIFFUSÉ').length
  const nonDiffusedCommercials = commercialPrograms.length - diffusedCommercials
  
  let summary = `\n${'═'.repeat(50)}\n`
  summary += `💰 SYNTHÈSE COMMERCIALE\n`
  summary += `${'═'.repeat(50)}\n\n`
  summary += `📺 Fenêtres commerciales planifiées : ${commercialPrograms.length}\n`
  summary += `✅ Fenêtres commerciales diffusées : ${diffusedCommercials}\n`
  summary += `❌ Fenêtres commerciales non diffusées : ${nonDiffusedCommercials}\n`
  
  if (nonDiffusedCommercials > 0) {
    summary += `\n⚠️  ATTENTION : ${nonDiffusedCommercials} fenêtre(s) commerciale(s) non diffusée(s)\n`
    summary += `   → Rattrapage à planifier\n`
  }
  
  if (commercialPrograms.length > 0) {
    summary += `\n📋 Détails fenêtres commerciales :\n`
    for (const program of commercialPrograms) {
      summary += `   • ${program.startTime} - ${program.title} : ${program.status}\n`
    }
  }
  
  summary += `\n`
  
  return summary
}

/**
 * Construit la section Observations
 */
function buildObservationsSection(data: DailyBroadcastData): string {
  let section = `\n${'═'.repeat(50)}\n`
  section += `📝 OBSERVATIONS\n`
  section += `${'═'.repeat(50)}\n\n`
  
  if (data.incidents && data.incidents.length > 0) {
    section += `⚠️  Incidents enregistrés :\n\n`
    for (const incident of data.incidents) {
      section += `   🕐 ${incident.time}\n`
      section += `   📋 Type : ${incident.type}\n`
      section += `   🔴 Sévérité : ${incident.severity}\n`
      section += `   📝 Description : ${incident.description}\n`
      if (incident.programId) {
        const program = data.programs.find(p => p.id === incident.programId)
        if (program) {
          section += `   📺 Programme concerné : ${program.title}\n`
        }
      }
      section += `\n`
    }
  } else {
    section += `✅ Aucun incident signalé\n\n`
  }
  
  // Observations générales
  const nonDiffusedPrograms = data.programs.filter(p => p.status === 'NON DIFFUSÉ')
  if (nonDiffusedPrograms.length > 0) {
    section += `📊 Programmes non diffusés :\n`
    for (const program of nonDiffusedPrograms) {
      section += `   • ${program.startTime} - ${program.title}\n`
    }
    section += `\n`
  }
  
  return section
}

/**
 * Construit la section Génération
 */
function buildGenerationSection(date: Date): string {
  const now = new Date()
  const generationTime = now.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  
  let section = `\n${'═'.repeat(50)}\n`
  section += `⏱️  GÉNÉRATION\n`
  section += `${'═'.repeat(50)}\n\n`
  section += `📅 Date de génération : ${generationTime}\n`
  section += `🤖 Système : GrilleTV Pro\n`
  section += `📋 Type : Rapport de diffusion quotidien\n`
  section += `\n`
  section += `${'─'.repeat(50)}\n`
  section += `Ce rapport est généré automatiquement par le système GrilleTV Pro.\n`
  section += `Destinataires : Régie ON AIR | Direction des Programmes | Service Commercial\n`
  section += `${'─'.repeat(50)}\n`
  
  return section
}

/**
 * Formate le message pour Telegram
 */
function formatTelegram(
  header: string,
  morningSection: string,
  afternoonSection: string,
  eveningSection: string,
  regieSummary: string,
  directionSummary: string,
  commercialSummary: string,
  observationsSection: string,
  generationSection: string
): string {
  let message = `<b>${header}</b>\n`
  message += morningSection
  message += afternoonSection
  message += eveningSection
  message += regieSummary
  message += directionSummary
  message += commercialSummary
  message += observationsSection
  message += generationSection
  
  return message
}

/**
 * Formate le message pour Email
 */
function formatEmail(
  header: string,
  morningSection: string,
  afternoonSection: string,
  eveningSection: string,
  regieSummary: string,
  directionSummary: string,
  commercialSummary: string,
  observationsSection: string,
  generationSection: string
): { html: string; subject: string; text: string } {
  const subject = `[GRILLETV PRO] Rapport de Diffusion Quotidien`
  
  // Version HTML
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #1F2937;
      background-color: #F9FAFB;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background-color: #FFFFFF;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      padding: 30px;
    }
    .header {
      background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
      color: #FFFFFF;
      padding: 30px;
      text-align: center;
      margin: -30px -30px 30px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .section {
      margin: 30px 0;
      padding: 20px;
      background-color: #F9FAFB;
      border-left: 4px solid #3B82F6;
    }
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #1E40AF;
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    .program-item {
      margin: 15px 0;
      padding: 15px;
      background-color: #FFFFFF;
      border-radius: 4px;
      border-left: 3px solid #3B82F6;
    }
    .program-time {
      font-weight: bold;
      color: #1E40AF;
      font-size: 16px;
    }
    .program-title {
      font-weight: bold;
      color: #1F2937;
      margin: 5px 0;
    }
    .program-details {
      color: #6B7280;
      font-size: 14px;
      margin-top: 5px;
    }
    .status-diffuse {
      color: #10B981;
      font-weight: bold;
    }
    .status-non-diffuse {
      color: #DC2626;
      font-weight: bold;
    }
    .empty-slot {
      background-color: #FEF3C7;
      border-left-color: #F59E0B;
      padding: 15px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .summary {
      background-color: #EFF6FF;
      padding: 20px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .summary-title {
      font-size: 16px;
      font-weight: bold;
      color: #1E40AF;
      margin-bottom: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #E5E7EB;
      text-align: center;
      color: #6B7280;
      font-size: 12px;
    }
    pre {
      white-space: pre-wrap;
      font-family: 'Courier New', monospace;
      background-color: #F3F4F6;
      padding: 15px;
      border-radius: 4px;
      overflow-x: auto;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${header.replace(/\n/g, '<br>')}</h1>
    </div>
    ${formatSectionForHtml('MATIN', morningSection)}
    ${formatSectionForHtml('APRÈS-MIDI', afternoonSection)}
    ${formatSectionForHtml('SOIR', eveningSection)}
    ${formatSummaryForHtml(regieSummary)}
    ${formatSummaryForHtml(directionSummary)}
    ${formatSummaryForHtml(commercialSummary)}
    ${formatSectionForHtml('OBSERVATIONS', observationsSection)}
    ${formatSectionForHtml('GÉNÉRATION', generationSection)}
    <div class="footer">
      <p>⏱️ Généré automatiquement — GrilleTV Pro</p>
      <p>Broadcast SN+ — Système de gestion de grilles TV</p>
    </div>
  </div>
</body>
</html>
  `.trim()
  
  // Version texte
  const text = `${header}
${morningSection}
${afternoonSection}
${eveningSection}
${regieSummary}
${directionSummary}
${commercialSummary}
${observationsSection}
${generationSection}`
  
  return { html, subject, text }
}

/**
 * Formate une section pour HTML
 */
function formatSectionForHtml(title: string, content: string): string {
  const lines = content.split('\n').filter(l => l.trim())
  let html = `<div class="section">`
  html += `<div class="section-title">${title}</div>`
  
  for (const line of lines) {
    if (line.includes('🕐') || line.includes('📺')) {
      html += `<div class="program-item">`
      html += `<div class="program-time">${escapeHtml(line)}</div>`
    } else if (line.includes('⚠️')) {
      html += `<div class="empty-slot">${escapeHtml(line)}</div>`
    } else if (line.trim()) {
      html += `<div class="program-details">${escapeHtml(line)}</div>`
    }
  }
  
  html += `</div>`
  return html
}

/**
 * Formate une synthèse pour HTML
 */
function formatSummaryForHtml(content: string): string {
  const lines = content.split('\n').filter(l => l.trim())
  let html = `<div class="summary">`
  
  for (const line of lines) {
    if (line.includes('═')) continue
    if (line.includes('🎛️') || line.includes('📊') || line.includes('💰')) {
      html += `<div class="summary-title">${escapeHtml(line)}</div>`
    } else if (line.trim()) {
      html += `<div>${escapeHtml(line)}</div>`
    }
  }
  
  html += `</div>`
  return html
}

/**
 * Échappe le HTML
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Formate une durée en minutes en texte lisible
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h${mins > 0 ? mins + 'min' : ''}`
  }
  return `${mins}min`
}

/**
 * Retourne l'emoji de statut
 */
function getStatusEmoji(status: string): string {
  if (status === 'DIFFUSÉ' || status === 'OK') return '✅'
  if (status === 'NON DIFFUSÉ' || status === 'ATTENTION') return '⚠️'
  if (status === 'CRITIQUE') return '🔴'
  return '⚪'
}

/**
 * Retourne le label du type de programme
 */
function getProgramTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    LIVE: 'DIRECT',
    REPLAY: 'REDIFFUSION',
    PAD: 'PAD',
    ADS: 'COMMERCIAL',
    SPECIAL: 'SPÉCIAL',
  }
  return labels[type] || type
}

