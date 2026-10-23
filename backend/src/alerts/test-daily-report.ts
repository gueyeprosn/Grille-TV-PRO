/**
 * Script de test pour le générateur de rapport de diffusion quotidien
 * 
 * Usage:
 *   npm run test:daily-report
 *   ou
 *   tsx src/alerts/test-daily-report.ts
 */

import { generateDailyBroadcastReport, type DailyBroadcastData, type ProgramWithStatus, type Incident } from './daily-broadcast-report.js'
import { sendTelegramMessage } from './telegram.js'
import { sendEmail } from './email.js'

/**
 * Exemple de données pour le rapport
 */
function createSampleData(): DailyBroadcastData {
  const today = new Date()
  
  const programs: ProgramWithStatus[] = [
    {
      id: 'r-0400-quran',
      title: 'Lecture Saint Coran – Spécial Ramadan',
      startTime: '04:00',
      endTime: '05:00',
      durationMin: 60,
      type: 'PAD',
      category: 'Religion',
      opStatus: 'READY',
      days: [0, 1, 2, 3, 4, 5, 6],
      status: 'DIFFUSÉ',
    },
    {
      id: 'r-0500-khassida',
      title: 'Khassida & Invocations du Fajr',
      startTime: '05:00',
      endTime: '05:45',
      durationMin: 45,
      type: 'PAD',
      category: 'Religion',
      opStatus: 'READY',
      days: [0, 1, 2, 3, 4, 5, 6],
      status: 'DIFFUSÉ',
    },
    {
      id: 'r-0700-jt-ramadan',
      title: 'Journal de Touba – Édition Ramadan',
      startTime: '07:00',
      endTime: '07:30',
      durationMin: 30,
      type: 'LIVE',
      category: 'Actualités',
      opStatus: 'READY',
      days: [0, 1, 2, 3, 4, 5, 6],
      status: 'DIFFUSÉ',
      actualStartTime: '07:02',
      notes: 'Démarrage avec 2 minutes de retard',
    },
    {
      id: 'r-0730-ads',
      title: 'Fenêtre commerciale matinale Ramadan',
      startTime: '07:30',
      endTime: '07:35',
      durationMin: 5,
      type: 'ADS',
      category: 'Publicité',
      opStatus: 'READY',
      days: [1, 2, 3, 4, 5],
      status: 'NON DIFFUSÉ',
      notes: 'Fenêtre non remplie - à rattraper',
    },
    {
      id: 'r-1600-tafsir',
      title: 'Tafsir du Coran – Spécial Ramadan',
      startTime: '16:00',
      endTime: '17:30',
      durationMin: 90,
      type: 'LIVE',
      category: 'Religion',
      opStatus: 'READY',
      days: [1, 3, 5],
      status: 'DIFFUSÉ',
    },
    {
      id: 'r-1730-jt-soir',
      title: 'Journal de Touba – Soir Ramadan',
      startTime: '17:30',
      endTime: '18:00',
      durationMin: 30,
      type: 'LIVE',
      category: 'Actualités',
      opStatus: 'READY',
      days: [0, 1, 2, 3, 4, 5, 6],
      status: 'DIFFUSÉ',
    },
    {
      id: 'r-1830-iftar',
      title: 'Iftar & Invocations en Direct',
      startTime: '18:30',
      endTime: '19:00',
      durationMin: 30,
      type: 'LIVE',
      category: 'Religion',
      opStatus: 'READY',
      days: [0, 1, 2, 3, 4, 5, 6],
      status: 'DIFFUSÉ',
    },
    {
      id: 'r-2000-dialogue-ramadan',
      title: 'Dialogue Ramadan',
      startTime: '20:00',
      endTime: '21:30',
      durationMin: 90,
      type: 'LIVE',
      category: 'Religion',
      opStatus: 'READY',
      days: [2, 4],
      status: 'DIFFUSÉ',
    },
    {
      id: 'r-2130-ads',
      title: 'Fenêtre commerciale soirée Ramadan',
      startTime: '21:30',
      endTime: '21:35',
      durationMin: 5,
      type: 'ADS',
      category: 'Publicité',
      opStatus: 'READY',
      days: [2, 4],
      status: 'DIFFUSÉ',
    },
    {
      id: 'r-2200-qiyam',
      title: 'Qiyam & Prières nocturnes',
      startTime: '22:00',
      endTime: '23:30',
      durationMin: 90,
      type: 'PAD',
      category: 'Religion',
      opStatus: 'READY',
      days: [0, 1, 2, 3, 4, 5, 6],
      status: 'DIFFUSÉ',
    },
  ]
  
  const incidents: Incident[] = [
    {
      time: '07:02',
      type: 'RETARD',
      description: 'Journal de Touba a démarré avec 2 minutes de retard',
      programId: 'r-0700-jt-ramadan',
      severity: 'MINEUR',
    },
    {
      time: '07:30',
      type: 'NON DIFFUSÉ',
      description: 'Fenêtre commerciale matinale non remplie',
      programId: 'r-0730-ads',
      severity: 'MAJEUR',
    },
  ]
  
  return {
    date: today,
    programs,
    incidents,
    globalStatus: 'ATTENTION',
    gridName: 'Grille Ramadan 2025',
  }
}

