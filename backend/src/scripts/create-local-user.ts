/**
 * Script pour créer un utilisateur local avec mot de passe
 * Usage: tsx src/scripts/create-local-user.ts <email> <password> [role] [displayName]
 */

import bcrypt from 'bcryptjs'
import * as store from '../store-v3-prisma'

const [,, email, password, role = 'ADMIN', displayName] = process.argv

if (!email || !password) {
  console.error('Usage: tsx src/scripts/create-local-user.ts <email> <password> [role] [displayName]')
  console.error('Exemple: tsx src/scripts/create-local-user.ts admin@example.com admin123 ADMIN "Administrateur"')
  process.exit(1)
}

async function createUser() {
  try {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await store.getUserByEmail(email)
    
    if (existingUser) {
      // Mettre à jour le mot de passe si l'utilisateur existe
      const passwordHash = await bcrypt.hash(password, 10)
      const updatedUser = {
        ...existingUser,
        passwordHash,
        role: role as any,
        displayName: displayName || existingUser.displayName
      }
      await store.saveUser(updatedUser)
      console.log(`✅ Utilisateur mis à jour: ${email}`)
      console.log(`   - Rôle: ${role}`)
    } else {
      // Créer un nouvel utilisateur
      const passwordHash = await bcrypt.hash(password, 10)
      const user = {
        id: email, // Utiliser email comme ID temporaire
        email: email,
        displayName: displayName || email,
        role: role as any,
        passwordHash: passwordHash,
      }
      
      await store.saveUser(user)
      console.log(`✅ Utilisateur créé: ${email}`)
      console.log(`   - ID: ${user.id}`)
      console.log(`   - Rôle: ${role}`)
    }
    
    console.log('\n📝 Vous pouvez maintenant vous connecter avec:')
    console.log(`   Email: ${email}`)
    
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Erreur:', error.message)
    process.exit(1)
  }
}

createUser()

