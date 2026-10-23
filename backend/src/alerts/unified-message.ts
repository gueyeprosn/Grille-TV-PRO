/**
 * SYSTÈME DE NOTIFICATION PROFESSIONNEL UNIFIÉ
 * 
 * Un seul modèle de message décliné automatiquement selon :
 * - Le type d'événement
 * - Le canal (Telegram / Email)
 * - Le niveau de criticité
 * 
 * Structure unique obligatoire avec 3 lectures :
 * 1. 🎛️ RÉGIE (action immédiate)
 * 2. 📊 DIRECTION (impact & décision)
 * 3. 💰 COMMERCIAL (valeur & engagement)
 */

import type { Program, DailyScheduleBlock, PreparationAlert, OnAirAlert, AnomalyAlert, EndOfServiceReport } from './types.js'

// Types d'événements supportés
export type MessageType = 
  | 'ON_AIR'
  | 'PREPARATION'
  | 'INCIDENT'
  | 'FALLBACK'
  | 'DAILY_SCHEDULE'
  | 'END_OF_SERVICE'

// Contexte pour enrichir le message
export interface MessageContext {
  program?: Program
  block?: DailyScheduleBlock
  alert?: PreparationAlert | OnAirAlert | AnomalyAlert
  report?: EndOfServiceReport
  date?: Date
  gridName?: string
  // Données calculées pour les 3 lectures
  regie?: {
    diffusionStatus: 'OK' | 'ATTENTION' | 'CRITIQUE'
    timeline?: number // Pourcentage écoulé (0-100)
    actionRequired: 'AUCUNE' | 'SURVEILLANCE' | 'INTERVENTION'
  }
  direction?: {
    impactAntenne: 'AUCUN' | 'MINEUR' | 'MAJEUR'
    conformite: 'OK' | 'ÉCART'
    decision: 'AUTOMATIQUE' | 'VALIDÉE' | 'À CONFIRMER'
  }
  commercial?: {
    statutPub: 'NON CONCERNÉ' | 'SPONSORISÉ' | 'À RATTRAPER'
    annonceur?: string
    impactValeur: 'AUCUN' | 'À SUIVRE' | 'CRITIQUE'
  }
  note?: string // Résumé en 1-2 lignes
}

// Résultat du formatage
export interface UnifiedMessage {
  telegramText: string
  emailHtml: string
  emailSubject: string
  emailText: string
}

/**
 * Fonction principale de formatage unifié
 */
export function formatUnifiedMessage(
  messageType: MessageType,
  context: MessageContext
): UnifiedMessage {
  // Construire les données communes
  const now = context.date || new Date()
  const dayName = now.toLocaleDateString('fr-FR', { weekday: 'long' })
  const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  
  // Déterminer le titre du message selon le type
  const messageTitle = getMessageTitle(messageType, context)
  
  // Construire les sections
  const programSection = buildProgramSection(context)
  const regieSection = buildRegieSection(context)
  const directionSection = buildDirectionSection(context)
  const commercialSection = buildCommercialSection(context)
  const noteSection = buildNoteSection(context)
  
  // Générer les formats
  const telegramText = formatTelegram(
    messageTitle,
    dayName,
    dateStr,
    timeStr,
    programSection,
    regieSection,
    directionSection,
    commercialSection,
    noteSection
  )
  
  const { html: emailHtml, subject: emailSubject, text: emailText } = formatEmail(
    messageTitle,
    dayName,
    dateStr,
    timeStr,
    programSection,
    regieSection,
    directionSection,
    commercialSection,
    noteSection
  )
  
  return {
    telegramText,
    emailHtml,
    emailSubject,
    emailText,
  }
}

/**
 * Détermine le titre du message selon le type
 */
