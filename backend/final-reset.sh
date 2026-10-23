#!/bin/bash
# Script final pour réinitialiser la base de données
# Supprime la table problématique et applique le nouveau schéma

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

# Extraire les informations de connexion
DB_URL="$DATABASE_URL"

echo ""
echo "🗑️  Suppression de la table role_permissions problématique..."
PGPASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_USER=$(echo "$DB_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_HOST=$(echo "$DB_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DB_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DB_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Supprimer la table role_permissions
PGPASSWORD="$PGPASSWORD" psql -h "$DB_HOST" -p "${DB_PORT:-5432}" -U "$DB_USER" -d "$DB_NAME" -c "DROP TABLE IF EXISTS role_permissions CASCADE;" 2>&1 | grep -v "ERROR\|NOTICE" || echo "Table supprimée ou erreur (peut être normale)"

# Supprimer les anciennes migrations
echo ""
echo "📦 Suppression des anciennes migrations..."
if [ -d "prisma/migrations" ]; then
  rm -rf prisma/migrations/*
  echo "✅ Anciennes migrations supprimées"
fi

# Créer une nouvelle migration
echo ""
echo "📝 Création de la nouvelle migration..."
MIGRATION_DIR="prisma/migrations/$(date +%Y%m%d%H%M%S)_init_clean_schema"
mkdir -p "$MIGRATION_DIR"

npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > "$MIGRATION_DIR/migration.sql"

if [ -s "$MIGRATION_DIR/migration.sql" ]; then
  echo "✅ Migration créée dans $MIGRATION_DIR"
  
  # Marquer comme baseline
  echo "📌 Marquage de la migration comme baseline..."
  npx prisma migrate resolve --applied "$(basename $MIGRATION_DIR)" 2>&1 | grep -v "Warning" || true
fi

# Appliquer le schéma avec db push
echo ""
echo "🔄 Application du nouveau schéma..."
npx prisma db push --accept-data-loss --skip-generate || {
  echo "⚠️  Erreur avec db push, mais la migration a été créée"
  echo "💡 Vous pouvez appliquer la migration manuellement avec: npx prisma migrate deploy"
}

# Générer le client Prisma
echo ""
echo "🔨 Génération du client Prisma..."
npx prisma generate

echo ""
echo "✅ Processus terminé!"
echo ""
echo "📊 Le nouveau schéma inclut:"
echo "   ✓ Modèle Grid (grilles de programmes)"
echo "   ✓ Modèle Program avec tous les champs requis:"
echo "     - title (nom)"
echo "     - category (catégorie)"
echo "     - type (LIVE, REPLAY, PAD, ADS, SPECIAL) ⭐ NOUVEAU"
echo "     - startTime / endTime (timing)"
echo "     - days (jours de diffusion)"
echo "     - description (descriptif)"
echo "   ✓ Modèles auxiliaires (Incidents, Deviations, AdLog, ShiftLog)"
echo "   ✓ Système de permissions (Permission, RolePermission)"
echo ""
echo "🚀 Si des erreurs persistent, exécutez manuellement:"
echo "   npx prisma migrate deploy"
echo "   ou"
echo "   npx prisma db push --force-reset"

