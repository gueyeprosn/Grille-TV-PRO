/**
 * Planificateur d'alertes (cron jobs)
 * Gère l'envoi automatique des alertes selon les horaires configurés
 */

import { sendDailySchedule, sendPreparationAlert, sendOnAirAlert, sendAnomalyAlert, sendEndOfServiceReport } from './index.js'
import { loadAlertConfig } from './config.js'
import { PrismaClient } from '@prisma/client'
import { calculateOnAirStatusForPrograms } from '../lib/onAirCalculator.js'

const prisma = new PrismaClient()
const config = loadAlertConfig()

// Cache pour éviter les doublons d'alertes (programmeId + type => timestamp)
const alertCache = new Map<string, number>()
const ALERT_CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

/**
 * Vérifie si une alerte a déjà été envoyée récemment
 */
function hasRecentAlert(programId: string, alertType: string): boolean {
  const key = `${programId}:${alertType}`
  const lastSent = alertCache.get(key)
  if (!lastSent) return false
  
  const now = Date.now()
  if (now - lastSent < ALERT_CACHE_DURATION) {
    return true // Alerte envoyée récemment
  }
  
  return false
}

/**
 * Marque une alerte comme envoyée
 */
function markAlertSent(programId: string, alertType: string): void {
  const key = `${programId}:${alertType}`
  alertCache.set(key, Date.now())
  
  // Nettoyer le cache périodiquement (garder seulement les entrées récentes)
  if (alertCache.size > 1000) {
    const now = Date.now()
    for (const [k, v] of alertCache.entries()) {
      if (now - v > ALERT_CACHE_DURATION) {
        alertCache.delete(k)
      }
    }
  }
}

/**
 * Vérifie et envoie les alertes de préparation
 * À appeler toutes les minutes
 */
export async function checkPreparationAlerts(gridId: string): Promise<void> {
  try {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const dayOfWeek = now.getDay()

    // Récupérer les programmes du jour
    const programs = await prisma.program.findMany({
      where: {
        gridId,
        days: {
          has: dayOfWeek,
        },
        opStatus: {
          in: ['DRAFT', 'READY'],
        },
      },
    })

    for (const program of programs) {
      const programStart = timeToMinutes(program.startTime)
      const minutesUntilStart = programStart - currentMinutes

      // Vérifier si on doit envoyer une alerte de préparation
      let shouldAlert = false
      let alertMinutes = 0

      if (program.type === 'LIVE' && minutesUntilStart === config.preparationAlerts.direct) {
        shouldAlert = true
        alertMinutes = config.preparationAlerts.direct
      } else if (program.type === 'ADS' && minutesUntilStart === config.preparationAlerts.commercial) {
        shouldAlert = true
        alertMinutes = config.preparationAlerts.commercial
      } else if (program.type === 'SPECIAL' && minutesUntilStart === config.preparationAlerts.special) {
        shouldAlert = true
        alertMinutes = config.preparationAlerts.special
      }

      if (shouldAlert) {
        await sendPreparationAlert(program.id)
      }
    }
  } catch (error: any) {
    console.error('❌ Erreur vérification alertes préparation:', error.message)
  }
}

/**
 * Vérifie et envoie les alertes ON AIR
 * À appeler toutes les minutes
 */
export async function checkOnAirAlerts(gridId: string): Promise<void> {
  try {
    const now = new Date()
    const dayOfWeek = now.getDay()

    // Récupérer les programmes du jour
    const programs = await prisma.program.findMany({
      where: {
        gridId,
        days: {
          has: dayOfWeek,
        },
      },
    })

    for (const program of programs) {
      const results = calculateOnAirStatusForPrograms([program])
      const onAirStatus = results[0]?.opStatus || program.opStatus
      
      // Vérifier si le programme vient de passer à ON AIR
      // (on pourrait utiliser un cache pour éviter les doublons)
      if (onAirStatus === 'AIRED') {
        const programStart = parseTime(program.startTime)
        const timeSinceStart = (now.getTime() - programStart.getTime()) / (1000 * 60)
        
        // Envoyer l'alerte seulement si le programme vient de démarrer (dans la première minute)
        if (timeSinceStart >= 0 && timeSinceStart < 1) {
          await sendOnAirAlert(program.id)
        }
      }
    }
  } catch (error: any) {
    console.error('❌ Erreur vérification alertes ON AIR:', error.message)
  }
}

/**
 * Vérifie et envoie les alertes d'anomalie
 * À appeler toutes les minutes
 */