function getMessageTitle(type: MessageType, context: MessageContext): string {
  switch (type) {
    case 'ON_AIR':
      return 'ON AIR'
    case 'PREPARATION':
      return 'PRÉPARATION'
    case 'INCIDENT':
      return 'INCIDENT'
    case 'FALLBACK':
      return 'FALLBACK AUTOMATIQUE'
    case 'DAILY_SCHEDULE':
      const period = context.block?.period === 'MORNING' ? 'MATIN' : 'SOIR'
      return `PROGRAMME ${period}`
    case 'END_OF_SERVICE':
      return 'FIN DE SERVICE'
    default:
      return 'NOTIFICATION'
  }
}

/**
 * Construit la section PROGRAMME
 */
function buildProgramSection(context: MessageContext): {
  title: string
  horaire: string
  type: string
  categorie: string
  statut: string
} {
  if (context.program) {
    return {
      title: context.program.title,
      horaire: `${context.program.startTime} – ${context.program.endTime}`,
      type: getProgramTypeLabel(context.program.type),
      categorie: context.program.category || 'N/A',
      statut: getStatusLabel(context.program.opStatus),
    }
  }
  
  if (context.alert && 'program' in context.alert) {
    const program = context.alert.program
    return {
      title: program.title,
      horaire: `${program.startTime} – ${program.endTime}`,
      type: getProgramTypeLabel(program.type),
      categorie: program.category || 'N/A',
      statut: getStatusLabel(program.opStatus),
    }
  }
  
  if (context.block) {
    return {
      title: `${context.block.programs.length} programme(s)`,
      horaire: `${context.block.startTime} – ${context.block.endTime}`,
      type: context.block.period === 'MORNING' ? 'MATIN' : 'SOIR',
      categorie: 'PROGRAMME JOURNALIER',
      statut: context.block.hasGap ? 'FALLBACK' : 'PLANIFIÉ',
    }
  }
  
  if (context.report) {
    return {
      title: `Rapport du ${context.report.date.toLocaleDateString('fr-FR')}`,
      horaire: 'Journée complète',
      type: 'RAPPORT',
      categorie: 'FIN DE SERVICE',
      statut: context.report.incidents.length > 0 ? 'AVEC INCIDENTS' : 'OK',
    }
  }
  
  return {
    title: 'N/A',
    horaire: 'N/A',
    type: 'N/A',
    categorie: 'N/A',
    statut: 'N/A',
  }
}

/**
 * Construit la section RÉGIE
 */
function buildRegieSection(context: MessageContext): {
  etatDiffusion: string
  timeline: string
  actionRequise: string
} {
  const regie = context.regie || {
    diffusionStatus: 'OK',
    actionRequired: 'AUCUNE',
  }
  
  let timeline = 'N/A'
  if (regie.timeline !== undefined) {
    timeline = `${Math.round(regie.timeline)}% écoulé`
  } else if (context.alert && 'timeRemaining' in context.alert) {
    const remaining = formatDuration(context.alert.timeRemaining)
    timeline = `${remaining} restant`
  }
  
  return {
    etatDiffusion: regie.diffusionStatus,
    timeline,
    actionRequise: regie.actionRequired,
  }
}

/**
 * Construit la section DIRECTION
 */
function buildDirectionSection(context: MessageContext): {
  impactAntenne: string
  conformite: string
  decision: string
} {
  const direction = context.direction || {
    impactAntenne: 'AUCUN',
    conformite: 'OK',
    decision: 'AUTOMATIQUE',
  }
  
  return {
    impactAntenne: direction.impactAntenne,
    conformite: direction.conformite,
    decision: direction.decision,
  }
}

/**
 * Construit la section COMMERCIAL
 */
function buildCommercialSection(context: MessageContext): {
  statutPub: string
  annonceur: string
  impactValeur: string
} {
  const commercial = context.commercial || {
    statutPub: 'NON CONCERNÉ',
    impactValeur: 'AUCUN',
  }
  
  // Déterminer automatiquement si sponsorisé selon le type de programme
  if (!commercial.statutPub || commercial.statutPub === 'NON CONCERNÉ') {
    if (context.program?.type === 'ADS') {
      commercial.statutPub = 'SPONSORISÉ'
    }
  }
  
  return {
    statutPub: commercial.statutPub,
    annonceur: commercial.annonceur || 'N/A',
    impactValeur: commercial.impactValeur,
  }
}

