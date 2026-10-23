/**
 * EXEMPLES D'UTILISATION DU SYSTÈME UNIFIÉ
 * 
 * Ce fichier montre comment utiliser formatUnifiedMessage
 * avec des exemples réels pour chaque type de message
 */

import { formatUnifiedMessage, buildOnAirContext, buildPreparationContext, buildIncidentContext, buildEndOfServiceContext } from './unified-message.js'
import type { OnAirAlert, PreparationAlert, AnomalyAlert, EndOfServiceReport } from './types.js'

/**
 * EXEMPLE 1: ON AIR
 */
export function exampleOnAir() {
  const alert: OnAirAlert = {
    program: {
      id: 'prog-123',
      title: 'TARAWIH EN DIRECT',
      startTime: '20:00',
      endTime: '22:00',
      durationMin: 120,
      type: 'LIVE',
      category: 'RELIGION',
      opStatus: 'AIRED',
      days: [1, 2, 3, 4, 5, 6, 0], // Tous les jours
    },
    timeRemaining: 45,
    startedAt: new Date(),
  }

  const context = buildOnAirContext(alert)
  const message = formatUnifiedMessage('ON_AIR', context)

  console.log('=== EXEMPLE ON AIR ===')
  console.log('Telegram:', message.telegramText)
  console.log('\nEmail Subject:', message.emailSubject)
  console.log('\nEmail HTML:', message.emailHtml.substring(0, 200) + '...')

  return message
}

/**
 * EXEMPLE 2: INCIDENT (DELAYED)
 */
export function exampleIncident() {
  const alert: AnomalyAlert = {
    type: 'DELAYED',
    program: {
      id: 'prog-456',
      title: 'Émission Culturelle',
      startTime: '14:00',
      endTime: '15:00',
      durationMin: 60,
      type: 'LIVE',
      category: 'CULTURE',
      opStatus: 'DELAYED',
      days: [1],
    },
    expectedTime: '14:00',
    actualTime: '14:15',
    message: 'Le programme "Émission Culturelle" est en retard de 15 minutes.',
  }

  const context = buildIncidentContext(alert)
  const message = formatUnifiedMessage('INCIDENT', context)

  console.log('=== EXEMPLE INCIDENT ===')
  console.log('Telegram:', message.telegramText)
  console.log('\nEmail Subject:', message.emailSubject)

  return message
}

/**
 * EXEMPLE 3: FIN DE SERVICE
 */
export function exampleEndOfService() {
  const report: EndOfServiceReport = {
    date: new Date(),
    totalPrograms: 12,
    directCount: 5,
    commercialCount: 3,
    specialCount: 1,
    incidents: [
      {
        type: 'DELAYED',
        program: {
          id: 'prog-789',
          title: 'Programme Matin',
          startTime: '08:00',
          endTime: '09:00',
          durationMin: 60,
          type: 'LIVE',
          category: 'INFO',
          opStatus: 'DELAYED',
          days: [1],
        },
        expectedTime: '08:00',
        actualTime: '08:05',
        message: 'Programme "Programme Matin" en retard de 5 minutes',
      },
    ],
    summary: 'Journée de diffusion terminée. 12 programme(s) diffusé(s) avec 1 incident(s) signalé(s).',
    gridName: 'Grille Officielle',
  }

  const context = buildEndOfServiceContext(report)
  const message = formatUnifiedMessage('END_OF_SERVICE', context)

  console.log('=== EXEMPLE FIN DE SERVICE ===')
  console.log('Telegram:', message.telegramText)
  console.log('\nEmail Subject:', message.emailSubject)

  return message
}

/**
 * EXEMPLE 4: PRÉPARATION
 */
export function examplePreparation() {
  const alert: PreparationAlert = {
    program: {
      id: 'prog-321',
      title: 'Plateau Commercial',
      startTime: '18:00',
      endTime: '18:30',
      durationMin: 30,
      type: 'ADS',
      category: 'COMMERCIAL',
      opStatus: 'READY',
      days: [1],
    },
    alertType: 'COMMERCIAL',
    minutesBefore: 30,
    scheduledTime: new Date(),
  }

  const context = buildPreparationContext(alert)
  const message = formatUnifiedMessage('PREPARATION', context)

  console.log('=== EXEMPLE PRÉPARATION ===')
  console.log('Telegram:', message.telegramText)
  console.log('\nEmail Subject:', message.emailSubject)

  return message
}

// Pour tester : npm run alerts:examples
// ou : npx tsx src/alerts/unified-message-examples.ts
if (import.meta.url.endsWith('unified-message-examples.ts') || process.argv[1]?.includes('unified-message-examples')) {
  console.log('📺 EXEMPLES DE MESSAGES UNIFIÉS\n')
  exampleOnAir()
  console.log('\n' + '='.repeat(50) + '\n')
  exampleIncident()
  console.log('\n' + '='.repeat(50) + '\n')
  exampleEndOfService()
  console.log('\n' + '='.repeat(50) + '\n')
  examplePreparation()
}

