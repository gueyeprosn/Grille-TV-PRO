#!/bin/bash
# Obsolète — voir sync-env.sh.
#
# Ce script recopiait les variables SMTP et e-mail depuis frontend/.env vers
# backend/.env. frontend/.env ne contient plus aucun secret.

cat >&2 <<'MSG'
Ce script est obsolète et ne fait plus rien.

Les réglages SMTP se modifient directement dans backend/.env.
MSG
exit 1
