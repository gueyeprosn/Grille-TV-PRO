#!/bin/bash
# Démarrage de l'API compilée (systemd, nohup ou lancement manuel).
# Le serveur charge lui-même backend/.env via dotenv : inutile d'exporter les
# variables ici, ce que l'ancien `export $(cat .env | xargs)` faisait de façon
# fragile dès qu'une valeur contenait une espace.
set -e

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export NODE_ENV="${NODE_ENV:-production}"

if [ ! -f dist/server.js ]; then
    echo "dist/server.js est absent. Lancez d'abord : npm run build" >&2
    exit 1
fi

exec node dist/server.js
