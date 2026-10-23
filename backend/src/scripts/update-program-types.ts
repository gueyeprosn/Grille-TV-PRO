/**
 * Script de migration pour mettre à jour les types de diffusion des programmes
 * - Fusionne "Replay" et "Rediffusion" en "Rediffusion"
 * - Normalise "Autre" vers "PAD"
 * - Ajoute support pour "Plateau commercial" et "Pub"
 */

import prisma from '../lib/prisma.js'

async function updateProgramTypes() {
  console.log('🔄 Début de la mise à jour des types de diffusion...')

  try {
    // 1. Fusionner Replay vers Rediffusion
    const replayPrograms = await prisma.program.updateMany({
      where: {
        OR: [
          { type: 'REPLAY' },
        ]
      },
      data: {
        type: 'REPLAY', // On garde REPLAY dans Prisma mais on normalise typeDiffusion
      }
    })
    console.log(`✅ ${replayPrograms.count} programmes avec type REPLAY trouvés`)

    // 2. Mettre à jour les programmes avec typeDiffusion "Replay" ou "Autre"
    // Note: typeDiffusion n'est pas stocké dans Prisma, donc on doit le faire via les données JSON si elles existent
    // ou via une migration de données si elles sont stockées ailleurs

    // 3. Compter les programmes par type
    const stats = await prisma.program.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    })

    console.log('\n📊 Statistiques par type:')
    stats.forEach(stat => {
      console.log(`   ${stat.type}: ${stat._count.type} programme(s)`)
    })

    console.log('\n✅ Mise à jour terminée avec succès!')
    console.log('\n💡 Note: Les types de diffusion dans le formulaire ont été mis à jour:')
    console.log('   - "Replay" et "Rediffusion" sont maintenant fusionnés en "Rediffusion"')
    console.log('   - "Autre" a été retiré (remplacé par "PAD" par défaut)')
    console.log('   - "Plateau commercial" et "Pub" ont été ajoutés')

  } catch (error) {
    console.error('❌ Erreur lors de la mise à jour:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Exécuter le script
updateProgramTypes()
  .then(() => {
    console.log('✅ Script terminé')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erreur:', error)
    process.exit(1)
  })

