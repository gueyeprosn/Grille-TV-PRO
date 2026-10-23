# GrilleTV Pro V4

Application de planification et de suivi des programmes TV de Broadcast SN+. Elle fournit une interface web pour gérer les grilles, préparer les diffusions et suivre l’activité de la régie.

Le projet est conçu pour être utilisé d’abord en local. L’authentification est gérée par le backend et les comptes locaux; les données métier sont stockées dans PostgreSQL. Aucune connexion Firebase, Google ou synchronisation cloud n’est nécessaire.

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation locale](#installation-locale)
- [Démarrage](#démarrage)
- [Modèles de grille](#modèles-de-grille)
- [Rôles et accès](#rôles-et-accès)
- [Commandes utiles](#commandes-utiles)
- [API](#api)
- [Dépannage](#dépannage)

## Fonctionnalités

- Création et gestion de plusieurs grilles de programmation.
- Vues semaine et jour, sélecteur de grille et formulaires de programmes.
- Pour la grille **2026–2027 BON**, les vues jour/semaine, les indicateurs de couverture et la régie mobile utilisent le périmètre 05:00–00:00. Les programmes après minuit restent enregistrés mais sont masqués dans ces vues; les autres grilles gardent leur périmètre existant.
- Catégories, types de diffusion, statuts opérationnels et détection de conflits.
- Suivi des diffusions par date, distinct des fiches récurrentes ; les historiques antérieurs sans données fiables restent « Non renseigné ».
- Modes d’affichage Standard, Régie et Direction.
- Interfaces adaptées aux ordinateurs, tablettes et téléphones; installation PWA.
- Suivi ON AIR, programme suivant, rapports, exports PDF/CSV/JSON et EPG pour vMix.
- Le rapport décrit les fiches de programme et leurs statuts. Il ne compte pas les occurrences de diffusion récurrentes comme des diffusions réellement enregistrées.
- Export PDF hebdomadaire A4 paysage : compteurs de programmes, diffusions et jours couverts, tableau des horaires et pagination répétée. Le mode Régie ajoute un filigrane « NE PAS DIFFUSER ».
- Coordination des équipes : incidents, écarts, publicités et journaux de service.
- Alertes Telegram et e-mail facultatives, configurables côté backend.
- Règles de notification Telegram par événement, enregistrées en base : chat de destination, activation et délai anti-spam en secondes.
- Authentification locale par e-mail et mot de passe, JWT et permissions par rôle.

## Architecture

| Dossier | Rôle |
| --- | --- |
| `frontend/` | React, TypeScript, Vite, Tailwind CSS et Vitest. |
| `backend/` | API Express, TypeScript, Prisma, PostgreSQL et Jest. |
| `backend/prisma/` | Schéma de données et migrations Prisma. |
| `backend/src/ramadan/` | Générateurs et application des modèles de grille. |
| `docs/` | Guides produit, régie, déploiement et notes de version. |

Le frontend utilise le chemin `/grille/` et le backend écoute par défaut sur le port `4000`. En développement, Vite tourne sur `5173` et relaie les appels API au backend local.

La version de l’application est **GrilleTV Pro 4.0.0**. Le préfixe `/api/v3` désigne le contrat HTTP utilisé par l’interface, indépendamment de la version produit. Les anciennes routes métier `/api` ne sont plus disponibles et répondent `410 Gone`; `/api/health` reste actif.

PostgreSQL est la source de données métier. Le navigateur utilise `localStorage` pour les préférences et certaines données locales de l’interface; ce stockage ne remplace pas la base de données.

## Prérequis

- Node.js 18 ou plus récent et npm 9 ou plus récent.
- PostgreSQL démarré en local.
- Les dépendances du frontend et du backend installées.

## Installation locale

Les commandes suivantes partent de la racine du projet.

### 1. Installer les dépendances

```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

### 2. Créer la base PostgreSQL

Créez une base nommée `grilletv` avec votre installation PostgreSQL. Par exemple, si votre rôle PostgreSQL local le permet :

```bash
createdb grilletv
```

Si cette commande ne fonctionne pas, créez la base et un utilisateur PostgreSQL depuis votre outil habituel d’administration, puis adaptez l’URL `DATABASE_URL` ci-dessous.

### 3. Configurer le backend

Créez `backend/.env` :

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="postgresql://UTILISATEUR:MOT_DE_PASSE@localhost:5432/grilletv?schema=public"
JWT_SECRET="REMPLACER_PAR_UN_SECRET_LOCAL_LONG_ET_ALEATOIRE"
ALLOW_ORIGIN="http://localhost:5173"
```

Remplacez les valeurs de connexion PostgreSQL par celles de votre machine. Générer un secret aléatoire, par exemple :

```bash
openssl rand -hex 32
```

Ne versionnez pas `backend/.env` et ne partagez pas ses secrets.

### 4. Préparer Prisma et les permissions

```bash
cd backend
npx prisma generate
npm run prisma:migrate
npm run prisma:init
```

Pour appliquer les migrations versionnées sans créer de migration interactive :

```bash
npx prisma migrate deploy
```

Ces migrations ajoutent les occurrences datées, le rôle `REGIE` et la table des règles de notification Telegram; elles sont additives et ne réinitialisent pas la base.

### 5. Créer un compte local

Depuis `backend/`, créez un compte administrateur. Remplacez `VOTRE_MOT_DE_PASSE_FORT` par un mot de passe choisi pour cette installation :

```bash
npx tsx src/scripts/create-local-user.ts admin@localhost 'VOTRE_MOT_DE_PASSE_FORT' ADMIN "Administrateur"
```

Ce script crée le compte ou met à jour son mot de passe et son rôle si l’adresse existe déjà. Aucun compte ni mot de passe par défaut n’est fourni.

## Démarrage

Pour démarrer les deux services avec le script fourni, lancez depuis la racine :

```bash
npm run dev
```

Le script historique `start-v3.sh` reste disponible comme alias de compatibilité vers `start.sh`. Il ne requiert plus de fichiers de grilles JSON : les données métier sont dans PostgreSQL.

Vous pouvez aussi ouvrir deux terminaux à la racine du projet et démarrer les services séparément.

Terminal 1, backend :

```bash
cd backend
npm run dev
```

Terminal 2, frontend :

```bash
cd frontend
npm run dev
```

Ouvrez [http://localhost:5173/grille/](http://localhost:5173/grille/) et connectez-vous avec le compte local créé précédemment. Vérifiez l’état de l’API à [http://localhost:4000/api/health](http://localhost:4000/api/health); la réponse indique si PostgreSQL est connecté.

Arrêtez les deux serveurs avec `Ctrl+C` dans leurs terminaux.

## Modèles de grille

Depuis la vue **Semaine**, ouvrez **Modèles de grilles** pour afficher les six modèles proposés :

1. **Semaine** — programmation type du lundi au jeudi pendant le Ramadan.
2. **Vendredi** — programmation spéciale incluant la Khutba.
3. **Week-end** — programmation du samedi et du dimanche.
4. **Commercial** — grille avec créneaux sponsorisés.
5. **Secours** — grille minimale avec contenu de remplacement.
6. **Diaspora** — programmation internationale pour les publics d’Europe et des États-Unis.

Sélectionnez un modèle, vérifiez la confirmation et appliquez-le à la grille active. L’option de combinaison semaine applique les modèles Semaine, Vendredi et Week-end. Le remplacement des programmes existants doit être confirmé explicitement.

Depuis la page **Grilles**, **Créer avec l’IA** prépare aussi des modèles généralistes à partir d’une description : chaîne jeunesse, sport, musique, actualité, programmation saisonnière, etc. La proposition de programmes peut être relue et ajustée avant sa création en grille hebdomadaire **Brouillon**. La génération utilise soit le serveur OpenCode, soit l’API directe du fournisseur sélectionné ; elle n’enregistre aucun programme lors de cette étape.

La configuration est centralisée dans `backend/.env`. Le fichier `backend/.env.example` indique les variables à renseigner sans contenir de clé réelle. L’adresse, l’authentification HTTP éventuelle, ainsi que le fournisseur et le modèle facultatifs se configurent ainsi :

```dotenv
OPENCODE_BASE_URL=http://localhost:4096
# Facultatif si le serveur OpenCode demande une authentification HTTP Basic
OPENCODE_USERNAME=
OPENCODE_PASSWORD=
# Facultatifs ensemble pour imposer un modèle; sinon, le backend utilise le modèle par défaut d’OpenCode
OPENCODE_PROVIDER_ID=
OPENCODE_MODEL=
```

Dans la fenêtre **Créer un modèle avec l’IA**, les modèles OpenCode sont listés séparément des fournisseurs appelés directement par le backend. Pour OpenCode, configurez les fournisseurs avec `opencode auth login` ou `/connect` dans son interface terminal, puis redémarrez son serveur.

Pour les appels directs, renseignez dans le `backend/.env` local la clé API et l’identifiant exact du modèle dans les variables correspondantes : `OPENAI_API_KEY` / `OPENAI_MODEL`, `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`, `GOOGLE_API_KEY` / `GOOGLE_MODEL`, `OPENROUTER_API_KEY` / `OPENROUTER_MODEL`, `MISTRAL_API_KEY` / `MISTRAL_MODEL`, `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` ou `XAI_API_KEY` / `XAI_MODEL`. Ollama n’a pas de clé API par défaut : renseignez `OLLAMA_MODEL` et vérifiez `OLLAMA_BASE_URL`. Les URL de base sont préremplies dans le fichier d’exemple et peuvent être adaptées à un proxy ou à un serveur local. Tous les fournisseurs directs apparaissent dans la liste ; ceux qui ne sont pas configurés sont marqués « à configurer » et la génération reste désactivée jusqu’au renseignement des variables requises. Redémarrez le backend après avoir modifié `backend/.env`. Ne partagez jamais ces clés et ne les placez pas dans le frontend.

Pour OpenCode, le backend utilise les routes de création de session (`/api/session`), de génération (`/api/session/{id}/generate`) et de suppression ; la session temporaire est supprimée après la génération. Pour présélectionner un modèle OpenCode, renseignez ensemble `OPENCODE_PROVIDER_ID` et `OPENCODE_MODEL` ; le choix fait dans la fenêtre ne vaut que pour la génération en cours. Les appels directs partent du backend vers le fournisseur sélectionné. Dans les deux parcours, la description est transmise au fournisseur : évitez les informations confidentielles et vérifiez les conditions, coûts et politiques de données du fournisseur.

Les jours suivent la convention API : `0 = dimanche`, `1 = lundi`, `2 = mardi`, `3 = mercredi`, `4 = jeudi`, `5 = vendredi`, `6 = samedi`.

## Rôles et accès

Les rôles configurés dans l’application sont :

- `ADMIN` : administration et accès complet.
- `PROGRAMMER` : gestion des grilles et des programmes selon les permissions accordées.
- `PRODUCTION` : création et modification des programmes, ainsi que changement des statuts de diffusion datés.
- `COMMERCIAL` : gestion des éléments commerciaux selon les permissions accordées.
- `DIRECTION` : création et modification des programmes, ainsi que changement des statuts de diffusion datés.
- `REGIE` : consultation en lecture seule des grilles et des diffusions datées.
- `VIEWER` : accès de consultation selon les permissions accordées.

Les permissions sont vérifiées côté backend. Le rôle affiché dans le navigateur ne constitue pas une autorisation d’accès.

## Commandes utiles

Depuis le dossier concerné :

| Dossier | Commande | Description |
| --- | --- | --- |
| `frontend/` | `npm run dev` | Démarre Vite en développement. |
| `frontend/` | `npm run build` | Compile le frontend dans `frontend/dist/`. |
| `frontend/` | `npm test -- --run` | Exécute les tests Vitest une fois. |
| `backend/` | `npm run dev` | Démarre l’API avec rechargement en développement. |
| `backend/` | `npm run build` | Vérifie et compile le TypeScript backend dans `backend/dist/`. |
| `backend/` | `npm start` | Démarre l'API compilée depuis `backend/dist/` (lancer `npm run build` avant). |
| `backend/` | `npm run prisma:studio` | Ouvre Prisma Studio pour inspecter la base configurée. |

Les tests frontend couvrent actuellement des composants mobiles. Jest est configuré côté backend, mais aucun test backend n’est encore détecté.

## Export PDF hebdomadaire

Depuis la vue **Semaine**, ouvrir **Export** puis **PDF Hebdomadaire**. Le PDF reprend les programmes chargés pour la grille active et le mode d’affichage choisi. Il présente les jours, horaires, titres, catégories, types de diffusion et durées; les grilles vides affichent un état explicite. Les exports sont générés localement dans le navigateur.

L’export PDF journalier est distinct et utilise le jour sélectionné. Les exports Régie et Direction partagent le tableau hebdomadaire et affichent leur mode; le mode Régie porte un filigrane. Ces documents ne remplacent pas une validation de grille dans l’application.

## API

La version de l’application est **V4**; le préfixe de contrat de l’API est `/api/v3` (ou `/grille/api/v3` pour le chemin avec base `/grille/`). Les anciennes routes métier `/api` sont désactivées et répondent `410 Gone`; elles ne sont pas utilisées par l’interface actuelle et ne signifient pas que l’application est en V2. Les routes principales comprennent :

- `POST /api/v3/auth/local-login` — connexion locale et émission d’un JWT.
- `GET /api/v3/grids` — liste des grilles accessibles.
- `GET /api/v3/grids/:gridId/programs` — programmes d’une grille.
- `POST /api/v3/grids/:gridId/programs` — création d’un programme.
- `GET /api/v3/ramadan/templates` — liste des six modèles.
- `POST /api/v3/ramadan/apply` — application d’un modèle à une grille.
- `POST /api/v3/templates/ai/generate` — génération et validation d’une proposition via OpenCode.
- `POST /api/v3/templates/ai/create` — création transactionnelle d’une grille brouillon et de ses programmes après relecture.
- `GET /api/health` — état du backend et de la connexion PostgreSQL.

Les routes métier protégées attendent `Authorization: Bearer <JWT>` et appliquent les permissions configurées.

## Dépannage

### L’API démarre, mais la connexion échoue

- Vérifiez que PostgreSQL fonctionne.
- Vérifiez `DATABASE_URL` dans `backend/.env`.
- Confirmez que les migrations et les permissions ont été initialisées.
- Vérifiez le terminal backend et l’endpoint `/api/health`.

### Le compte ne peut pas se connecter

- Vérifiez l’adresse, le mot de passe et `isActive` dans la base.
- Pour réinitialiser l’accès d’un compte, relancez `create-local-user.ts` avec la même adresse.
- Assurez-vous que les services backend et frontend sont démarrés.

### Le frontend n’atteint pas l’API

- Vérifiez que le backend écoute sur le port `4000`.
- En développement, vérifiez que Vite écoute sur le port `5173`.
- Pour un déploiement derrière un domaine ou un proxy, consultez [docs/DEPLOIEMENT_V4.md](docs/DEPLOIEMENT_V4.md) et adaptez les chemins et origines à votre configuration.

## Documentation complémentaire

- [Guide produit](docs/README_PUBLIC.md)
- [Guide de la régie ON AIR](docs/README_REGIE.md)
- [Notes de version](docs/RELEASE_NOTES.md)
- [Guide de déploiement](docs/DEPLOIEMENT_V4.md)
- [Consignes pour les assistants IA](AGENTS.md)
- [Historique des changements documentés](docs/RELEASE_NOTES.md)

## Règles des assistants de code

Codex applique les consignes de [AGENTS.md](AGENTS.md). Cursor charge également les règles persistantes de [`.cursor/rules/`](.cursor/rules/). Garder leurs règles globales cohérentes lorsqu’elles évoluent.

## Licence

Projet propriétaire de Broadcast SN+.
