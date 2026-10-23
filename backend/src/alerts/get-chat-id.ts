/**
 * Script pour obtenir le CHAT_ID d'un groupe Telegram
 * 
 * Instructions:
 * 1. Ajoutez le bot dans votre groupe Telegram
 * 2. Donnez-lui les permissions d'admin (optionnel mais recommandé)
 * 3. Envoyez un message dans le groupe (n'importe quel message)
 * 4. Exécutez ce script: npm run alerts:get-chat-id
 * 
 * Le script va récupérer les mises à jour du bot et afficher le CHAT_ID du groupe
 */

import 'dotenv/config'
import axios from 'axios'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN non configuré dans .env')
  process.exit(1)
}

async function getChatId() {
  console.log('🔍 Récupération du CHAT_ID du groupe...\n')
  console.log('📝 Instructions:')
  console.log('  1. Assurez-vous que le bot est dans le groupe')
  console.log('  2. Envoyez un message dans le groupe (n\'importe quel message)')
  console.log('  3. Attendez quelques secondes...\n')

  try {
    // Récupérer les mises à jour récentes
    const response = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`)
    
    // Parcourir les mises à jour pour trouver les groupes
    const groups = new Map<string, { id: string; title: string; type: string }>()
    
    if (response.data.ok && response.data.result.length > 0) {
      console.log('✅ Mises à jour trouvées:\n')
      
      for (const update of response.data.result) {
        if (update.message?.chat) {
          const chat = update.message.chat
          // Filtrer uniquement les groupes et supergroupes
          if (chat.type === 'group' || chat.type === 'supergroup') {
            const key = chat.id.toString()
            if (!groups.has(key)) {
              groups.set(key, {
                id: chat.id.toString(),
                title: chat.title || 'Groupe sans nom',
                type: chat.type,
              })
            }
          }
        }
      }

      if (groups.size > 0) {
        console.log('📋 Groupes trouvés:\n')
        groups.forEach((group, id) => {
          console.log(`  Nom: ${group.title}`)
          console.log(`  Type: ${group.type}`)
          console.log(`  CHAT_ID: ${group.id}`)
          console.log(`  ────────────────────────\n`)
        })
        
        if (groups.size > 0) {
          const firstGroup = Array.from(groups.values())[0]
          if (firstGroup) {
            console.log('💡 Pour utiliser un groupe, ajoutez dans votre .env:')
            console.log(`   TELEGRAM_CHAT_ID=${firstGroup.id}\n`)
            console.log('   Ou pour utiliser le supergroupe (recommandé):')
            const supergroup = Array.from(groups.values()).find(g => g.type === 'supergroup')
            if (supergroup) {
              console.log(`   TELEGRAM_CHAT_ID=${supergroup.id}\n`)
            }
          }
        }
      } else {
        console.log('⚠️ Aucun groupe trouvé dans les mises à jour récentes')
        console.log('   Assurez-vous que:')
        console.log('   - Le bot est dans le groupe')
        console.log('   - Un message a été envoyé dans le groupe récemment')
        console.log('   - Le bot a les permissions nécessaires\n')
      }

      // Afficher aussi les chats privés pour référence
      const privateChats = new Map<string, { id: string; username: string }>()
      for (const update of response.data.result) {
        if (update.message?.chat && update.message.chat.type === 'private') {
          const chat = update.message.chat
          const key = chat.id.toString()
          if (!privateChats.has(key)) {
            privateChats.set(key, {
              id: chat.id.toString(),
              username: chat.username || chat.first_name || 'Utilisateur',
            })
          }
        }
      }

      if (privateChats.size > 0) {
        console.log('👤 Chats privés trouvés (pour référence):')
        privateChats.forEach((chat, id) => {
          console.log(`  ${chat.username}: ${chat.id}`)
        })
        console.log()
      }
    } else {
      console.log('⚠️ Aucune mise à jour trouvée')
      console.log('   Assurez-vous que:')
      console.log('   - Le bot est dans le groupe')
      console.log('   - Un message a été envoyé dans le groupe')
      console.log('   - Le bot a les permissions nécessaires\n')
    }

    // Afficher la configuration actuelle
    const currentChatId = process.env.TELEGRAM_CHAT_ID
    if (currentChatId && groups.size > 0) {
      console.log('⚙️ Configuration actuelle:')
      console.log(`   TELEGRAM_CHAT_ID=${currentChatId}`)
      
      // Vérifier si le CHAT_ID actuel correspond à un groupe trouvé
      const foundGroup = Array.from(groups.values()).find(g => g.id === currentChatId)
      if (foundGroup) {
        console.log(`   ✅ Correspond au groupe: ${foundGroup.title}`)
      } else {
        console.log(`   ⚠️ Ne correspond à aucun groupe trouvé`)
        console.log(`   💡 Utilisez l'un des CHAT_ID affichés ci-dessus`)
      }
      console.log()
    } else if (currentChatId) {
      console.log('⚙️ Configuration actuelle:')
      console.log(`   TELEGRAM_CHAT_ID=${currentChatId}`)
      console.log(`   ⚠️ Aucun groupe trouvé pour vérifier\n`)
    }
  } catch (error: any) {
    if (error.response) {
      console.error('❌ Erreur API Telegram:', error.response.data)
      if (error.response.data.error_code === 401) {
        console.error('   Le BOT_TOKEN est invalide')
      }
    } else {
      console.error('❌ Erreur:', error.message)
    }
  }
}

getChatId()

