/**
 * Service d'envoi d'alertes via Email
 * Utilise nodemailer pour l'envoi
 */

import { loadAlertConfig } from './config.js'
import type { Program, DailyScheduleBlock, PreparationAlert, OnAirAlert, AnomalyAlert, EndOfServiceReport } from './types.js'
import * as nodemailer from 'nodemailer'
import { 
  formatUnifiedMessage, 
  buildOnAirContext, 
  buildPreparationContext, 
  buildIncidentContext, 
  buildFallbackContext, 
  buildDailyScheduleContext, 
  buildEndOfServiceContext 
} from './unified-message.js'

const config = loadAlertConfig()

// Transporter nodemailer (créé une seule fois)
let transporter: nodemailer.Transporter | null = null

/**
 * Initialise le transporter nodemailer
 */
function getTransporter(): nodemailer.Transporter | null {
  if (!config.email.enabled) {
    return null
  }

  if (!transporter && config.email.smtpHost && config.email.smtpUser && config.email.smtpPassword) {
    transporter = nodemailer.createTransport({
      host: config.email.smtpHost,
      port: config.email.smtpPort || 587,
      secure: config.email.smtpPort === 465,
      auth: {
        user: config.email.smtpUser,
        pass: config.email.smtpPassword,
      },
    })
  }

  return transporter
}

/**
 * Envoie un email via nodemailer
 */
async function sendEmail(subject: string, htmlBody: string, textBody: string): Promise<boolean> {
  if (!config.email.enabled) {
    console.log('⚠️ Email désactivé')
    return false
  }

  if (config.email.toEmails.length === 0) {
    console.log('⚠️ Aucun destinataire email configuré')
    return false
  }

  try {
    const mailTransporter = getTransporter()
    if (!mailTransporter) {
      console.error('❌ Transporter email non configuré')
      return false
    }

    await mailTransporter.sendMail({
      from: config.email.fromEmail || 'noreply@broadcastsnplus.com',
      to: config.email.toEmails.join(', '),
      subject,
      text: textBody,
      html: htmlBody,
    })

    console.log(`✅ Email envoyé: ${subject}`)
    return true
  } catch (error: any) {
    console.error('❌ Erreur envoi email:', error.message)
    return false
  }
}

/**
 * Template Email HTML - Programme journalier
 * Utilise le système unifié
 */
function formatDailyScheduleEmail(block: DailyScheduleBlock, date: Date): { subject: string; html: string; text: string } {
  const context = buildDailyScheduleContext(block, date)
  const unified = formatUnifiedMessage('DAILY_SCHEDULE', context)
  return {
    subject: unified.emailSubject,
    html: unified.emailHtml,
    text: unified.emailText,
  }
}

/**
 * Template Email HTML - Alerte de préparation
 * Utilise le système unifié
 */
function formatPreparationAlertEmail(alert: PreparationAlert): { subject: string; html: string; text: string } {
  const context = buildPreparationContext(alert)
  const unified = formatUnifiedMessage('PREPARATION', context)
  return {
    subject: unified.emailSubject,
    html: unified.emailHtml,
    text: unified.emailText,
  }
}

/**
 * Template Email HTML - Alerte ON AIR
 * Utilise le système unifié
 */
function formatOnAirAlertEmail(alert: OnAirAlert): { subject: string; html: string; text: string } {
  const context = buildOnAirContext(alert)
  const unified = formatUnifiedMessage('ON_AIR', context)
  return {
    subject: unified.emailSubject,
    html: unified.emailHtml,
    text: unified.emailText,
  }
}

/**
 * Template Email HTML - Alerte d'anomalie
 * Utilise le système unifié
 */
function formatAnomalyAlertEmail(alert: AnomalyAlert): { subject: string; html: string; text: string } {
  const context = buildIncidentContext(alert)
  const unified = formatUnifiedMessage('INCIDENT', context)
  return {
    subject: unified.emailSubject,
    html: unified.emailHtml,
    text: unified.emailText,
  }
}

/**
 * Template Email HTML - Fin de service
 * Utilise le système unifié
 */
function formatEndOfServiceReportEmail(report: EndOfServiceReport): { subject: string; html: string; text: string } {
  const context = buildEndOfServiceContext(report)
  const unified = formatUnifiedMessage('END_OF_SERVICE', context)
  return {
    subject: unified.emailSubject,
    html: unified.emailHtml,
    text: unified.emailText,
  }
}

// Fonctions utilitaires (réutilisées depuis telegram.ts)
function getProgramIcon(type: string): string {
  const icons: Record<string, string> = {
    LIVE: '🎙️',
    REPLAY: '📺',
    PAD: '📻',
    ADS: '💼',
    SPECIAL: '⭐',
  }
  return icons[type] || '📺'
}

function getProgramTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    LIVE: 'Direct',
    REPLAY: 'Rediffusion',
    PAD: 'PAD',
    ADS: 'Plateau commercial',
    SPECIAL: 'Événement spécial',
  }
  return labels[type] || type
}

function getAlertTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DIRECT: 'DIRECT',
    COMMERCIAL: 'PLATEAU COMMERCIAL',
    ADS: 'PLATEAU COMMERCIAL',
    SPECIAL: 'ÉVÉNEMENT SPÉCIAL',
  }
  return labels[type] || type
}

function getAnomalyTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    NOT_STARTED: 'Programme non démarré',
    DELAYED: 'Retard',
    OVERRUN: 'Dépassement',
    SKIPPED: 'Programme sauté',
    MANUAL_OVERRIDE: 'Override manuel',
  }
  return labels[type] || type
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h${mins > 0 ? mins : ''}`
  }
  return `${mins}min`
}

export {
  sendEmail,
  formatDailyScheduleEmail,
  formatPreparationAlertEmail,
  formatOnAirAlertEmail,
  formatAnomalyAlertEmail,
  formatEndOfServiceReportEmail,
}

