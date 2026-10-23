#!/bin/bash
# Démarrage de l'API compilée.
set -e

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export NODE_ENV="${NODE_ENV:-production}"

if [ ! -f dist/server.js ]; then
    echo "dist/server.js est absent. Lancez d'abord : npm run build" >&2
    exit 1
fi

exec node dist/server.js
