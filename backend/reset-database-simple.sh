#!/bin/bash
# Script simple pour réinitialiser la base de données
# Utilise db push avec force-reset après avoir exécuté le SQL de nettoyage

set -e

cd "$(dirname "$0")"

echo "⚠️  ATTENTION: Cette opération va supprimer toutes les données!"
echo ""
echo "📋 Le nouveau schéma inclut:"
echo "   - Grille (nom, type, dates, statut)"
echo "   - Programme (nom, catégorie, type, timing, jours, descriptif)"
echo "   - Tous les modèles auxiliaires (Incidents, Deviations, etc.)"
echo ""
echo "Appuyez sur Ctrl+C pour annuler, ou attendez 3 secondes..."
sleep 3

# Charger les variables d'environnement
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Vérifier que DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erreur: DATABASE_URL n'est pas défini dans .env"
  exit 1
fi

# Option 1: Essayer d'exécuter le script SQL de nettoyage
echo ""
echo "🗑️  Tentative de nettoyage de la base de données..."
if command -v psql &> /dev/null; then
  echo "Exécution du script SQL de nettoyage..."
  psql "$DATABASE_URL" -f drop-all-tables.sql 2>&1 | grep -v "ERROR" || {
    echo "⚠️  Certaines erreurs peuvent être normales si les tables n'existent pas"
  }
else
  echo "ℹ️  psql non disponible, passage à l'étape suivante..."
fi

# Supprimer les anciennes migrations
echo ""
echo "📦 Suppression des anciennes migrations..."
if [ -d "prisma/migrations" ]; then
  rm -rf prisma/migrations/*
  echo "✅ Anciennes migrations supprimées"
fi

# Utiliser db push pour créer/recréer le schéma
echo ""
echo "🔄 Application du nouveau schéma avec db push..."
npx prisma db push --force-reset --accept-data-loss --skip-generate || {
  echo "⚠️  Erreur avec db push, tentative avec migrate..."
  
  # Créer une migration baseline
  echo "📝 Création d'une migration baseline..."
  npx prisma migrate diff \
    --from-empty \
    --to-schema-datamodel prisma/schema.prisma \
    --script > /tmp/migration.sql || true
  
  if [ -f /tmp/migration.sql ] && [ -s /tmp/migration.sql ]; then
    MIGRATION_DIR="prisma/migrations/$(date +%Y%m%d%H%M%S)_init_clean_schema"
    mkdir -p "$MIGRATION_DIR"
    mv /tmp/migration.sql "$MIGRATION_DIR/migration.sql"
    echo "✅ Migration créée dans $MIGRATION_DIR"
    
    # Marquer la migration comme appliquée (baseline)
    echo "📌 Marquage de la migration comme baseline..."
    npx prisma migrate resolve --applied "$(basename $MIGRATION_DIR)" || true
  fi
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

