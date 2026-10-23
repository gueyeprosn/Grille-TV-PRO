#!/bin/bash

# Script de Build Production - GrilleTV Pro V4.0.0
# Build frontend, vérifie bundle, migrations Prisma, génère EPG test

set -e  # Arrêter en cas d'erreur

echo "🏗️  GrilleTV Pro V4.0.0 - Build Production"
echo "=========================================="
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Build Frontend
echo "📦 Build Frontend..."
cd frontend

# Nettoyer le dossier dist
rm -rf dist

# Build
npm run build

# Vérifier que le build a réussi
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Erreur : Le build frontend a échoué${NC}"
    exit 1
fi

# Vérifier la taille du bundle
BUNDLE_FILE=$(find dist/assets -name "index-*.js" | head -1)
if [ -z "$BUNDLE_FILE" ]; then
    echo -e "${RED}❌ Erreur : Bundle JavaScript non trouvé${NC}"
    exit 1
fi

BUNDLE_SIZE=$(du -h "$BUNDLE_FILE" | awk '{print $1}')
BUNDLE_GZIP=$(gzip -c "$BUNDLE_FILE" | wc -c)
BUNDLE_GZIP_KB=$((BUNDLE_GZIP / 1024))

echo -e "${GREEN}✅ Build frontend réussi${NC}"
echo "   Bundle : $BUNDLE_SIZE"
echo "   Bundle gzip : ${BUNDLE_GZIP_KB} KB"

# Vérifier que le bundle gzip < 400 KB
if [ $BUNDLE_GZIP_KB -gt 400 ]; then
    echo -e "${YELLOW}⚠️  Attention : Bundle gzip > 400 KB (${BUNDLE_GZIP_KB} KB)${NC}"
    echo "   Objectif : < 400 KB gzip"
else
    echo -e "${GREEN}✅ Bundle gzip OK (${BUNDLE_GZIP_KB} KB < 400 KB)${NC}"
fi

cd ..
echo ""

# 2. Build Backend
echo "📦 Build Backend..."
cd backend

# Build TypeScript
npm run build

# Vérifier que le build a bien produit la sortie attendue dans dist/
if [ ! -f "dist/server.js" ]; then
    echo -e "${RED}❌ Erreur : dist/server.js introuvable après le build${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build backend réussi${NC}"
cd ..
echo ""

# 3. Migrations Prisma
echo "🗄️  Vérification migrations Prisma..."
cd backend

# Vérifier que Prisma est configuré
if [ ! -f "prisma/schema.prisma" ]; then
    echo -e "${RED}❌ Erreur : Schema Prisma non trouvé${NC}"
    exit 1
fi

# Générer le client Prisma
npx prisma generate

echo -e "${GREEN}✅ Client Prisma généré${NC}"
echo -e "${YELLOW}⚠️  Note : Exécuter 'npx prisma migrate deploy' en production${NC}"

cd ..
echo ""

# 4. Génération EPG Test
echo "📺 Génération EPG test..."
cd backend

# Créer le dossier epg-output s'il n'existe pas
mkdir -p epg-output

# Note: La génération EPG nécessite une grille existante
# Cette étape doit être faite manuellement avec une grille de test
echo -e "${YELLOW}⚠️  Génération EPG test à faire manuellement :${NC}"
echo "   1. Créer une grille de test"
echo "   2. Ajouter des programmes"
echo "   3. Appeler l'API : GET /api/v3/grids/{gridId}/epg"
echo "   4. Vérifier le fichier dans backend/epg-output/"

cd ..
echo ""

# 5. Résumé
echo "=========================================="
echo -e "${GREEN}✅ Build Production réussi !${NC}"
echo ""
echo "Résumé :"
echo "  - Frontend : Bundle ${BUNDLE_GZIP_KB} KB (gzip)"
echo "  - Backend : Compilé avec succès"
echo "  - Prisma : Client généré"
echo ""
echo "Prochaines étapes :"
echo "  1. Vérifier les fichiers dans frontend/dist/"
echo "  2. Exécuter 'npx prisma migrate deploy' en production"
echo "  3. Générer un EPG test avec une grille existante"
echo ""

