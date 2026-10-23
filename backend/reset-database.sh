#!/bin/bash
# Script pour réinitialiser complètement la base de données
# ATTENTION: Cette opération supprime toutes les données existantes!

set -e  # Arrêter en cas d'erreur

cd "$(dirname "$0")"

echo "⚠️  ATTENTION: Cette opération va supprimer toutes les données!"
echo "📋 Le nouveau schéma inclut:"
echo "   - Grille (nom, type, dates, statut)"
echo "   - Programme (nom, catégorie, type, timing, jours, descriptif)"
echo "   - Tous les modèles auxiliaires (Incidents, Deviations, etc.)"
echo ""
echo "Appuyez sur Ctrl+C pour annuler, ou attendez 5 secondes..."
sleep 5

# Supprimer toutes les migrations existantes
echo ""
echo "📦 Suppression des anciennes migrations..."
if [ -d "prisma/migrations" ]; then
  rm -rf prisma/migrations/*
  echo "✅ Anciennes migrations supprimées"
else
  echo "ℹ️  Aucune migration existante"
fi

# Réinitialiser Prisma (supprime toutes les données et recrée la base)
echo ""
echo "🔄 Réinitialisation de Prisma (suppression de toutes les données)..."
npx prisma migrate reset --force --skip-seed

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