/**
 * Fonction principale de test
 */
async function main() {
  console.log('📺 Génération du rapport de diffusion quotidien...\n')
  
  // Créer les données d'exemple
  const data = createSampleData()
  
  // Générer le rapport
  const report = generateDailyBroadcastReport(data)
  
  // Afficher le rapport dans la console
  console.log('═══════════════════════════════════════════════════════════')
  console.log('📋 RAPPORT TELEGRAM')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(report.telegramText)
  console.log('\n')
  
  console.log('═══════════════════════════════════════════════════════════')
  console.log('📧 SUJET EMAIL')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(report.emailSubject)
  console.log('\n')
  
  // Optionnel : Envoyer via Telegram
  const sendTelegram = process.env.SEND_TELEGRAM === 'true'
  if (sendTelegram) {
    console.log('📱 Envoi du rapport via Telegram...')
    const telegramSent = await sendTelegramMessage(report.telegramText)
    if (telegramSent) {
      console.log('✅ Rapport envoyé via Telegram')
    } else {
      console.log('❌ Échec de l\'envoi Telegram')
    }
  }
  
  // Optionnel : Envoyer via Email
  const sendEmailReport = process.env.SEND_EMAIL === 'true'
  if (sendEmailReport) {
    console.log('📧 Envoi du rapport via Email...')
    const emailSent = await sendEmail(
      report.emailSubject,
      report.emailHtml,
      report.emailText
    )
    if (emailSent) {
      console.log('✅ Rapport envoyé via Email')
    } else {
      console.log('❌ Échec de l\'envoi Email')
    }
  }
  
  // Sauvegarder dans un fichier pour inspection
  const fs = await import('fs/promises')
  const outputDir = './test-output'
  try {
    await fs.mkdir(outputDir, { recursive: true })
  } catch (e) {
    // Directory might already exist
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await fs.writeFile(
    `${outputDir}/daily-report-telegram-${timestamp}.txt`,
    report.telegramText,
    'utf-8'
  )
  await fs.writeFile(
    `${outputDir}/daily-report-email-${timestamp}.html`,
    report.emailHtml,
    'utf-8'
  )
  await fs.writeFile(
    `${outputDir}/daily-report-email-${timestamp}.txt`,
    report.emailText,
    'utf-8'
  )
  
  console.log(`\n✅ Rapport sauvegardé dans ${outputDir}/`)
  console.log(`   - daily-report-telegram-${timestamp}.txt`)
  console.log(`   - daily-report-email-${timestamp}.html`)
  console.log(`   - daily-report-email-${timestamp}.txt`)
}

// Exécuter si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error)
}

export { main, createSampleData }

