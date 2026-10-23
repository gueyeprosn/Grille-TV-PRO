/**
 * EXEMPLE SIMPLE D'UTILISATION
 * Générateur de Rapport de Diffusion Quotidien
 * 
 * Ce fichier montre comment utiliser le générateur avec des données minimales
 */

import { generateDailyBroadcastReport, type DailyBroadcastData } from './daily-broadcast-report.js'

/**
 * Exemple minimal - Génération d'un rapport simple
 */
export function exampleSimpleReport() {
  const today = new Date()
  
  const data: DailyBroadcastData = {
    date: today,
    programs: [
      {
        id: 'prog-001',
        title: 'Journal de Touba',
        startTime: '07:00',
        endTime: '07:30',
        durationMin: 30,
        type: 'LIVE',
        category: 'Actualités',
        opStatus: 'READY',
        days: [1, 2, 3, 4, 5],
        status: 'DIFFUSÉ',
      },
      {
        id: 'prog-002',
        title: 'Fenêtre commerciale',
        startTime: '07:30',
        endTime: '07:35',
        durationMin: 5,
        type: 'ADS',
        category: 'Publicité',
        opStatus: 'READY',
        days: [1, 2, 3, 4, 5],
        status: 'NON DIFFUSÉ',
        notes: 'Fenêtre non remplie',
      },
      {
        id: 'prog-003',
        title: 'Émission religieuse',
        startTime: '18:00',
        endTime: '19:00',
        durationMin: 60,
        type: 'LIVE',
        category: 'Religion',
        opStatus: 'READY',
        days: [1, 2, 3, 4, 5],
        status: 'DIFFUSÉ',
      },
    ],
    incidents: [
      {
        time: '07:30',
        type: 'NON DIFFUSÉ',
        description: 'Fenêtre commerciale non remplie',
        programId: 'prog-002',
        severity: 'MAJEUR',
      },
    ],
    globalStatus: 'ATTENTION',
    gridName: 'Grille Hebdomadaire',
  }
  
  // Générer le rapport
  const report = generateDailyBroadcastReport(data)
  
  // Afficher le résultat
  console.log('═══════════════════════════════════════════════════════════')
  console.log('📋 RAPPORT TELEGRAM')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(report.telegramText)
  
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('📧 SUJET EMAIL')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(report.emailSubject)
  
  return report
}

/**
 * Exemple avec plages horaires vides
 */
export function exampleWithEmptySlots() {
  const today = new Date()
  
  const data: DailyBroadcastData = {
    date: today,
    programs: [
      {
        id: 'prog-001',
        title: 'Programme matin',
        startTime: '08:00',
        endTime: '09:00',
        durationMin: 60,
        type: 'PAD',
        category: 'Général',
        opStatus: 'READY',
        days: [1, 2, 3, 4, 5],
        status: 'DIFFUSÉ',
      },
      // Pas de programme entre 09:00 et 18:00 - sera détecté comme plage vide
      {
        id: 'prog-002',
        title: 'Programme soir',
        startTime: '18:00',
        endTime: '19:00',
        durationMin: 60,
        type: 'LIVE',
        category: 'Général',
        opStatus: 'READY',
        days: [1, 2, 3, 4, 5],
        status: 'DIFFUSÉ',
      },
    ],
    globalStatus: 'OK',
  }
  
  const report = generateDailyBroadcastReport(data)
  
  // Le rapport contiendra automatiquement les plages vides
  // avec mention du remplissage automatique
  
  return report
}

/**
 * Exemple avec tous les programmes diffusés (cas idéal)
 */
export function examplePerfectDay() {
  const today = new Date()
  
  const data: DailyBroadcastData = {
    date: today,
    programs: [
      {
        id: 'prog-001',
        title: 'Programme 1',
        startTime: '07:00',
        endTime: '08:00',
        durationMin: 60,
        type: 'LIVE',
        category: 'Général',
        opStatus: 'READY',
        days: [1, 2, 3, 4, 5],
        status: 'DIFFUSÉ',
      },
      {
        id: 'prog-002',
        title: 'Programme 2',
        startTime: '08:00',
        endTime: '09:00',
        durationMin: 60,
        type: 'PAD',
        category: 'Général',
        opStatus: 'READY',
        days: [1, 2, 3, 4, 5],
        status: 'DIFFUSÉ',
      },
      {
        id: 'prog-003',
        title: 'Programme 3',
        startTime: '18:00',
        endTime: '19:00',
        durationMin: 60,
        type: 'LIVE',
        category: 'Général',
        opStatus: 'READY',
        days: [1, 2, 3, 4, 5],
        status: 'DIFFUSÉ',
      },
    ],
    // Pas d'incidents
    globalStatus: 'OK',
  }
  
  const report = generateDailyBroadcastReport(data)
  
  return report
}

// Exécuter un exemple si appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('📺 Exemple simple de rapport de diffusion quotidien\n')
  exampleSimpleReport()
}

