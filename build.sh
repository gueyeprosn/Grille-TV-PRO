#!/bin/bash

# Script de build complet pour GrilleTV Pro V4
# Ce script installe les dépendances, build le frontend et vérifie le backend

set -e  # Arrêter en cas d'erreur

echo "🚀 Build complet de GrilleTV Pro V4"
echo "===================================="
echo ""

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    error "Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# 1. Installation des dépendances frontend
echo ""
info "📦 Installation des dépendances frontend..."
cd frontend
if npm install; then
    success "Dépendances frontend installées"
else
    error "Échec de l'installation des dépendances frontend"
    exit 1
fi
cd ..

# 2. Installation des dépendances backend
echo ""
info "📦 Installation des dépendances backend..."
cd backend
if npm install; then
    success "Dépendances backend installées"
else
    error "Échec de l'installation des dépendances backend"
    exit 1
fi
cd ..

# 3. Vérification TypeScript
echo ""
info "🔍 Vérification TypeScript..."
cd frontend
if npx tsc --noEmit; then
    success "Aucune erreur TypeScript"
else
    warning "Des erreurs TypeScript ont été détectées (non bloquantes)"
fi
cd ..

# 4. Build du frontend
echo ""
info "🔨 Build du frontend en cours..."
cd frontend
if npm run build; then
    success "Build frontend réussi"
    echo ""
    info "📊 Taille des fichiers générés:"
    du -sh dist/ 2>/dev/null || echo "  Dossier dist créé"
else
    error "Échec du build frontend"
    exit 1
fi
cd ..

# 5. Vérification du backend
echo ""
info "🔍 Vérification du backend..."
if [ -f "backend/src/server.ts" ]; then
    success "Source du serveur backend trouvée"
else
    error "Source backend/src/server.ts introuvable"
    exit 1
fi

# 6. Rappel sur les données
echo ""
info "Les données métier de GrilleTV Pro V4 sont stockées dans PostgreSQL."
info "Les fichiers JSON historiques ne sont pas requis pour démarrer l’application."

# 7. Résumé
echo ""
echo "===================================="
success "🎉 Build complet terminé avec succès!"
echo ""
info "📁 Structure du projet:"
echo "  Frontend: frontend/"
echo "  Backend:  backend/"
echo "  Build:    frontend/dist/"
echo ""
info "🚀 Pour démarrer le projet:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
info "📝 Ou utilisez le script: ./start.sh"
echo ""

