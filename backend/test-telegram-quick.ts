/**
 * Test rapide de la configuration Telegram
 * Usage: tsx test-telegram-quick.ts
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '.env') })

async function testTelegram() {
  console.log('🧪 Test rapide de la configuration Telegram...\n')

  // Vérifier les variables d'environnement
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  const enabled = process.env.TELEGRAM_ENABLED === 'true'

  console.log('📋 Configuration:')
  console.log(`   TELEGRAM_ENABLED: ${enabled}`)
  console.log(`   TELEGRAM_BOT_TOKEN: ${botToken ? '✅ Configuré' : '❌ Manquant'}`)
  console.log(`   TELEGRAM_CHAT_ID: ${chatId ? '✅ Configuré' : '❌ Manquant'}\n`)

  if (!enabled) {
    console.log('⚠️  Telegram est désactivé (TELEGRAM_ENABLED=false)')
    console.log('   Activez-le dans .env pour tester\n')
    return
  }

  if (!botToken || botToken === 'your_telegram_bot_token' || botToken.trim() === '') {
    console.log('❌ TELEGRAM_BOT_TOKEN non configuré ou valeur par défaut')
    console.log('   📝 Étapes pour obtenir un token:')
    console.log('      1. Ouvrir Telegram et rechercher @BotFather')
    console.log('      2. Envoyer la commande /newbot')
    console.log('      3. Suivre les instructions')
    console.log('      4. Copier le token fourni dans .env\n')
    return
  }

  if (!chatId || chatId === 'your_telegram_chat_id' || chatId.trim() === '') {
    console.log('❌ TELEGRAM_CHAT_ID non configuré ou valeur par défaut')
    console.log('   📝 Étapes pour obtenir votre Chat ID:')
    console.log('      1. Ouvrir Telegram et rechercher @userinfobot')
    console.log('      2. Démarrer une conversation')
    console.log('      3. Copier votre Chat ID dans .env\n')
    return
  }

  // Tester l'envoi d'un message
  console.log('📤 Envoi d\'un message de test...\n')

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ Test GrilleTV Pro\n\n📅 ${new Date().toLocaleString('fr-FR')}\n\nConfiguration Telegram opérationnelle !`,
        parse_mode: 'HTML',
      }),
    })

    const data = await response.json()

    if (data.ok) {
      console.log('✅ SUCCÈS ! Message envoyé avec succès')
      console.log(`   Message ID: ${data.result.message_id}`)
      console.log(`   Chat: ${data.result.chat.title || data.result.chat.first_name}`)
      console.log(`   Date: ${new Date(data.result.date * 1000).toLocaleString('fr-FR')}\n`)
      console.log('🎉 Votre configuration Telegram fonctionne correctement !\n')
    } else {
      console.log('❌ ÉCHEC - Erreur Telegram API:')
      console.log(`   Code: ${data.error_code}`)
      console.log(`   Description: ${data.description}\n`)

      if (data.error_code === 401) {
        console.log('💡 Le token bot est invalide. Vérifiez TELEGRAM_BOT_TOKEN')
      } else if (data.error_code === 400) {
        console.log('💡 Le Chat ID est invalide. Vérifiez TELEGRAM_CHAT_ID')
      } else if (data.error_code === 403) {
        console.log('💡 Le bot n\'a pas accès au chat. Ajoutez le bot au groupe ou démarrez une conversation')
      }
      console.log('')
    }
  } catch (error: any) {
    console.log('❌ ERREUR lors de l\'envoi:')
    console.log(`   ${error.message}\n`)
    
    if (error.message.includes('fetch')) {
      console.log('💡 Vérifiez votre connexion Internet\n')
    }
  }
}

// Exécuter le test
testTelegram()

