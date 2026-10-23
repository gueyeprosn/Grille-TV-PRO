/**
 * Module principal d'alertes broadcast
 * Système d'alertes professionnelles pour GrilleTV Pro
 */

import { PrismaClient } from '@prisma/client'
import { loadAlertConfig } from './config.js'
import { sendTelegramMessage, formatDailyScheduleTelegram, formatPreparationAlertTelegram, formatOnAirAlertTelegram, formatAnomalyAlertTelegram, formatEndOfServiceReportTelegram } from './telegram.js'
import { sendEmail, formatDailyScheduleEmail, formatPreparationAlertEmail, formatOnAirAlertEmail, formatAnomalyAlertEmail, formatEndOfServiceReportEmail } from './email.js'
import type { Program, DailyScheduleBlock, PreparationAlert, OnAirAlert, AnomalyAlert, EndOfServiceReport } from './types.js'
import { calculateOnAirStatusForPrograms } from '../lib/onAirCalculator.js'
import { alertLogger } from './logger.js'

const prisma = new PrismaClient()
const config = loadAlertConfig()

/**
 * 1. PROGRAMME JOURNALIER AUTOMATIQUE
 * Génère et envoie le programme du jour (matin/soir)
 */
export async function sendDailySchedule(gridId: string, period: 'MORNING' | 'EVENING'): Promise<boolean> {
  try {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Dimanche, 6 = Samedi
    
    // Récupérer le nom de la grille
    const grid = await prisma.grid.findUnique({
      where: { id: gridId },
      select: { name: true },
    })
    const gridName = grid?.name || 'Grille'
    
    // Définir les plages horaires
    const startTime = period === 'MORNING' ? '05:00' : '14:00'
    const endTime = period === 'MORNING' ? '13:59' : '23:59'
    
    // Récupérer les programmes du jour depuis PostgreSQL
    const programs = await prisma.program.findMany({
      where: {
        gridId,
        days: {
          has: dayOfWeek,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // Filtrer les programmes dans la plage horaire
    const filteredPrograms = programs.filter((p: any) => {
      const programStart = timeToMinutes(p.startTime)
      const rangeStart = timeToMinutes(startTime)
      const rangeEnd = timeToMinutes(endTime)
      return programStart >= rangeStart && programStart < rangeEnd
    })

    // Convertir en format Program
    const formattedPrograms: Program[] = filteredPrograms.map((p) => ({
      id: p.id,
      title: p.title,
      startTime: p.startTime,
      endTime: p.endTime,
      durationMin: p.durationMin,
      type: p.type as any,
      category: p.category || 'Divers',
      opStatus: p.opStatus as any,
      days: p.days,
      description: p.description,
    }))

    // Créer le bloc de programme
    const block: DailyScheduleBlock = {
      period,
      startTime,
      endTime,
      programs: formattedPrograms,
      hasGap: formattedPrograms.length === 0,
      gridName,
    }

    // Envoyer via Telegram
    const telegramMessage = formatDailyScheduleTelegram(block, today)
    await sendTelegramMessage(telegramMessage)

    // Envoyer via Email
    const emailContent = formatDailyScheduleEmail(block, today)
    await sendEmail(emailContent.subject, emailContent.html, emailContent.text)

    // Logger
    alertLogger.info(`Programme ${period} envoyé`, { 
      gridId, 
      period, 
      date: today.toISOString(),
      programsCount: formattedPrograms.length 
    })

    return true
  } catch (error: any) {
    alertLogger.error(`Erreur envoi programme ${period}`, { gridId, period }, error)
    return false
  }
}

/**
 * 2. ALERTES DE PRÉPARATION
 * Envoie une alerte avant la diffusion d'un programme
 */
export async function sendPreparationAlert(programId: string): Promise<boolean> {
  try {
    const program = await prisma.program.findUnique({
      where: { id: programId },
    })

    if (!program) {
      console.error(`❌ Programme ${programId} introuvable`)
      return false
    }

    // Déterminer le type d'alerte selon le type de programme
    let alertType: 'DIRECT' | 'COMMERCIAL' | 'SPECIAL'
    let minutesBefore: number

    if (program.type === 'LIVE') {
      alertType = 'DIRECT'
      minutesBefore = config.preparationAlerts.direct
    } else if (program.type === 'ADS') {
      alertType = 'COMMERCIAL' // COMMERCIAL est utilisé pour les alertes, mais le type Prisma est ADS
      minutesBefore = config.preparationAlerts.commercial
    } else if (program.type === 'SPECIAL') {
      alertType = 'SPECIAL'
      minutesBefore = config.preparationAlerts.special
    } else {
      // Pas d'alerte pour les autres types
      return false
    }

    // Calculer l'heure d'envoi
    const programStart = parseTime(program.startTime)
    const scheduledTime = new Date(programStart)
    scheduledTime.setMinutes(scheduledTime.getMinutes() - minutesBefore)

    const alert: PreparationAlert = {
      program: {
        id: program.id,
        title: program.title,
        startTime: program.startTime,
        endTime: program.endTime,
        durationMin: program.durationMin,
        type: program.type as any,
        category: program.category || 'Divers',
        opStatus: program.opStatus as any,
        days: program.days,
        description: program.description,
      },
      alertType,
      minutesBefore,
      scheduledTime,
    }

    // Envoyer via Telegram
    const telegramMessage = formatPreparationAlertTelegram(alert)
    await sendTelegramMessage(telegramMessage)

    // Envoyer via Email
    const emailContent = formatPreparationAlertEmail(alert)
    await sendEmail(emailContent.subject, emailContent.html, emailContent.text)

    alertLogger.info(`Alerte préparation envoyée`, { 
      programId, 
      programTitle: program.title, 
      alertType, 
      minutesBefore 
    })

    return true
  } catch (error: any) {
    alertLogger.error('Erreur envoi alerte préparation', { programId }, error)
    return false
  }
}

/**
 * 3. ALERTES ON AIR
 * Envoie une alerte lorsqu'un programme passe à ON_AIR
 */
export async function sendOnAirAlert(programId: string): Promise<boolean> {
  try {
    const program = await prisma.program.findUnique({
      where: { id: programId },
    })

    if (!program) {
      console.error(`❌ Programme ${programId} introuvable`)
      return false
    }

    // Vérifier que le programme est bien ON AIR
    const results = calculateOnAirStatusForPrograms([program])
    const onAirStatus = results[0]?.opStatus || program.opStatus
    if (onAirStatus !== 'AIRED') {
      console.log(`⚠️ Programme ${programId} n'est pas ON AIR (statut: ${onAirStatus})`)
      return false
    }

    // Calculer le temps restant
    const now = new Date()
    const programStart = parseTime(program.startTime)
    const programEnd = parseTime(program.endTime)
    const timeRemaining = Math.max(0, Math.floor((programEnd.getTime() - now.getTime()) / (1000 * 60)))

    const alert: OnAirAlert = {
      program: {
        id: program.id,
        title: program.title,
        startTime: program.startTime,
        endTime: program.endTime,
        durationMin: program.durationMin,
        type: program.type as any,
        category: program.category || 'Divers',
        opStatus: program.opStatus as any,
        days: program.days,
        description: program.description,
      },
      timeRemaining,
      startedAt: programStart,
    }

    // Envoyer via Telegram
    const telegramMessage = formatOnAirAlertTelegram(alert)
    await sendTelegramMessage(telegramMessage)

    // Envoyer via Email
    const emailContent = formatOnAirAlertEmail(alert)
    await sendEmail(emailContent.subject, emailContent.html, emailContent.text)

    alertLogger.info(`Alerte ON AIR envoyée`, { 
      programId, 
      programTitle: program.title, 
      timeRemaining 
    })

    return true
  } catch (error: any) {
    alertLogger.error('Erreur envoi alerte ON AIR', { programId }, error)
    return false
  }
}

/**
 * 4. ALERTES D'ANOMALIE
 * Envoie une alerte en cas d'anomalie détectée
 */
export async function sendAnomalyAlert(
  programId: string,
  anomalyType: 'NOT_STARTED' | 'DELAYED' | 'OVERRUN' | 'SKIPPED' | 'MANUAL_OVERRIDE',
  expectedTime?: string,
  actualTime?: string
): Promise<boolean> {
  try {
    const program = await prisma.program.findUnique({
      where: { id: programId },
    })

    if (!program) {
      console.error(`❌ Programme ${programId} introuvable`)
      return false
    }

    // Générer le message selon le type d'anomalie
    let message = ''
    switch (anomalyType) {
      case 'NOT_STARTED':
        message = `Le programme "${program.title}" prévu à ${expectedTime || program.startTime} n'a pas démarré.`
        break
      case 'DELAYED':
        message = `Le programme "${program.title}" est en retard. Horaire prévu: ${expectedTime || program.startTime}, Horaire réel: ${actualTime || 'en cours'}.`
        break
      case 'OVERRUN':
        message = `Le programme "${program.title}" dépasse son horaire prévu.`
        break
      case 'SKIPPED':
        message = `Le programme "${program.title}" a été sauté.`
        break
      case 'MANUAL_OVERRIDE':
        message = `Override manuel appliqué sur le programme "${program.title}".`
        break
    }

    const alert: AnomalyAlert = {
      type: anomalyType,
      program: {
        id: program.id,
        title: program.title,
        startTime: program.startTime,
        endTime: program.endTime,
        durationMin: program.durationMin,
        type: program.type as any,
        category: program.category || 'Divers',
        opStatus: program.opStatus as any,
        days: program.days,
        description: program.description,
      },
      expectedTime: expectedTime || program.startTime,
      ...(actualTime && { actualTime }),
      message,
    }

    // Envoyer via Telegram
    const telegramMessage = formatAnomalyAlertTelegram(alert)
    await sendTelegramMessage(telegramMessage)

    // Envoyer via Email
    const emailContent = formatAnomalyAlertEmail(alert)
    await sendEmail(emailContent.subject, emailContent.html, emailContent.text)

    alertLogger.info(`Alerte anomalie envoyée`, { 
      programId, 
      programTitle: program.title, 
      anomalyType, 
      expectedTime, 
      actualTime 
    })

    return true
  } catch (error: any) {
    alertLogger.error('Erreur envoi alerte anomalie', { programId, anomalyType }, error)
    return false
  }
}

/**
 * 5. FIN DE SERVICE
 * Génère et envoie le résumé de fin de service
 */
export async function sendEndOfServiceReport(gridId: string, date: Date = new Date()): Promise<boolean> {
  try {
    const dayOfWeek = date.getDay()
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Récupérer le nom de la grille
    const grid = await prisma.grid.findUnique({
      where: { id: gridId },
      select: { name: true },
    })
    const gridName = grid?.name || 'Grille'

    // Récupérer tous les programmes du jour
    const programs = await prisma.program.findMany({
      where: {
        gridId,
        days: {
          has: dayOfWeek,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // Filtrer les programmes diffusés (statut AIRED)
    const broadcastPrograms = programs.filter((p) => p.opStatus === 'AIRED')

    // Compter par type
    const directCount = broadcastPrograms.filter((p) => p.type === 'LIVE').length
    const commercialCount = broadcastPrograms.filter((p) => p.type === 'ADS').length
    const specialCount = broadcastPrograms.filter((p) => p.type === 'SPECIAL').length

    // Détecter les incidents
    const incidents: AnomalyAlert[] = []
    for (const program of programs) {
      if (program.opStatus === 'DELAYED') {
        incidents.push({
          type: 'DELAYED',
          program: {
            id: program.id,
            title: program.title,
            startTime: program.startTime,
            endTime: program.endTime,
            durationMin: program.durationMin,
            type: program.type as any,
            category: program.category || 'Divers',
            opStatus: program.opStatus as any,
            days: program.days,
            description: program.description,
          },
          expectedTime: program.startTime,
          message: `Programme "${program.title}" en retard`,
        })
      } else if (program.opStatus === 'OVERRUN') {
        incidents.push({
          type: 'OVERRUN',
          program: {
            id: program.id,
            title: program.title,
            startTime: program.startTime,
            endTime: program.endTime,
            durationMin: program.durationMin,
            type: program.type as any,
            category: program.category || 'Divers',
            opStatus: program.opStatus as any,
            days: program.days,
            description: program.description,
          },
          expectedTime: program.endTime,
          message: `Programme "${program.title}" a dépassé son horaire`,
        })
      } else if (program.opStatus === 'SKIPPED') {
        incidents.push({
          type: 'SKIPPED',
          program: {
            id: program.id,
            title: program.title,
            startTime: program.startTime,
            endTime: program.endTime,
            durationMin: program.durationMin,
            type: program.type as any,
            category: program.category || 'Divers',
            opStatus: program.opStatus as any,
            days: program.days,
            description: program.description,
          },
          expectedTime: program.startTime,
          message: `Programme "${program.title}" sauté`,
        })
      }
    }

    // Générer le résumé
    const summary = `Journée de diffusion terminée. ${broadcastPrograms.length} programme(s) diffusé(s) avec ${incidents.length} incident(s) signalé(s).`

    const report: EndOfServiceReport = {
      date,
      totalPrograms: broadcastPrograms.length,
      directCount,
      commercialCount,
      specialCount,
      incidents,
      summary,
      gridName,
    }

    // Envoyer via Telegram
    const telegramMessage = formatEndOfServiceReportTelegram(report)
    await sendTelegramMessage(telegramMessage)

    // Envoyer via Email
    const emailContent = formatEndOfServiceReportEmail(report)
    await sendEmail(emailContent.subject, emailContent.html, emailContent.text)

    alertLogger.info(`Rapport fin de service envoyé`, { 
      gridId, 
      date: date.toISOString(), 
      totalPrograms: report.totalPrograms, 
      incidentsCount: report.incidents.length 
    })

    return true
  } catch (error: any) {
    alertLogger.error('Erreur envoi rapport fin de service', { gridId, date: date.toISOString() }, error)
    return false
  }
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

