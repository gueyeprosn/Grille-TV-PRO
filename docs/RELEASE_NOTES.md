# Notes de version

Ces notes décrivent les changements effectivement réalisés dans le dépôt. Elles ne valent pas rapport de tests ni certification de mise en production.

## Cohérence de version produit et démarrage — 19 octobre 2026

- Version produit harmonisée à **4.0.0** entre les métadonnées des paquets et le pied de page de l’interface.
- `npm run dev` lance désormais `start.sh`; `start-v3.sh` reste un alias compatible.
- Le script de démarrage vérifie la disponibilité PostgreSQL par l’endpoint de santé et ne dépend plus des anciens fichiers JSON de grilles.
- Documentation et logs distinguent la version produit V4 du contrat API `/api/v3`; les routes métier historiques `/api` sont désactivées (HTTP 410), et l’endpoint santé reste actif.

## Audit d’expérience et détails programme — 19 octobre 2026

- Ajout d’une référence UX synthétisant les demandes accessibles, les parcours, les décisions à préserver et les points restant à arbitrer dans `docs/UX_AUDIT_V4.md`.
- Les vues mobiles ouvrent la fiche du programme au toucher; l’utilisateur choisit ensuite explicitement de modifier.
- La vue semaine réutilise la fiche de détails partagée, ouverte au double-clic ou au clavier.
- Coordination distingue maintenant un échec de chargement d’une liste vide et propose une nouvelle tentative.
- Le README décrit les routes actives et l’ancienne API désactivée.
- Cause serveur de l’échec Coordination et sémantique de période/récurrence des rapports restent à vérifier; aucun changement ni diagnostic n’a été appliqué à la base.

## Mise à jour UX/UI et exports — 19 octobre 2026

### Vue Grilles

- Suppression du défilement imbriqué et de la hauteur fixe qui coupaient les cartes.
- Grille responsive dédiée, distincte de la classe visuelle de la grille de diffusion.
- Compteurs ajoutés aux filtres de statut et actions secondaires regroupées dans un menu clavier.
- Informations de dates et versions simplifiées sur les cartes.

### Vue Semaine (Grille hebdomadaire)

- En-tête des jours et colonne horaire figés au défilement vertical et horizontal (z-index hiérarchisés 35/40/50 prévenant tout chevauchement des cartes de programmes).
- Suppression du défilement imbriqué : conteneur vertical flex-1 dynamique éliminant les doubles barres de défilement et maintenant en permanence la barre d'outils et les en-têtes visibles.
- Correction du contraste en mode sombre : suppression de l'arrière-plan blanc forcé dans la colonne horaire, rétablissant un fond opaque sombre/clair parfaitement lisible.
- Cadrage automatique 7 jours : bouton d'ajustement dynamique calculant le ratio idéal selon l'écran (~1125 px) et indicateur d'état fiable sans promesse trompeuse.

### PDF hebdomadaire

- Présentation A4 paysage avec bandeau Broadcast SN+, mode d’export, compteurs et tableau lisible.
- En-tête et pagination répétés sur les pages; état vide explicite et filigrane Régie atténué.
- Chargement du constructeur jsPDF rendu compatible avec les formats de module courants.
- Message de succès affiché après la génération, avec une erreur visible si l’export échoue.

### Documentation et consignes

- Consignes documentaires renforcées : commandes et métriques doivent être vérifiées; résultats anciens doivent rester marqués comme historiques.
- Ajout de règles persistantes pour Codex et Cursor.
- Guides d’installation, produit et Régie alignés sur les parcours et exports présents dans le code.

### Vérifications réalisées pour cette mise à jour

- Rendu PDF inspecté avec des données synthétiques pour un export standard, un export Régie multipage et une grille vide.
- `node --check frontend/src/legacy/lib/pdf.js` exécuté avec succès.
- Les tests frontend, les builds frontend/backend et un déploiement n’ont pas été exécutés dans le cadre de cette mise à jour.
