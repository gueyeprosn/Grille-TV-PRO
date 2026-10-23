/**
 * Service d'alertes - Point d'entrée principal
 * Gère l'initialisation et la planification des alertes
 */

import cron from 'node-cron'
import { loadAlertConfig } from './config.js'
import {
  checkPreparationAlerts,
  checkOnAirAlerts,
  checkAnomalyAlerts,
  scheduleDailyMorning,
  scheduleDailyEvening,
  scheduleEndOfService,
} from './scheduler.js'
import { alertLogger } from './logger.js'
import { PrismaClient } from '@prisma/client'

const config = loadAlertConfig()
const prisma = new PrismaClient()

/**
 * Récupère les grilles actives (celles qui ont des programmes aujourd'hui)
 */
async function getActiveGrids(): Promise<Array<{ id: string; name: string }>> {
  try {
    const today = new Date()
    const dayOfWeek = today.getDay() // 0 = Dimanche, 6 = Samedi
    
    // Récupérer toutes les grilles qui ont des programmes aujourd'hui
    const gridsWithPrograms = await prisma.grid.findMany({
      where: {
        programs: {
          some: {
            days: {
              has: dayOfWeek,
            },
          },
        },
        status: {
          in: ['PUBLISHED'], // Seulement les grilles publiées
        },
      },
      select: {
        id: true,
        name: true,
      },
      distinct: ['id'],
    })
    
    // Si aucune grille active trouvée, utiliser la grille par défaut depuis l'env
    if (gridsWithPrograms.length === 0) {
      const defaultGridId = process.env.OFFICIAL_GRID_ID
      if (defaultGridId) {
        const defaultGrid = await prisma.grid.findUnique({
          where: { id: defaultGridId },
          select: { id: true, name: true },
        })
        if (defaultGrid) {
          return [defaultGrid]
        }
      }
      return []
    }
    
    return gridsWithPrograms
  } catch (error: any) {
    alertLogger.error('Erreur récupération grilles actives', {}, error)
    // Fallback sur la grille par défaut
    const defaultGridId = process.env.OFFICIAL_GRID_ID
    if (defaultGridId) {
      return [{ id: defaultGridId, name: 'Grille par défaut' }]
    }
    return []
  }
}

/**
 * Initialise le système d'alertes
 * Configure les tâches cron pour les alertes automatiques
 * S'adapte automatiquement aux grilles actives (celles qui ont des programmes aujourd'hui)
 */
export function initAlertSystem(): void {
  alertLogger.info('Initialisation du système d\'alertes broadcast')

  // Vérifier la configuration
  if (!config.telegram.enabled && !config.email.enabled) {
    alertLogger.warn('Aucun canal d\'alerte activé (Telegram et Email désactivés)')
    return
  }

  // Programme journalier matin (04:30 par défaut)
  const [morningHour, morningMin] = config.schedules.dailyMorning.split(':').map(Number)
  cron.schedule(`${morningMin} ${morningHour} * * *`, async () => {
    alertLogger.info('Envoi programme matin déclenché')
    const activeGrids = await getActiveGrids()
    for (const grid of activeGrids) {
      scheduleDailyMorning(grid.id).catch((error) => {
        alertLogger.error('Erreur programme matin', { gridId: grid.id, gridName: grid.name }, error)
      })
    }
  })
  alertLogger.info(`Programme matin planifié`, { time: config.schedules.dailyMorning })

  // Programme journalier soir (13:30 par défaut)
  const [eveningHour, eveningMin] = config.schedules.dailyEvening.split(':').map(Number)
  cron.schedule(`${eveningMin} ${eveningHour} * * *`, async () => {
    alertLogger.info('Envoi programme soir déclenché')
    const activeGrids = await getActiveGrids()
    for (const grid of activeGrids) {
      scheduleDailyEvening(grid.id).catch((error) => {
        alertLogger.error('Erreur programme soir', { gridId: grid.id, gridName: grid.name }, error)
      })
    }
  })
  alertLogger.info(`Programme soir planifié`, { time: config.schedules.dailyEvening })

  // Vérification des alertes toutes les minutes
  cron.schedule('* * * * *', async () => {
    const activeGrids = await getActiveGrids()
    for (const grid of activeGrids) {
      checkPreparationAlerts(grid.id).catch((error) => {
        alertLogger.error('Erreur vérification préparation', { gridId: grid.id, gridName: grid.name }, error)
      })
      checkOnAirAlerts(grid.id).catch((error) => {
        alertLogger.error('Erreur vérification ON AIR', { gridId: grid.id, gridName: grid.name }, error)
      })
      checkAnomalyAlerts(grid.id).catch((error) => {
        alertLogger.error('Erreur vérification anomalies', { gridId: grid.id, gridName: grid.name }, error)
      })
    }
  })
  alertLogger.info('Vérifications automatiques activées', { interval: 'toutes les minutes' })

  // Fin de service (23:59)
  cron.schedule('59 23 * * *', async () => {
    alertLogger.info('Envoi rapport fin de service déclenché')
    const activeGrids = await getActiveGrids()
    for (const grid of activeGrids) {
      scheduleEndOfService(grid.id).catch((error) => {
        alertLogger.error('Erreur rapport fin de service', { gridId: grid.id, gridName: grid.name }, error)
      })
    }
  })
  alertLogger.info('Rapport fin de service planifié', { time: '23:59' })

  alertLogger.info('Système d\'alertes initialisé avec succès (s\'adapte aux grilles actives)')
}

