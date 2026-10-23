/**
 * Intégration des templates Ramadan avec le système d'alertes
 * Enrichit les messages Telegram/Email avec les flags Ramadan
 */

import { extractRamadanFlags } from './apply.js'
import type { Program } from '../alerts/types.js'

/**
 * Vérifie si un programme est un programme Ramadan
 */
export function isRamadanProgram(program: Program): boolean {
  const flags = extractRamadanFlags(program.description || null)
  return flags?.isRamadan === true
}

/**
 * Vérifie si un programme est critique (Iftar, Tarawih, Suhur)
 */
export function isCriticalProgram(program: Program): boolean {
  const flags = extractRamadanFlags(program.description || null)
  return flags?.isCritical === true
}

/**
 * Vérifie si un programme est un événement (plateaux, directs)
 */
export function isEventProgram(program: Program): boolean {
  const flags = extractRamadanFlags(program.description || null)
  return flags?.isEvent === true
}

/**
 * Vérifie si un programme est commercial
 */
export function isCommercialProgram(program: Program): boolean {
  const flags = extractRamadanFlags(program.description || null)
  return flags?.isCommercial === true
}

/**
 * Enrichit un message Telegram avec les badges Ramadan
 */
export function enrichTelegramMessage(message: string, program: Program): string {
  const flags = extractRamadanFlags(program.description || null)
  if (!flags?.isRamadan) return message

  let badges: string[] = []
  
  if (flags.isCritical) {
    badges.push('🔴 CRITIQUE')
  }
  if (flags.isEvent) {
    badges.push('⭐ ÉVÉNEMENT')
  }
  if (flags.isCommercial) {
    badges.push('💰 COMMERCIAL')
  }
  if (program.type === 'LIVE') {
    badges.push('📡 LIVE')
  }

  if (badges.length > 0) {
    const badgesStr = badges.join(' | ')
    // Ajouter les badges après le titre
    message = message.replace(
      new RegExp(`(<b>${program.title}</b>)`, 'i'),
      `$1\n   ${badgesStr}`
    )
  }

  // Ajouter le badge Ramadan général
  if (!message.includes('🌙 RAMADAN')) {
    message = message.replace(
      /(<b>📺 PROGRAMME)/,
      '🌙 <b>RAMADAN</b>\n$1'
    )
  }

  return message
}

/**
 * Enrichit un message Email avec les badges Ramadan
 */
export function enrichEmailMessage(html: string, program: Program): string {
  const flags = extractRamadanFlags(program.description || null)
  if (!flags?.isRamadan) return html

  let badges: string[] = []
  
  if (flags.isCritical) {
    badges.push('<span style="background: #dc2626; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">🔴 CRITIQUE</span>')
  }
  if (flags.isEvent) {
    badges.push('<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">⭐ ÉVÉNEMENT</span>')
  }
  if (flags.isCommercial) {
    badges.push('<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">💰 COMMERCIAL</span>')
  }
  if (program.type === 'LIVE') {
    badges.push('<span style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px;">📡 LIVE</span>')
  }

  if (badges.length > 0) {
    const badgesHtml = badges.join(' ')
    // Ajouter les badges après le titre
    html = html.replace(
      new RegExp(`(<strong>${program.title}</strong>)`, 'i'),
      `$1<br/>${badgesHtml}`
    )
  }

  // Ajouter le badge Ramadan général
  if (!html.includes('🌙 RAMADAN')) {
    html = html.replace(
      /(<h1[^>]*>)/,
      '<div style="background: #7c3aed; color: white; padding: 8px; text-align: center; font-weight: bold; margin-bottom: 10px;">🌙 RAMADAN</div>$1'
    )
  }

  return html
}

/**
 * Formate un programme Ramadan pour Telegram (format spécial)
 */
export function formatRamadanProgramTelegram(program: Program): string {
  const flags = extractRamadanFlags(program.description || null)
  if (!flags?.isRamadan) return ''

  let message = ''
  
  // Badge selon le type
  if (program.title.includes('IFTAR')) {
    message += '🕡 '
  } else if (program.title.includes('TARAWIH')) {
    message += '🕌 '
  } else if (program.title.includes('SUHUR')) {
    message += '🌙 '
  } else if (program.title.includes('FAJR')) {
    message += '☀️ '
  } else {
    message += '📺 '
  }

  message += `<b>${program.startTime}</b> ${program.title}`

  if (program.type === 'LIVE') {
    message += ' 🔴'
  }

  if (flags.isCritical) {
    message += ' ⚠️'
  }

  if (flags.isCommercial) {
    message += ' 💰'
  }

  return message
}

/**
 * Formate un bloc de programmes Ramadan pour Telegram
 */
export function formatRamadanScheduleTelegram(
  programs: Program[],
  period: 'MORNING' | 'EVENING',
  date: Date
): string {
  const periodLabel = period === 'MORNING' ? '🌅 MATIN' : '🌆 SOIR'
  const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  
  let message = `🌙 <b>GRILLE RAMADAN – ${periodLabel}</b>\n`
  message += `<b>${dateStr.toUpperCase()}</b>\n\n`

  // Filtrer les programmes Ramadan
  const ramadanPrograms = programs.filter(isRamadanProgram)
  
  // Trier par horaire
  ramadanPrograms.sort((a, b) => {
    const [aH, aM] = a.startTime.split(':').map(Number)
    const [bH, bM] = b.startTime.split(':').map(Number)
    const aMinutes = (aH || 0) * 60 + (aM || 0)
    const bMinutes = (bH || 0) * 60 + (bM || 0)
    return aMinutes - bMinutes
  })

  // Mettre en avant les programmes critiques
  const criticalPrograms = ramadanPrograms.filter(isCriticalProgram)
  const eventPrograms = ramadanPrograms.filter(isEventProgram)
  const commercialPrograms = ramadanPrograms.filter(isCommercialProgram)

  // Afficher les programmes critiques en premier
  if (criticalPrograms.length > 0) {
    message += `<b>🔴 PROGRAMMES CRITIQUES</b>\n`
    criticalPrograms.forEach(p => {
      message += formatRamadanProgramTelegram(p) + '\n'
    })
    message += '\n'
  }

  // Afficher les événements
  if (eventPrograms.length > 0) {
    message += `<b>⭐ ÉVÉNEMENTS</b>\n`
    eventPrograms.forEach(p => {
      if (!criticalPrograms.includes(p)) {
        message += formatRamadanProgramTelegram(p) + '\n'
      }
    })
    message += '\n'
  }

  // Afficher les programmes commerciaux
  if (commercialPrograms.length > 0) {
    message += `<b>💰 PROGRAMMES COMMERCIAUX</b>\n`
    commercialPrograms.forEach(p => {
      if (!criticalPrograms.includes(p) && !eventPrograms.includes(p)) {
        message += formatRamadanProgramTelegram(p) + '\n'
      }
    })
    message += '\n'
  }

  // Afficher les autres programmes
  const otherPrograms = ramadanPrograms.filter(
    p => !criticalPrograms.includes(p) && 
         !eventPrograms.includes(p) && 
         !commercialPrograms.includes(p)
  )
  
  if (otherPrograms.length > 0) {
    message += `<b>📺 AUTRES PROGRAMMES</b>\n`
    otherPrograms.forEach(p => {
      message += formatRamadanProgramTelegram(p) + '\n'
    })
  }

  return message
}

