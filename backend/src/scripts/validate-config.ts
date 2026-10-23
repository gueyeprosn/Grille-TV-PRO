/**
 * Script de validation de la configuration
 * 
 * Vérifie que toutes les variables d'environnement requises sont présentes
 * et valides avant de démarrer le serveur.
 * 
 * Usage: tsx src/scripts/validate-config.ts
 */

import dotenv from 'dotenv'
import { existsSync } from 'fs'
import { join } from 'path'

dotenv.config()

interface ConfigCheck {
  name: string
  required: boolean
  validate?: (value: string) => boolean
  message?: string
}

const checks: ConfigCheck[] = [
  {
    name: 'NODE_ENV',
    required: false,
    validate: (v) => ['development', 'production', 'test'].includes(v),
    message: 'NODE_ENV doit être development, production ou test'
  },
  {
    name: 'PORT',
    required: false,
    validate: (v) => {
      const port = parseInt(v, 10)
      return !isNaN(port) && port > 0 && port < 65536
    },
    message: 'PORT doit être un nombre entre 1 et 65535'
  },
  {
    name: 'DATABASE_URL',
    required: true,
    validate: (v) => v.startsWith('postgresql://'),
    message: 'DATABASE_URL doit commencer par postgresql://'
  },
  {
    name: 'JWT_SECRET',
    required: true,
    validate: (v) => {
      if (process.env.NODE_ENV === 'production') {
        return v.length >= 32 && v !== 'dev' && v !== 'change_this'
      }
      return v.length >= 8
    },
    message: 'JWT_SECRET doit faire au moins 32 caractères en production et ne pas être "dev" ou "change_this"'
  },
  {
    name: 'ALLOW_ORIGIN',
    required: false,
    validate: (v) => {
      if (process.env.NODE_ENV === 'production') {
        return v !== '*' && v.length > 0
      }
      return true
    },
    message: 'ALLOW_ORIGIN ne doit pas être "*" en production'
  }
]

function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Vérifier si .env existe
  const envPath = join(process.cwd(), '.env')
  if (!existsSync(envPath)) {
    console.warn('⚠️  Fichier .env non trouvé. Utilisation des variables d\'environnement système.')
  }

  // Vérifier chaque variable
  for (const check of checks) {
    const value = process.env[check.name]

    if (!value) {
      if (check.required) {
        errors.push(`❌ ${check.name}: Requis mais non défini`)
      }
      continue
    }

    if (check.validate && !check.validate(value)) {
      errors.push(`❌ ${check.name}: ${check.message || 'Valeur invalide'}`)
    }
  }

  // Vérifications spéciales pour la production
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'dev' || process.env.JWT_SECRET === 'change_this') {
      errors.push('❌ JWT_SECRET: Ne peut pas utiliser la valeur par défaut en production')
    }

    if (process.env.ALLOW_ORIGIN === '*') {
      errors.push('❌ ALLOW_ORIGIN: Ne peut pas être "*" en production')
    }

    if (!process.env.DATABASE_URL) {
      errors.push('❌ DATABASE_URL: Requis en production')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// Exécuter la validation
const result = validateConfig()

if (result.valid) {
  console.log('✅ Configuration valide')
  process.exit(0)
} else {
  console.error('❌ Erreurs de configuration:')
  result.errors.forEach(err => console.error(`  ${err}`))
  console.error('\n💡 Consultez .env.example pour un exemple de configuration')
  process.exit(1)
}

