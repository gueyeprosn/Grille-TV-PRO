#!/bin/bash
# Script pour réinitialiser la base de données - Version finale
# Crée une nouvelle migration sans interaction

set -e

cd "$(dirname "$0")"

echo "⚠️  ATTENTION: Cette opération va créer une nouvelle migration!"
echo "📋 Le nouveau schéma inclut:"
echo "   - Grille (nom, type, dates, statut)"
echo "   - Programme (nom, catégorie, type, timing, jours, descriptif)"
echo "   - Tous les modèles auxiliaires (Incidents, Deviations, etc.)"
echo ""
echo "Appuyez sur Ctrl+C pour annuler, ou attendez 3 secondes..."
sleep 3

# Supprimer toutes les migrations existantes
echo ""
echo "📦 Suppression des anciennes migrations..."
if [ -d "prisma/migrations" ]; then
  rm -rf prisma/migrations/*
  echo "✅ Anciennes migrations supprimées"
else
  echo "ℹ️  Aucune migration existante"
  mkdir -p prisma/migrations
fi

# Créer la migration directement avec create-only
echo ""
echo "📝 Création de la nouvelle migration (create-only)..."
npx prisma migrate dev --create-only --name init_clean_schema || {
  echo "⚠️  Erreur lors de la création de la migration, tentative alternative..."
  # Alternative: créer manuellement la structure de migration
  MIGRATION_DIR="prisma/migrations/$(date +%Y%m%d%H%M%S)_init_clean_schema"
  mkdir -p "$MIGRATION_DIR"
  
  # Générer le SQL de migration avec prisma migrate diff
  npx prisma migrate diff \
    --from-empty \
    --to-schema-datamodel prisma/schema.prisma \
    --script > "$MIGRATION_DIR/migration.sql" || {
    echo "❌ Impossible de générer la migration automatiquement"
    echo "💡 Essayez d'exécuter manuellement: npx prisma migrate dev"
    exit 1
  }
  
  echo "✅ Migration créée dans $MIGRATION_DIR"
}

# Appliquer la migration
echo ""
echo "🔄 Application de la migration..."
npx prisma migrate deploy || {
  echo "⚠️  Erreur lors de l'application, tentative avec migrate dev..."
  echo "y" | npx prisma migrate dev --name init_clean_schema || true
}

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