export async function checkAnomalyAlerts(gridId: string): Promise<void> {
  try {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    // Récupérer les programmes du jour
    const programs = await prisma.program.findMany({
      where: {
        gridId,
        days: {
          has: dayOfWeek,
        },
      },
    })

    for (const program of programs) {
      const programStart = timeToMinutes(program.startTime)
      const programEnd = timeToMinutes(program.endTime)
      const results = calculateOnAirStatusForPrograms([program])
      const onAirStatus = results[0]?.opStatus || program.opStatus

      // Exclure les programmes automatiques qui ne nécessitent pas d'alerte
      // REPLAY et PAD sont souvent automatiques et ne nécessitent pas d'intervention
      const isAutomaticProgram = program.type === 'REPLAY' || program.type === 'PAD'
      
      // Programme à 00:00 = souvent un programme de fin de journée ou automatique
      // Ne pas alerter pour ces programmes (sauf si LIVE ou SPECIAL)
      const isMidnightProgram = programStart === 0 && (program.type === 'REPLAY' || program.type === 'PAD')
      
      // Tolérance de 3 minutes avant d'envoyer l'alerte (éviter les faux positifs)
      const toleranceMinutes = 3
      const minutesSinceStart = currentMinutes - programStart

      // Détecter les anomalies
      if (currentMinutes >= programStart && currentMinutes < programEnd) {
        // Le programme devrait être ON AIR
        // Ne pas alerter si :
        // 1. C'est un programme automatique (REPLAY/PAD)
        // 2. On est dans la tolérance (premières 3 minutes)
        // 3. Le programme est déjà en statut AIRED
        if (
          !isAutomaticProgram && 
          !isMidnightProgram && // Exclure les programmes automatiques à minuit
          minutesSinceStart >= toleranceMinutes &&
          onAirStatus !== 'AIRED' && 
          program.opStatus !== 'AIRED' &&
          program.opStatus !== 'CANCELLED' && // Ne pas alerter si annulé
          !hasRecentAlert(program.id, 'NOT_STARTED') // Éviter les doublons
        ) {
          // Programme prévu non démarré (après tolérance)
          await sendAnomalyAlert(program.id, 'NOT_STARTED', program.startTime)
          markAlertSent(program.id, 'NOT_STARTED')
        }
      }

      // Vérifier les statuts d'anomalie (avec cache pour éviter doublons)
      if (program.opStatus === 'DELAYED' && !hasRecentAlert(program.id, 'DELAYED')) {
        await sendAnomalyAlert(program.id, 'DELAYED', program.startTime)
        markAlertSent(program.id, 'DELAYED')
      } else if (program.opStatus === 'OVERRUN' && !hasRecentAlert(program.id, 'OVERRUN')) {
        await sendAnomalyAlert(program.id, 'OVERRUN', program.endTime)
        markAlertSent(program.id, 'OVERRUN')
      } else if (program.opStatus === 'SKIPPED' && !hasRecentAlert(program.id, 'SKIPPED')) {
        await sendAnomalyAlert(program.id, 'SKIPPED', program.startTime)
        markAlertSent(program.id, 'SKIPPED')
      } else if (program.opStatus === 'MANUAL_OVERRIDE' && !hasRecentAlert(program.id, 'MANUAL_OVERRIDE')) {
        await sendAnomalyAlert(program.id, 'MANUAL_OVERRIDE', program.startTime)
        markAlertSent(program.id, 'MANUAL_OVERRIDE')
      }
    }
  } catch (error: any) {
    console.error('❌ Erreur vérification alertes anomalie:', error.message)
  }
}

/**
 * Envoie le programme journalier (matin)
 * À appeler à l'heure configurée (par défaut 04:30)
 */
export async function scheduleDailyMorning(gridId: string): Promise<void> {
  await sendDailySchedule(gridId, 'MORNING')
}

/**
 * Envoie le programme journalier (soir)
 * À appeler à l'heure configurée (par défaut 13:30)
 */
export async function scheduleDailyEvening(gridId: string): Promise<void> {
  await sendDailySchedule(gridId, 'EVENING')
}

/**
 * Envoie le rapport de fin de service
 * À appeler à la fin de la journée (par défaut 23:59)
 */
export async function scheduleEndOfService(gridId: string): Promise<void> {
  await sendEndOfServiceReport(gridId)
}

// Fonctions utilitaires
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

function parseTime(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours || 0, minutes || 0, 0, 0)
  return date
}

