/**
 * Exemple d'intégration du système d'alertes
 * À intégrer dans server.ts ou un fichier dédié
 */

import cron from 'node-cron'
import {
  checkPreparationAlerts,
  checkOnAirAlerts,
  checkAnomalyAlerts,
  scheduleDailyMorning,
  scheduleDailyEvening,
  scheduleEndOfService,
} from './scheduler.js'

// ID de la grille officielle (à récupérer depuis la config ou la DB)
const OFFICIAL_GRID_ID = process.env.OFFICIAL_GRID_ID || 'default-grid-id'

/**
 * Initialise le système d'alertes
 */
export function initAlertSystem() {
  console.log('📢 Initialisation du système d\'alertes broadcast...')

  // Programme journalier matin (04:30)
  cron.schedule('30 4 * * *', () => {
    console.log('🌅 Envoi programme matin...')
    scheduleDailyMorning(OFFICIAL_GRID_ID).catch(console.error)
  })

  // Programme journalier soir (13:30)
  cron.schedule('30 13 * * *', () => {
    console.log('🌆 Envoi programme soir...')
    scheduleDailyEvening(OFFICIAL_GRID_ID).catch(console.error)
  })

  // Vérification des alertes toutes les minutes
  cron.schedule('* * * * *', () => {
    checkPreparationAlerts(OFFICIAL_GRID_ID).catch(console.error)
    checkOnAirAlerts(OFFICIAL_GRID_ID).catch(console.error)
    checkAnomalyAlerts(OFFICIAL_GRID_ID).catch(console.error)
  })

  // Fin de service (23:59)
  cron.schedule('59 23 * * *', () => {
    console.log('📊 Envoi rapport fin de service...')
    scheduleEndOfService(OFFICIAL_GRID_ID).catch(console.error)
  })

  console.log('✅ Système d\'alertes initialisé')
}

/**
 * Alternative : Intégration manuelle dans les hooks Prisma
 * À ajouter dans store-v3-prisma.ts ou api-v3-prisma.ts
 */

/*
import { sendOnAirAlert, sendAnomalyAlert } from './alerts/index.js'

// Dans la fonction de mise à jour de programme
if (after.opStatus === 'AIRED' && before.opStatus !== 'AIRED') {
  // Programme vient de passer à ON AIR
  sendOnAirAlert(after.id).catch(console.error)
}

if (after.opStatus === 'DELAYED') {
  sendAnomalyAlert(after.id, 'DELAYED', after.startTime).catch(console.error)
}

if (after.opStatus === 'OVERRUN') {
  sendAnomalyAlert(after.id, 'OVERRUN', after.endTime).catch(console.error)
}

if (after.opStatus === 'SKIPPED') {
  sendAnomalyAlert(after.id, 'SKIPPED', after.startTime).catch(console.error)
}
*/

