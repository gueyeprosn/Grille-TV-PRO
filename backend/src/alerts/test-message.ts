/**
 * Script de test simple pour envoyer un message test
 * Usage: npm run alerts:test
 * ou: npx tsx src/alerts/test-message.ts
 */

import 'dotenv/config'
import { sendTelegramMessage } from './telegram.js'
import { sendEmail } from './email.js'
import { formatUnifiedMessage, buildOnAirContext } from './unified-message.js'
import type { OnAirAlert } from './types.js'
import { loadAlertConfig } from './config.js'

const config = loadAlertConfig()

async function testMessage() {
  console.log('🧪 Test d\'envoi de message unifié...\n')

  // Créer un exemple de programme ON AIR
  const testAlert: OnAirAlert = {
    program: {
      id: 'test-prog-001',
      title: 'TARAWIH EN DIRECT',
      startTime: '20:00',
      endTime: '22:00',
      durationMin: 120,
      type: 'LIVE',
      category: 'RELIGION',
      opStatus: 'AIRED',
      days: [1, 2, 3, 4, 5, 6, 0],
    },
    timeRemaining: 45,
    startedAt: new Date(),
  }

  // Construire le contexte et formater le message
  const context = buildOnAirContext(testAlert)
  const message = formatUnifiedMessage('ON_AIR', context)

  console.log('📝 Message généré:')
  console.log('─'.repeat(50))
  console.log(message.telegramText)
  console.log('─'.repeat(50))
  console.log('\n📧 Sujet email:', message.emailSubject)
  console.log('\n')

  // Envoyer via Telegram si configuré
  if (config.telegram.enabled && config.telegram.botToken && config.telegram.chatId) {
    console.log('📱 Envoi via Telegram...')
    try {
      const telegramResult = await sendTelegramMessage(message.telegramText)
      if (telegramResult) {
        console.log('✅ Message Telegram envoyé avec succès\n')
      } else {
        console.log('⚠️ Échec envoi Telegram (vérifier la configuration)\n')
      }
    } catch (error: any) {
      console.error('❌ Erreur envoi Telegram:', error.message, '\n')
    }
  } else {
    console.log('⚠️ Telegram désactivé ou non configuré\n')
  }

  // Envoyer via Email si configuré
  if (config.email.enabled && config.email.toEmails.length > 0) {
    console.log('📧 Envoi via Email...')
    try {
      const emailResult = await sendEmail(message.emailSubject, message.emailHtml, message.emailText)
      if (emailResult) {
        console.log('✅ Message Email envoyé avec succès\n')
      } else {
        console.log('⚠️ Échec envoi Email (vérifier la configuration)\n')
      }
    } catch (error: any) {
      console.error('❌ Erreur envoi Email:', error.message, '\n')
    }
  } else {
    console.log('⚠️ Email désactivé ou non configuré\n')
  }

  // Afficher la configuration
  console.log('⚙️ Configuration actuelle:')
  console.log('  Telegram:', config.telegram.enabled ? '✅ Activé' : '❌ Désactivé')
  console.log('  Email:', config.email.enabled ? '✅ Activé' : '❌ Désactivé')
  console.log('\n✅ Test terminé')
}

// Exécuter le test
testMessage().catch(console.error)