/**
 * Construit la section NOTE
 */
function buildNoteSection(context: MessageContext): string {
  if (context.note) {
    return context.note
  }
  
  // Générer automatiquement selon le type
  if (context.alert) {
    if ('minutesBefore' in context.alert) {
      return `Préparation requise dans ${context.alert.minutesBefore} minutes`
    }
    if ('timeRemaining' in context.alert) {
      return `Programme en cours de diffusion`
    }
    if ('message' in context.alert) {
      return context.alert.message
    }
  }
  
  if (context.report) {
    return context.report.summary
  }
  
  if (context.block?.hasGap) {
    return 'Animation / Xassida / Playlist automatique activée'
  }
  
  return 'Notification automatique GrilleTV Pro'
}

/**
 * Formate pour Telegram
 */
function formatTelegram(
  title: string,
  dayName: string,
  dateStr: string,
  timeStr: string,
  program: ReturnType<typeof buildProgramSection>,
  regie: ReturnType<typeof buildRegieSection>,
  direction: ReturnType<typeof buildDirectionSection>,
  commercial: ReturnType<typeof buildCommercialSection>,
  note: string
): string {
  let message = `📺 <b>GRILLETv PRO — ${title}</b>\n`
  message += `🗓️ ${dayName} ${dateStr} — 🕒 ${timeStr}\n\n`
  message += `────────────────────\n`
  message += `🎬 <b>PROGRAMME</b>\n`
  message += `────────────────────\n`
  message += `Titre        : <b>${program.title}</b>\n`
  message += `Horaire      : ${program.horaire}\n`
  message += `Type         : ${program.type}\n`
  message += `Catégorie    : ${program.categorie}\n`
  message += `Statut       : ${program.statut}\n\n`
  message += `────────────────────\n`
  message += `🎛️ <b>RÉGIE</b>\n`
  message += `────────────────────\n`
  message += `État diffusion : ${getStatusEmoji(regie.etatDiffusion)} <b>${regie.etatDiffusion}</b>\n`
  message += `Timeline       : ${regie.timeline}\n`
  message += `Action requise : ${regie.actionRequise}\n\n`
  message += `────────────────────\n`
  message += `📊 <b>DIRECTION</b>\n`
  message += `────────────────────\n`
  message += `Impact antenne : ${getImpactEmoji(direction.impactAntenne)} ${direction.impactAntenne}\n`
  message += `Conformité     : ${getConformiteEmoji(direction.conformite)} ${direction.conformite}\n`
  message += `Décision       : ${direction.decision}\n\n`
  message += `────────────────────\n`
  message += `💰 <b>COMMERCIAL</b>\n`
  message += `────────────────────\n`
  message += `Statut pub     : ${commercial.statutPub}\n`
  message += `Annonceur      : ${commercial.annonceur}\n`
  message += `Impact valeur  : ${getImpactValeurEmoji(commercial.impactValeur)} ${commercial.impactValeur}\n\n`
  message += `────────────────────\n`
  message += `📝 <b>NOTE</b>\n`
  message += `────────────────────\n`
  message += `${note}\n\n`
  message += `⏱️ Généré automatiquement — GrilleTV Pro`
  
  return message
}

/**
 * Formate pour Email
 */
