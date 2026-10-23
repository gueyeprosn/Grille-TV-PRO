/**
 * Script d'initialisation des permissions RBAC
 * 
 * À exécuter après la première migration Prisma:
 * npm run prisma:init
 */

import { initializePermissions } from '../lib/rbac'
import prisma from '../lib/prisma'

async function main() {
  console.log('🚀 Initialisation des permissions RBAC...')
  
  try {
    await initializePermissions()
    console.log('✅ Permissions initialisées avec succès')
    
    // Afficher un résumé
    const permissions = await prisma.permission.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log(`\n📊 ${permissions.length} permissions créées:`)
    permissions.forEach(p => {
      console.log(`  - ${p.name}: ${p.description || 'Sans description'}`)
    })
    
    const rolePermissions = await prisma.rolePermission.findMany({
      include: {
        permission: true
      }
    })
    
    console.log(`\n👥 ${rolePermissions.length} permissions assignées aux rôles`)
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

