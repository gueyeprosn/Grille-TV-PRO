/**
 * Test rapide de la configuration Email SMTP
 * Usage: tsx test-email-quick.ts
 */

import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Charger les variables d'environnement
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '.env') })

async function testEmail() {
  console.log('🧪 Test rapide de la configuration Email SMTP...\n')

  // Vérifier les variables d'environnement
  const enabled = process.env.EMAIL_ENABLED === 'true'
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10)
  const smtpUser = process.env.SMTP_USER
  const smtpPassword = process.env.SMTP_PASSWORD
  const fromEmail = process.env.EMAIL_FROM
  const toEmails = (process.env.EMAIL_TO || '').split(',').filter(Boolean)

  console.log('📋 Configuration:')
  console.log(`   EMAIL_ENABLED: ${enabled}`)
  console.log(`   SMTP_HOST: ${smtpHost ? '✅ Configuré' : '❌ Manquant'}`)
  console.log(`   SMTP_PORT: ${smtpPort}`)
  console.log(`   SMTP_USER: ${smtpUser ? '✅ Configuré' : '❌ Manquant'}`)
  console.log(`   SMTP_PASSWORD: ${smtpPassword ? '✅ Configuré' : '❌ Manquant'}`)
  console.log(`   EMAIL_FROM: ${fromEmail ? '✅ Configuré' : '❌ Manquant'}`)
  console.log(`   EMAIL_TO: ${toEmails.length > 0 ? `✅ ${toEmails.length} destinataire(s)` : '❌ Manquant'}\n`)

  if (!enabled) {
    console.log('⚠️  Email est désactivé (EMAIL_ENABLED=false)')
    console.log('   Activez-le dans .env pour tester\n')
    return
  }

  if (!smtpHost || !smtpUser || !smtpPassword || !fromEmail || toEmails.length === 0) {
    console.log('❌ Configuration incomplète')
    if (!smtpHost) console.log('   - SMTP_HOST manquant')
    if (!smtpUser) console.log('   - SMTP_USER manquant')
    if (!smtpPassword) console.log('   - SMTP_PASSWORD manquant')
    if (!fromEmail) console.log('   - EMAIL_FROM manquant')
    if (toEmails.length === 0) console.log('   - EMAIL_TO manquant\n')
    return
  }

  // Tester l'envoi d'un email
  console.log('📤 Envoi d\'un email de test...\n')

  try {
    const { sendEmail } = await import('./src/alerts/email.js')
    
    const subject = '✅ Test GrilleTV Pro - Configuration SMTP'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">🌙 Test Email - GrilleTV Pro</h2>
        <p>Bonjour,</p>
        <p>Ceci est un email de test pour vérifier la configuration SMTP de GrilleTV Pro.</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>SMTP Host: ${smtpHost}</li>
          <li>SMTP Port: ${smtpPort}</li>
          <li>From: ${fromEmail}</li>
          <li>To: ${toEmails.join(', ')}</li>
        </ul>
        <p style="color: #10b981; font-weight: bold;">✅ Configuration SMTP opérationnelle !</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 12px;">GrilleTV Pro - Système d'alertes broadcast</p>
      </div>
    `
    const text = `
Test Email - GrilleTV Pro

Ceci est un email de test pour vérifier la configuration SMTP.

Date: ${new Date().toLocaleString('fr-FR')}
Configuration:
- SMTP Host: ${smtpHost}
- SMTP Port: ${smtpPort}
- From: ${fromEmail}
- To: ${toEmails.join(', ')}

✅ Configuration SMTP opérationnelle !

GrilleTV Pro - Système d'alertes broadcast
    `

    const success = await sendEmail(subject, html, text)

    if (success) {
      console.log('✅ SUCCÈS ! Email envoyé avec succès')
      console.log(`   De: ${fromEmail}`)
      console.log(`   À: ${toEmails.join(', ')}`)
      console.log(`   Sujet: ${subject}\n`)
      console.log('🎉 Votre configuration SMTP fonctionne correctement !\n')
    } else {
      console.log('❌ ÉCHEC - Erreur lors de l\'envoi de l\'email')
      console.log('   Vérifiez les logs ci-dessus pour plus de détails\n')
    }
  } catch (error: any) {
    console.log('❌ ERREUR lors de l\'envoi:')
    console.log(`   ${error.message}\n`)
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Le serveur SMTP est inaccessible. Vérifiez:')
      console.log('   - SMTP_HOST est correct')
      console.log('   - SMTP_PORT est correct')
      console.log('   - Le serveur SMTP est accessible depuis ce serveur\n')
    } else if (error.message.includes('authentication')) {
      console.log('💡 Erreur d\'authentification. Vérifiez:')
      console.log('   - SMTP_USER est correct')
      console.log('   - SMTP_PASSWORD est correct\n')
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Le serveur SMTP est introuvable. Vérifiez SMTP_HOST\n')
    }
  }
}

// Exécuter le test
testEmail()

