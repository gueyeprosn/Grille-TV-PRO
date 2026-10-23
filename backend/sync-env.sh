#!/bin/bash
# Obsolète — conservé pour signaler que la synchronisation a été supprimée.
#
# Ce script recopiait les identifiants SMTP, le jeton Telegram et d'autres
# réglages depuis frontend/.env vers backend/.env. C'est ce mécanisme qui
# dupliquait des secrets dans le dossier frontend, où ils n'ont aucun usage :
# le code de l'interface ne lit que BASE_URL.
#
# backend/.env est désormais la seule source. Modifiez-le directement.

cat >&2 <<'MSG'
Ce script est obsolète et ne fait plus rien.

Les secrets ne vivent plus que dans backend/.env, qui est la seule source.
Pour changer un identifiant SMTP, un jeton Telegram ou une clé d'API,
modifiez backend/.env puis redémarrez le backend.
MSG
exit 1
