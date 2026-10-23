# Déployer GrilleTV Pro V4

Ce guide décrit les étapes à adapter à l’infrastructure de l’installation. Il ne certifie pas qu’un build ou qu’un déploiement a été exécuté. Les résultats doivent être relevés pour chaque livraison.

## Architecture et prérequis

- Frontend React/Vite servi sous `/grille/`.
- Backend Express/TypeScript sur le port `4000` par défaut.
- PostgreSQL pour les données métier.
- Node.js et npm compatibles avec les fichiers `package.json` et lockfiles du dépôt.
- Un serveur HTTP ou proxy configuré pour servir le frontend sous `/grille/` et relayer `/api` vers le backend local.

L’installation locale et les variables de base sont décrites dans le [README racine](../README.md). Les valeurs d’environnement doivent être fournies par l’administrateur de l’installation; aucun secret ne doit être copié dans ce guide.

## Avant une livraison

1. Examiner les changements de code et les notes de version.
2. Vérifier la configuration de production (`NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `ALLOW_ORIGIN`) depuis le gestionnaire de secrets de l’installation.
3. Vérifier que `JWT_SECRET` est fort, que `ALLOW_ORIGIN` n’est pas `*` en production et que PostgreSQL est accessible.
4. Prévoir une sauvegarde de base et un plan de retour arrière selon les procédures de l’exploitant.
5. Examiner les migrations Prisma avant leur application. Ne jamais lancer `prisma migrate reset` sur une base contenant des données utiles.

## Installer et construire

Depuis la racine du dépôt, installer les dépendances avec les lockfiles :

```bash
cd backend && npm ci
cd ../frontend && npm ci
```

Générer le client Prisma et construire les deux applications :

```bash
cd backend
npx prisma generate
npm run build
cd ../frontend
npm run build
```

Le frontend est produit dans `frontend/dist/`. La compilation du backend suit le `tsconfig` et le script `build` de `backend/package.json`.

## Base de données

Après revue et sauvegarde selon la procédure de l’installation, appliquer uniquement les migrations versionnées :

```bash
cd backend
npm run prisma:migrate:deploy
```

Ne pas utiliser `npm run prisma:migrate:reset` en production. Ne pas remplacer ni réinitialiser une base pour résoudre une erreur de déploiement.

## Mise en service

- Déployer les fichiers compilés à l’emplacement prévu par l’infrastructure.
- Compiler le backend avec `npm run build` depuis `backend/` : le serveur est servi depuis `backend/dist/`, et `npm start` comme PM2 refusent de démarrer si cette sortie est absente.
- Configurer le proxy pour `/grille/` et `/api`, puis démarrer le backend avec `npm start` depuis `backend/`, avec `pm2 start ecosystem.config.cjs`, ou avec le gestionnaire de processus retenu. La configuration PM2 est en `.cjs` : PM2 ne sait pas lire une configuration ESM dans ce paquet `"type": "module"`.
- Limiter l’accès à HTTPS selon l’infrastructure et conserver les secrets hors du dépôt.
- Vérifier l’API sur `/api/health`, l’écran de connexion, le chargement d’une grille autorisée et la vue semaine.
- Faire un export PDF de contrôle sur une grille de démonstration ou une copie approuvée, puis contrôler le fichier sans modifier les données de production.

## Retour arrière et incidents

En cas d’échec, suivre le plan de retour arrière de l’exploitant pour les binaires et les données. Ne pas annuler une migration par une commande destructive improvisée. Consigner la version déployée, les commandes réellement exécutées et leurs résultats dans le journal d’exploitation.

## Vérifications à rapporter

Pour chaque livraison, consigner les versions de Node.js/npm, les builds réellement exécutés, le résultat de la migration, les vérifications HTTP et le contrôle manuel. Les commandes de test disponibles et les limites de couverture figurent dans [AGENTS.md](../AGENTS.md) et le [README racine](../README.md). Ne jamais reprendre comme actuels les nombres ou résultats d’une ancienne livraison.
