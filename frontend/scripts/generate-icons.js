/**
 * Script pour générer les icônes PWA à partir du logo
 * Nécessite sharp: npm install --save-dev sharp
 */

const fs = require('fs')
const path = require('path')

// Vérifier si sharp est disponible
let sharp
try {
  sharp = require('sharp')
} catch (e) {
  console.log('⚠️  Sharp non disponible, création d\'icônes SVG simples')
  createSimpleIcons()
  process.exit(0)
}

const logoPath = path.join(__dirname, '../public/logo.png')
const outputDir = path.join(__dirname, '../public')

if (!fs.existsSync(logoPath)) {
  console.error('❌ logo.png non trouvé dans public/')
  createSimpleIcons()
  process.exit(1)
}

async function generateIcons() {
  try {
    // Générer icon-192.png
    await sharp(logoPath)
      .resize(192, 192, { fit: 'contain', background: { r: 11, g: 18, b: 32 } })
      .png()
      .toFile(path.join(outputDir, 'icon-192.png'))
    console.log('✅ icon-192.png créé')

    // Générer icon-512.png
    await sharp(logoPath)
      .resize(512, 512, { fit: 'contain', background: { r: 11, g: 18, b: 32 } })
      .png()
      .toFile(path.join(outputDir, 'icon-512.png'))
    console.log('✅ icon-512.png créé')

    console.log('✅ Icônes PWA générées avec succès')
  } catch (error) {
    console.error('❌ Erreur génération icônes:', error)
    createSimpleIcons()
  }
}

function createSimpleIcons() {
  // Créer des icônes SVG simples si sharp n'est pas disponible
  const svg192 = `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg">
  <rect width="192" height="192" fill="#0B1220"/>
  <text x="96" y="100" font-family="Arial" font-size="48" fill="#C1121F" text-anchor="middle" font-weight="bold">📺</text>
  <text x="96" y="140" font-family="Arial" font-size="16" fill="#F1F5F9" text-anchor="middle">GrilleTV</text>
</svg>`

  const svg512 = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="#0B1220"/>
  <text x="256" y="280" font-family="Arial" font-size="128" fill="#C1121F" text-anchor="middle" font-weight="bold">📺</text>
  <text x="256" y="360" font-family="Arial" font-size="48" fill="#F1F5F9" text-anchor="middle">GrilleTV Pro</text>
</svg>`

  // Note: Les SVG ne peuvent pas être utilisés directement comme icônes PWA
  // Il faut des PNG. On va créer des placeholders
  console.log('⚠️  Création d\'icônes placeholder - Veuillez générer les PNG manuellement')
  console.log('   Utilisez un outil en ligne ou ImageMagick pour convertir logo.png en:')
  console.log('   - icon-192.png (192x192)')
  console.log('   - icon-512.png (512x512)')
}

if (sharp) {
  generateIcons()
} else {
  createSimpleIcons()
}

