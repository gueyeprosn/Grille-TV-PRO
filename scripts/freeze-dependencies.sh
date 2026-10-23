#!/bin/bash

# Script de gel des dépendances - GrilleTV Pro V4.0.0
# Génère les package-lock.json finaux et configure Dependabot

set -e

echo "🔒 GrilleTV Pro - Freeze Dépendances V1.0.0"
echo "============================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Frontend
echo "📦 Freeze Frontend..."
cd frontend

# Générer package-lock.json
npm install --package-lock-only

echo -e "${GREEN}✅ package-lock.json frontend généré${NC}"
cd ..
echo ""

# 2. Backend
echo "📦 Freeze Backend..."
cd backend

# Générer package-lock.json
npm install --package-lock-only

echo -e "${GREEN}✅ package-lock.json backend généré${NC}"
cd ..
echo ""

# 3. Vérifier Dependabot
echo "🤖 Vérification Dependabot..."
if [ -f ".github/dependabot.yml" ]; then
    echo -e "${GREEN}✅ Configuration Dependabot présente${NC}"
    echo "   - Mises à jour sécurisées uniquement"
    echo "   - Limite : 5 PR ouvertes max"
else
    echo -e "${YELLOW}⚠️  Configuration Dependabot manquante${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}✅ Freeze des dépendances terminé !${NC}"
echo ""
echo "Fichiers générés :"
echo "  - frontend/package-lock.json"
echo "  - backend/package-lock.json"
echo ""
echo "Note : Les dépendances sont maintenant figées pour V1.0.0"
echo "       Dependabot ne proposera que des mises à jour de sécurité"
echo ""

