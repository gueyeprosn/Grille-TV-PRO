#!/bin/bash
# Script pour réinitialiser la base de données manuellement
# Utilise SQL direct pour supprimer les tables

set -e

cd "$(dirname "$0")"

echo "⚠️  ATTENTION: Cette opération va supprimer toutes les données!"
echo "📋 Le nouveau schéma inclut:"
echo "   - Grille (nom, type, dates, statut)"
echo "   - Programme (nom, catégorie, type, timing, jours, descriptif)"
echo "   - Tous les modèles auxiliaires (Incidents, Deviations, etc.)"
echo ""
echo "Appuyez sur Ctrl+C pour annuler, ou attendez 5 secondes..."
sleep 5

# Charger les variables d'environnement
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erreur: DATABASE_URL n'est pas défini dans .env"
  exit 1
fi

echo ""
echo "📦 Suppression des anciennes migrations..."
if [ -d "prisma/migrations" ]; then
  rm -rf prisma/migrations/*
  echo "✅ Anciennes migrations supprimées"
else
  echo "ℹ️  Aucune migration existante"
fi

echo ""
echo "🗑️  Suppression des tables existantes via SQL..."

# Extraire les informations de connexion depuis DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_URL=$DATABASE_URL

# Créer un script SQL temporaire pour supprimer toutes les tables
cat > /tmp/drop_all_tables.sql << 'EOF'
-- Désactiver les contraintes de clés étrangères temporairement
SET session_replication_role = 'replica';

-- Supprimer les tables dans l'ordre inverse des dépendances
DROP TABLE IF EXISTS "role_permissions" CASCADE;
DROP TABLE IF EXISTS "permissions" CASCADE;
DROP TABLE IF EXISTS "shiftlogs" CASCADE;
DROP TABLE IF EXISTS "adlogs" CASCADE;
DROP TABLE IF EXISTS "deviations" CASCADE;
DROP TABLE IF EXISTS "incidents" CASCADE;
DROP TABLE IF EXISTS "programs" CASCADE;
DROP TABLE IF EXISTS "grids" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;
DROP TABLE IF EXISTS "_prisma_migrations" CASCADE;

-- Supprimer les types enum
DROP TYPE IF EXISTS "OpStatus" CASCADE;
DROP TYPE IF EXISTS "ProgramType" CASCADE;
DROP TYPE IF EXISTS "GridStatus" CASCADE;
DROP TYPE IF EXISTS "GridType" CASCADE;
DROP TYPE IF EXISTS "Role" CASCADE;

-- Réactiver les contraintes
SET session_replication_role = 'origin';
EOF

# Exécuter le script SQL
echo "Exécution du script SQL de suppression..."
psql "$DB_URL" -f /tmp/drop_all_tables.sql || {
  echo "⚠️  Erreur lors de la suppression via psql, tentative avec Prisma..."
  # Si psql n'est pas disponible, on essaie avec Prisma migrate reset sans force
  npx prisma migrate reset --force --skip-seed || true
}

# Nettoyer le fichier temporaire
rm -f /tmp/drop_all_tables.sql

# Créer une nouvelle migration initiale
echo ""
echo "📝 Création de la nouvelle migration..."
npx prisma migrate dev --name init_clean_schema --skip-seed

# Générer le client Prisma
echo ""
echo "🔨 Génération du client Prisma..."
npx prisma generate

echo ""
echo "✅ Base de données réinitialisée avec succès!"
echo ""
echo "📊 Structure créée:"
echo "   ✓ Modèle Grid (grilles de programmes)"
echo "   ✓ Modèle Program avec tous les champs requis:"
echo "     - title (nom)"
echo "     - category (catégorie)"
echo "     - type (LIVE, REPLAY, PAD, ADS, SPECIAL)"
echo "     - startTime / endTime (timing)"
echo "     - days (jours de diffusion)"
echo "     - description (descriptif)"
echo "   ✓ Modèles auxiliaires (Incidents, Deviations, AdLog, ShiftLog)"
echo "   ✓ Système de permissions (Permission, RolePermission)"
echo ""
echo "🚀 Vous pouvez maintenant utiliser la base de données avec le nouveau schéma!"