function formatEmail(
  title: string,
  dayName: string,
  dateStr: string,
  timeStr: string,
  program: ReturnType<typeof buildProgramSection>,
  regie: ReturnType<typeof buildRegieSection>,
  direction: ReturnType<typeof buildDirectionSection>,
  commercial: ReturnType<typeof buildCommercialSection>,
  note: string
): { html: string; subject: string; text: string } {
  // Sujet normalisé
  const subject = `[GRILLETv PRO] ${title.toUpperCase()}`
  
  // HTML stylé broadcast
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
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFFFF;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
      color: #FFFFFF;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    .header .meta {
      margin-top: 10px;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 30px 20px;
    }
    .section {
      margin-bottom: 25px;
      border-left: 4px solid #3B82F6;
      padding-left: 15px;
    }
    .section-title {
      font-size: 16px;
      font-weight: bold;
      color: #1E40AF;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section-content {
      font-size: 14px;
      color: #4B5563;
    }
    .section-content .row {
      margin: 8px 0;
      display: flex;
      justify-content: space-between;
    }
    .section-content .label {
      font-weight: 600;
      color: #6B7280;
      min-width: 140px;
    }
    .section-content .value {
      color: #1F2937;
      font-weight: 500;
    }
    .status-ok { color: #10B981; font-weight: bold; }
    .status-attention { color: #F59E0B; font-weight: bold; }
    .status-critical { color: #DC2626; font-weight: bold; }
    .footer {
      background-color: #F3F4F6;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6B7280;
      border-top: 1px solid #E5E7EB;
    }
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #E5E7EB, transparent);
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📺 GRILLETv PRO — ${title}</h1>
      <div class="meta">🗓️ ${dayName} ${dateStr} — 🕒 ${timeStr}</div>
    </div>
    <div class="content">
      <div class="section">
        <div class="section-title">🎬 PROGRAMME</div>
        <div class="section-content">
          <div class="row"><span class="label">Titre</span><span class="value">${program.title}</span></div>
          <div class="row"><span class="label">Horaire</span><span class="value">${program.horaire}</span></div>
          <div class="row"><span class="label">Type</span><span class="value">${program.type}</span></div>
          <div class="row"><span class="label">Catégorie</span><span class="value">${program.categorie}</span></div>
          <div class="row"><span class="label">Statut</span><span class="value">${program.statut}</span></div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">🎛️ RÉGIE</div>
        <div class="section-content">
          <div class="row"><span class="label">État diffusion</span><span class="value status-${regie.etatDiffusion.toLowerCase()}">${regie.etatDiffusion}</span></div>
          <div class="row"><span class="label">Timeline</span><span class="value">${regie.timeline}</span></div>
          <div class="row"><span class="label">Action requise</span><span class="value">${regie.actionRequise}</span></div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">📊 DIRECTION</div>
        <div class="section-content">
          <div class="row"><span class="label">Impact antenne</span><span class="value">${direction.impactAntenne}</span></div>
          <div class="row"><span class="label">Conformité</span><span class="value">${direction.conformite}</span></div>
          <div class="row"><span class="label">Décision</span><span class="value">${direction.decision}</span></div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">💰 COMMERCIAL</div>
        <div class="section-content">
          <div class="row"><span class="label">Statut pub</span><span class="value">${commercial.statutPub}</span></div>
          <div class="row"><span class="label">Annonceur</span><span class="value">${commercial.annonceur}</span></div>
          <div class="row"><span class="label">Impact valeur</span><span class="value">${commercial.impactValeur}</span></div>
        </div>
      </div>
      <div class="divider"></div>
      <div class="section">
        <div class="section-title">📝 NOTE</div>
        <div class="section-content">
          <p style="margin: 0; font-style: italic;">${note}</p>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>⏱️ Généré automatiquement — GrilleTV Pro</p>
      <p>Broadcast SN+ — Système de gestion de grilles TV</p>
    </div>
  </div>
</body>
</html>
  `.trim()
  
  // Version texte
  const text = `GRILLETv PRO — ${title}
${dayName} ${dateStr} — ${timeStr}

────────────────────
🎬 PROGRAMME
────────────────────
Titre        : ${program.title}
Horaire      : ${program.horaire}
Type         : ${program.type}
Catégorie    : ${program.categorie}
Statut       : ${program.statut}

────────────────────
🎛️ RÉGIE
────────────────────
État diffusion : ${regie.etatDiffusion}
Timeline       : ${regie.timeline}
Action requise : ${regie.actionRequise}

────────────────────
📊 DIRECTION
────────────────────
Impact antenne : ${direction.impactAntenne}
Conformité     : ${direction.conformite}
Décision       : ${direction.decision}

────────────────────
💰 COMMERCIAL
────────────────────
Statut pub     : ${commercial.statutPub}
Annonceur      : ${commercial.annonceur}
Impact valeur  : ${commercial.impactValeur}

────────────────────
📝 NOTE
────────────────────
${note}

⏱️ Généré automatiquement — GrilleTV Pro`
  
  return { html, subject, text }
}

// Fonctions utilitaires
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

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: 'BROUILLON',
    READY: 'PRÊT',
    AIRED: 'ON AIR',
    DONE: 'TERMINÉ',
    CANCELLED: 'ANNULÉ',
    DELAYED: 'RETARD',
    OVERRUN: 'DÉPASSEMENT',
    SKIPPED: 'SAUTÉ',
    MANUAL_OVERRIDE: 'OVERRIDE',
  }
  return labels[status] || status
}

function getStatusEmoji(status: string): string {
  if (status === 'OK') return '🟢'
  if (status === 'ATTENTION') return '🟠'
  if (status === 'CRITIQUE') return '🔴'
  return '⚪'
}

function getImpactEmoji(impact: string): string {
  if (impact === 'AUCUN') return '✅'
  if (impact === 'MINEUR') return '⚠️'
  if (impact === 'MAJEUR') return '🔴'
  return '⚪'
}

function getConformiteEmoji(conformite: string): string {
  if (conformite === 'OK') return '✅'
  if (conformite === 'ÉCART') return '⚠️'
  return '⚪'
}

function getImpactValeurEmoji(impact: string): string {
  if (impact === 'AUCUN') return '✅'
  if (impact === 'À SUIVRE') return '⚠️'
  if (impact === 'CRITIQUE') return '🔴'
  return '⚪'
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h${mins > 0 ? mins : ''}`
  }
  return `${mins}min`
}

/**
 * HELPERS POUR CONSTRUIRE LE CONTEXTE
 * Ces fonctions construisent automatiquement le contexte avec les 3 lectures
 */

/**
 * Construit le contexte pour ON AIR
 */
export function buildOnAirContext(alert: OnAirAlert): MessageContext {
  const now = new Date()
  const programStart = parseTime(alert.program.startTime)
  const programEnd = parseTime(alert.program.endTime)
  const elapsed = Math.max(0, (now.getTime() - programStart.getTime()) / (1000 * 60))
  const total = (programEnd.getTime() - programStart.getTime()) / (1000 * 60)
  const timeline = total > 0 ? (elapsed / total) * 100 : 0
  
  return {
    program: alert.program,
    alert,
    date: now,
    regie: {
      diffusionStatus: 'OK',
      timeline: Math.min(100, Math.max(0, timeline)),
      actionRequired: timeline > 90 ? 'SURVEILLANCE' : 'AUCUNE',
    },
    direction: {
      impactAntenne: 'AUCUN',
      conformite: 'OK',
      decision: 'AUTOMATIQUE',
    },
    commercial: {
      statutPub: alert.program.type === 'ADS' ? 'SPONSORISÉ' : 'NON CONCERNÉ',
      impactValeur: alert.program.type === 'ADS' ? 'À SUIVRE' : 'AUCUN',
    },
    note: `Programme en cours de diffusion. ${formatDuration(alert.timeRemaining)} restant.`,
  }
}

/**
 * Construit le contexte pour PRÉPARATION
 */
export function buildPreparationContext(alert: PreparationAlert): MessageContext {
  return {
    program: alert.program,
    alert,
    date: alert.scheduledTime,
    regie: {
      diffusionStatus: alert.minutesBefore <= 15 ? 'ATTENTION' : 'OK',
      actionRequired: alert.minutesBefore <= 15 ? 'SURVEILLANCE' : 'AUCUNE',
    },
    direction: {
      impactAntenne: 'AUCUN',
      conformite: 'OK',
      decision: 'AUTOMATIQUE',
    },
    commercial: {
      statutPub: alert.program.type === 'ADS' ? 'SPONSORISÉ' : 'NON CONCERNÉ',
      impactValeur: alert.program.type === 'ADS' ? 'À SUIVRE' : 'AUCUN',
    },
    note: `Préparation requise dans ${alert.minutesBefore} minutes pour ${alert.program.title}.`,
  }
}

/**
 * Construit le contexte pour INCIDENT
 */
export function buildIncidentContext(alert: AnomalyAlert): MessageContext {
  const isCritical = alert.type === 'SKIPPED' || alert.type === 'NOT_STARTED'
  
  return {
    program: alert.program,
    alert,
    date: new Date(),
    regie: {
      diffusionStatus: isCritical ? 'CRITIQUE' : 'ATTENTION',
      actionRequired: isCritical ? 'INTERVENTION' : 'SURVEILLANCE',
    },
    direction: {
      impactAntenne: isCritical ? 'MAJEUR' : 'MINEUR',
      conformite: 'ÉCART',
      decision: 'À CONFIRMER',
    },
    commercial: {
      statutPub: alert.program.type === 'ADS' ? 'À RATTRAPER' : 'NON CONCERNÉ',
      impactValeur: alert.program.type === 'ADS' && isCritical ? 'CRITIQUE' : alert.program.type === 'ADS' ? 'À SUIVRE' : 'AUCUN',
    },
    note: alert.message,
  }
}

/**
 * Construit le contexte pour FALLBACK
 */
export function buildFallbackContext(block: DailyScheduleBlock, date: Date): MessageContext {
  const context: MessageContext = {
    block,
    date,
    regie: {
      diffusionStatus: 'OK',
      actionRequired: 'AUCUNE',
    },
    direction: {
      impactAntenne: 'AUCUN',
      conformite: 'OK',
      decision: 'AUTOMATIQUE',
    },
    commercial: {
      statutPub: 'NON CONCERNÉ',
      impactValeur: 'AUCUN',
    },
    note: 'Animation / Xassida / Playlist automatique activée pour combler la plage horaire.',
  }
  if (block.gridName) {
    context.gridName = block.gridName
  }
  return context
}

/**
 * Construit le contexte pour PROGRAMME JOURNALIER
 */
export function buildDailyScheduleContext(block: DailyScheduleBlock, date: Date): MessageContext {
  const context: MessageContext = {
    block,
    date,
    regie: {
      diffusionStatus: 'OK',
      actionRequired: 'AUCUNE',
    },
    direction: {
      impactAntenne: 'AUCUN',
      conformite: 'OK',
      decision: 'AUTOMATIQUE',
    },
    commercial: {
      statutPub: 'NON CONCERNÉ',
      impactValeur: 'AUCUN',
    },
    note: `Programme ${block.period === 'MORNING' ? 'matin' : 'soir'} du ${date.toLocaleDateString('fr-FR')}. ${block.programs.length} programme(s) planifié(s).`,
  }
  if (block.gridName) {
    context.gridName = block.gridName
  }
  return context
}

/**
 * Construit le contexte pour FIN DE SERVICE
 */
export function buildEndOfServiceContext(report: EndOfServiceReport): MessageContext {
  const hasIncidents = report.incidents.length > 0
  
  const context: MessageContext = {
    report,
    date: report.date,
    regie: {
      diffusionStatus: hasIncidents ? 'ATTENTION' : 'OK',
      actionRequired: hasIncidents ? 'SURVEILLANCE' : 'AUCUNE',
    },
    direction: {
      impactAntenne: hasIncidents ? 'MINEUR' : 'AUCUN',
      conformite: hasIncidents ? 'ÉCART' : 'OK',
      decision: 'VALIDÉE',
    },
    commercial: {
      statutPub: report.commercialCount > 0 ? 'SPONSORISÉ' : 'NON CONCERNÉ',
      impactValeur: hasIncidents && report.commercialCount > 0 ? 'À SUIVRE' : 'AUCUN',
    },
    note: report.summary,
  }
  if (report.gridName) {
    context.gridName = report.gridName
  }
  return context
}

// Fonction utilitaire pour parser l'heure
function parseTime(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, 0, 0)
  return date
}

