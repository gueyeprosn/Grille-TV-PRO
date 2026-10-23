#!/bin/bash
# Démarrage de l'API sous PM2, à partir de la build compilée.
set -e

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f dist/server.js ]; then
    echo "dist/server.js est absent. Lancez d'abord : npm run build" >&2
    exit 1
fi

exec pm2 start ecosystem.config.cjs
