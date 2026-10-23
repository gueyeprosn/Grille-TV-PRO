#!/bin/bash

# Script de Création Tag Git V1.0.0 - GrilleTV Pro
# Crée le tag avec le message exact demandé

set -e

echo "🏷️  GrilleTV Pro - Création Tag Git V1.0.0"
echo "==========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Vérifier qu'on est sur la branche main
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${RED}❌ Erreur : Vous devez être sur la branche 'main'${NC}"
    echo "   Branche actuelle : $CURRENT_BRANCH"
    exit 1
fi

# Vérifier que le tag n'existe pas déjà
if git rev-parse v1.0.0 >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Le tag v1.0.0 existe déjà${NC}"
    read -p "Supprimer et recréer ? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git tag -d v1.0.0
        git push origin :refs/tags/v1.0.0 2>/dev/null || true
    else
        exit 1
    fi
fi

# Message exact demandé
TAG_MESSAGE="Release V1 Produit - Améliorations mobiles, EPG, alertes, Diaspora implémentées et vérifiées 100%"

# Créer le tag
echo "Création du tag v1.0.0..."
git tag -a v1.0.0 -m "$TAG_MESSAGE"

echo -e "${GREEN}✅ Tag v1.0.0 créé avec succès${NC}"
echo ""
echo "Message du tag :"
echo "  $TAG_MESSAGE"
echo ""
echo "Prochaines étapes :"
echo "  1. Vérifier le tag : git show v1.0.0"
echo "  2. Pousser le tag : git push origin v1.0.0"
echo "  3. La Release GitHub sera créée automatiquement via GitHub Actions"
echo ""

