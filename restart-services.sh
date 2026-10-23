#!/bin/bash
# Script de redémarrage des services GrilleTV Pro V4

echo "🔄 Redémarrage des services GrilleTV Pro V4..."
echo ""

# Arrêter les processus existants
echo "🛑 Arrêt des processus existants..."
pm2 stop all 2>/dev/null || true
pkill -f "node dist/server.js" 2>/dev/null || true
# Anciens démarrages tsx éventuellement encore actifs.
pkill -f "tsx watch" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Rebuild frontend
echo ""
echo "📦 Build du frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build frontend"
    exit 1
fi
cd ..

# Démarrer le backend avec PM2
echo ""
echo "🚀 Démarrage du backend..."
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors du build backend"
    exit 1
fi
if [ ! -f dist/server.js ]; then
    echo "❌ dist/server.js absent après le build"
    exit 1
fi
pm2 start ecosystem.config.cjs
cd ..

# Vérifier le statut
echo ""
echo "⏳ Attente du démarrage..."
sleep 5

# Vérifier la santé
echo ""
echo "🔍 Vérification de la santé du backend..."
if curl -s http://localhost:4000/api/health > /dev/null; then
    echo "✅ Backend démarré avec succès"
else
    echo "⚠️  Backend ne répond pas encore"
fi

echo ""
echo "📊 Statut PM2:"
pm2 list

echo ""
echo "✅ Redémarrage terminé!"
echo ""
echo "📍 URLs:"
echo "   - Backend API: http://localhost:4000"
echo "   - Frontend: http://localhost:5173 (dev) ou servez dist/ (production)"
echo ""
echo "💡 Commandes utiles:"
echo "   - Voir les logs: pm2 logs grilletv-backend"
echo "   - Arrêter: pm2 stop grilletv-backend"
echo "   - Redémarrer: pm2 restart grilletv-backend"
