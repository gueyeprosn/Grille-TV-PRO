#!/bin/bash
# Compatibilité : conserver l’ancienne commande tout en démarrant GrilleTV Pro V4.
exec "$(dirname "$0")/start.sh" "$@"
