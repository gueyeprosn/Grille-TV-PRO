/**
 * Service d'envoi d'alertes via Telegram
 */

import axios from 'axios'
import { loadAlertConfig } from './config.js'
import type { Program, DailyScheduleBlock, PreparationAlert, OnAirAlert, AnomalyAlert, EndOfServiceReport } from './types.js'
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

/**
 * Envoie un message Telegram
 */
async function sendTelegramMessage(message: string): Promise<boolean> {
  if (!config.telegram.enabled || !config.telegram.botToken || !config.telegram.chatId) {
    console.log('⚠️ Telegram désactivé ou non configuré')
    return false
  }

  try {
    const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`
    const response = await axios.post(url, {
      chat_id: config.telegram.chatId,
      text: message,
      parse_mode: 'HTML',
    })
    return true
  } catch (error: any) {
    if (error.response?.data) {
      const errorData = error.response.data
      console.error('❌ Erreur envoi Telegram:', errorData.description || error.message)
      
      // Messages d'erreur spécifiques
      if (errorData.error_code === 400) {
        if (errorData.description?.includes('chat not found')) {
          console.error('   💡 Le CHAT_ID est incorrect ou le bot n\'est pas dans le groupe')
          console.error('   💡 Utilisez: npm run alerts:get-chat-id pour obtenir le bon CHAT_ID')
        } else if (errorData.description?.includes('not enough rights')) {
          console.error('   💡 Le bot n\'a pas les permissions nécessaires dans le groupe')
          console.error('   💡 Assurez-vous que le bot est admin ou peut envoyer des messages')
        }
      } else if (errorData.error_code === 403) {
        console.error('   💡 Le bot a été bloqué ou retiré du groupe')
      }
    } else {
      console.error('❌ Erreur envoi Telegram:', error.message)
    }
    return false
  }
}

/**
 * Template Telegram - Programme journalier
 * Utilise le système unifié
 */
function formatDailyScheduleTelegram(block: DailyScheduleBlock, date: Date): string {
  const context = buildDailyScheduleContext(block, date)
  const unified = formatUnifiedMessage('DAILY_SCHEDULE', context)
  return unified.telegramText
}

/**
 * Template Telegram - Alerte de préparation
 * Utilise le système unifié
 */
function formatPreparationAlertTelegram(alert: PreparationAlert): string {
  const context = buildPreparationContext(alert)
  const unified = formatUnifiedMessage('PREPARATION', context)
  return unified.telegramText
}

/**
 * Template Telegram - Alerte ON AIR
 * Utilise le système unifié
 */
function formatOnAirAlertTelegram(alert: OnAirAlert): string {
  const context = buildOnAirContext(alert)
  const unified = formatUnifiedMessage('ON_AIR', context)
  return unified.telegramText
}

/**
 * Template Telegram - Alerte d'anomalie
 * Utilise le système unifié
 */
function formatAnomalyAlertTelegram(alert: AnomalyAlert): string {
  const context = buildIncidentContext(alert)
  const unified = formatUnifiedMessage('INCIDENT', context)
  return unified.telegramText
}

/**
 * Template Telegram - Fin de service
 * Utilise le système unifié
 */
function formatEndOfServiceReportTelegram(report: EndOfServiceReport): string {
  const context = buildEndOfServiceContext(report)
  const unified = formatUnifiedMessage('END_OF_SERVICE', context)
  return unified.telegramText
}

// Fonctions utilitaires
function getProgramIcon(type: string): string {
  const icons: Record<string, string> = {
    LIVE: '🎙️',
    REPLAY: '📺',
    PAD: '📻',
    ADS: '💼',
    SPECIAL: '⭐',
    COMMERCIAL: '💼',
  }
  return icons[type] || '📺'
}

function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    PLANNED: '📋',
    CONFIRMED: '✅',
    IN_PRODUCTION: '🎬',
    READY: '🟢',
    ON_AIR: '🔴',
    DONE: '✔️',
    DELAYED: '⏰',
    OVERRUN: '⏳',
    SKIPPED: '⏭️',
    MANUAL_OVERRIDE: '🔧',
  }
  return badges[status] || '📋'
}

function getAlertIcon(type: string): string {
  const icons: Record<string, string> = {
    DIRECT: '🎙️',
    COMMERCIAL: '💼',
    ADS: '💼',
    SPECIAL: '⭐',
  }
  return icons[type] || '📺'
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

function getAnomalyIcon(type: string): string {
  const icons: Record<string, string> = {
    NOT_STARTED: '⏰',
    DELAYED: '⏳',
    OVERRUN: '⏱️',
    SKIPPED: '⏭️',
    MANUAL_OVERRIDE: '🔧',
  }
  return icons[type] || '⚠️'
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
  sendTelegramMessage,
  formatDailyScheduleTelegram,
  formatPreparationAlertTelegram,
  formatOnAirAlertTelegram,
  formatAnomalyAlertTelegram,
  formatEndOfServiceReportTelegram,
}

