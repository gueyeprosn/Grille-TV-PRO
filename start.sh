#!/bin/bash

# Démarrage local GrilleTV Pro V4
# Usage: ./start.sh (ou ./start-v3.sh pour compatibilité)

echo "🚀 Démarrage GrilleTV Pro V4.0.0"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js détecté: $(node --version)${NC}"

# Vérifier les dépendances
echo ""
echo "📦 Vérification des dépendances..."

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installation des dépendances backend...${NC}"
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installation des dépendances frontend...${NC}"
    cd frontend && npm install && cd ..
fi

echo -e "${GREEN}✅ Dépendances OK${NC}"

# Vérifier les ports
echo ""
echo "🔌 Vérification des ports..."

BACKEND_PORT=4000
FRONTEND_PORT=5173

if lsof -ti:$BACKEND_PORT &> /dev/null; then
    echo -e "${YELLOW}⚠️  Port $BACKEND_PORT déjà utilisé (backend peut-être déjà démarré)${NC}"
else
    echo -e "${GREEN}✅ Port $BACKEND_PORT disponible${NC}"
fi

if lsof -ti:$FRONTEND_PORT &> /dev/null; then
    echo -e "${YELLOW}⚠️  Port $FRONTEND_PORT déjà utilisé (frontend peut-être déjà démarré)${NC}"
else
    echo -e "${GREEN}✅ Port $FRONTEND_PORT disponible${NC}"
fi

# Démarrer les services
echo ""
echo "🎯 Démarrage des services..."
echo ""

# Fonction pour nettoyer au Ctrl+C
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Arrêt des services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrer backend
echo -e "${GREEN}📡 Démarrage Backend (port $BACKEND_PORT)...${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 2

# Vérifier que le backend a démarré
if curl -fsS http://localhost:$BACKEND_PORT/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend démarré, PostgreSQL est disponible${NC}"
else
    echo -e "${RED}❌ Erreur au démarrage du backend${NC}"
    echo "   Voir backend.log pour plus de détails"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# Démarrer frontend
echo -e "${GREEN}🎨 Démarrage Frontend (port $FRONTEND_PORT)...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 3

# Vérifier que le frontend a démarré
if curl -s http://localhost:$FRONTEND_PORT > /dev/null; then
    echo -e "${GREEN}✅ Frontend démarré avec succès${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend en cours de démarrage...${NC}"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ GrilleTV Pro V4.0.0 est maintenant actif !${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo "📡 Backend:  http://localhost:$BACKEND_PORT"
echo "🎨 Frontend: http://localhost:$FRONTEND_PORT"
echo ""
echo "📝 Logs:"
echo "   - Backend:  tail -f backend.log"
echo "   - Frontend: tail -f frontend.log"
echo ""
echo "🛑 Pour arrêter: Appuyez sur Ctrl+C"
echo ""

# Attendre
wait

