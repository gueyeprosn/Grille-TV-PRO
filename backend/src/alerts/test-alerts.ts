/**
 * Script de test pour valider le système d'alertes
 * Usage: tsx src/alerts/test-alerts.ts
 */

import { PrismaClient } from '@prisma/client'
import {
  sendDailySchedule,
  sendPreparationAlert,
  sendOnAirAlert,
  sendAnomalyAlert,
  sendEndOfServiceReport,
} from './index.js'
import { alertLogger } from './logger.js'

const prisma = new PrismaClient()

async function testAlerts() {
  console.log('🧪 Test du système d\'alertes broadcast...\n')

  try {
    // Récupérer une grille et un programme pour les tests
    const grid = await prisma.grid.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
    })

    if (!grid) {
      console.error('❌ Aucune grille publiée trouvée')
      return
    }

    const program = await prisma.program.findFirst({
      where: { gridId: grid.id },
    })

    console.log(`📋 Grille de test: ${grid.name} (${grid.id})`)
    if (program) {
      console.log(`📺 Programme de test: ${program.title} (${program.id})\n`)
    }

    // Test 1: Programme journalier matin
    console.log('1️⃣ Test programme journalier MATIN...')
    const morningResult = await sendDailySchedule(grid.id, 'MORNING')
    console.log(morningResult ? '✅ Succès' : '❌ Échec\n')

    // Test 2: Programme journalier soir
    console.log('2️⃣ Test programme journalier SOIR...')
    const eveningResult = await sendDailySchedule(grid.id, 'EVENING')
    console.log(eveningResult ? '✅ Succès' : '❌ Échec\n')

    if (program) {
      // Test 3: Alerte de préparation
      console.log('3️⃣ Test alerte de préparation...')
      const prepResult = await sendPreparationAlert(program.id)
      console.log(prepResult ? '✅ Succès' : '❌ Échec (peut échouer si le programme n\'est pas LIVE/ADS/SPECIAL)\n')

      // Test 4: Alerte ON AIR (peut échouer si le programme n'est pas ON AIR)
      console.log('4️⃣ Test alerte ON AIR...')
      const onAirResult = await sendOnAirAlert(program.id)
      console.log(onAirResult ? '✅ Succès' : '❌ Échec (peut échouer si le programme n\'est pas ON AIR)\n')

      // Test 5: Alerte d'anomalie
      console.log('5️⃣ Test alerte d\'anomalie (DELAYED)...')
      const anomalyResult = await sendAnomalyAlert(program.id, 'DELAYED', program.startTime)
      console.log(anomalyResult ? '✅ Succès' : '❌ Échec\n')
    }

    // Test 6: Rapport fin de service
    console.log('6️⃣ Test rapport fin de service...')
    const reportResult = await sendEndOfServiceReport(grid.id)
    console.log(reportResult ? '✅ Succès' : '❌ Échec\n')

    // Afficher les logs récents
    console.log('📊 Logs récents:')
    const recentLogs = alertLogger.getRecentLogs(10)
    recentLogs.forEach((log) => {
      console.log(`  [${log.level}] ${log.message}`)
    })

    console.log('\n✅ Tests terminés')
  } catch (error: any) {
    console.error('❌ Erreur lors des tests:', error.message)
    console.error(error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter les tests
testAlerts()

