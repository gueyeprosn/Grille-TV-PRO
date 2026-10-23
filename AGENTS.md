# Consignes pour les assistants IA

Lire ces consignes avant d’intervenir dans GrilleTV Pro V4. Elles s’appliquent à tout le dépôt, sauf règle plus précise dans un `AGENTS.md` situé dans un sous-dossier.

## Objectif du projet

GrilleTV Pro planifie et suit les programmes d’une chaîne de télévision. L’interface et les messages destinés aux utilisateurs sont en français. L’application doit fonctionner localement, sans dépendre d’un service externe d’authentification ou de synchronisation.

PostgreSQL est la source de vérité des données métier. `localStorage` ne sert qu’aux préférences et aux usages locaux explicitement prévus ; ne le présentez pas comme un remplacement de la base métier.

## Architecture

- `frontend/` : React, TypeScript, Vite, Tailwind CSS et Vitest.
- `backend/` : API Express en TypeScript, Prisma, PostgreSQL, authentification JWT locale, RBAC et journaux d’audit.
- `backend/src/ramadan/` : générateurs et application des six modèles de grille : semaine, vendredi, week-end, commercial, secours et diaspora.
- `backend/prisma/` : schéma et migrations de base de données.
- `docs/` : documentation fonctionnelle et d’exploitation.
- Le frontend est servi sous `/grille/` ; Vite relaie `/api` vers le backend local.

## Avant de modifier

1. Lire les consignes du dossier concerné, puis suivre le parcours réel de la fonctionnalité dans le code. Pour une évolution métier, examiner le chemin interface → API → stockage et les rôles concernés.
2. Distinguer les faits observés, les hypothèses et les recommandations. Ne déduire ni une règle métier ni un défaut à partir d’un nom de composant ou d’un seul écran.
3. Garder les changements ciblés. Réutiliser les composants, styles et conventions présents avant d’ajouter une dépendance ou un nouveau système.
4. Préserver les comportements existants, le modèle de données, les rôles et les permissions, sauf demande explicite. Toute évolution du schéma doit inclure une migration Prisma cohérente.
5. Ne pas modifier manuellement les artefacts générés lorsqu’une source TypeScript, Prisma ou Vite correspondante existe. Si la compilation écrit dans l’arborescence source, contrôler les sorties générées.

## Documentation Markdown et règles persistantes

- Les fichiers Markdown maintenus par le projet sont les fichiers hors `node_modules`, dépendances tierces, sorties compilées et archives générées. Ne pas éditer la documentation des dépendances.
- `AGENTS.md` est la source de consignes pour Codex. Les règles de `.cursor/rules/` ciblent Cursor ; garder les principes globaux cohérents entre les deux.
- Mettre à jour le README ou le guide le plus proche lorsque des commandes, parcours utilisateur, formats d’export, modèles, rôles, authentification ou procédures d’exploitation changent.
- Vérifier les commandes dans les scripts réels de `package.json` et les comportements dans le code avant de les documenter. Ne pas présenter un exemple, une hypothèse ou un ancien chiffre comme un état actuel.
- Les versions, dates, nombres de fonctionnalités, mesures de performance et résultats de tests/builds doivent être datés et étayés. Garder les anciennes notes comme historiques, ou les remplacer clairement ; ne jamais annoncer « prêt pour production » sans validation actuelle.
- Les changements de génération PDF doivent préserver les données métier. Vérifier visuellement les pages, la pagination, les états vides et les modes concernés avec des données synthétiques, puis mettre à jour le guide d’export.
- Garder les consignes et guides lisibles, en français pour le produit, avec des titres descriptifs et des liens locaux valides. Ne pas recopier des secrets ni des données réelles.

## Règles métier, authentification et sécurité

- Ne pas réintroduire Firebase, Google Sign-In ou une synchronisation cloud sans demande explicite du propriétaire du projet.
- Ne jamais délivrer un JWT sur la seule base d’un e-mail, d’un UID ou de données envoyées par le navigateur. Le serveur vérifie le mot de passe local, l’état du compte et les permissions.
- Si PostgreSQL est indisponible, échouer de manière sûre pour l’authentification et les opérations métier protégées. Ne pas autoriser un accès de secours à partir des rôles d’un ancien JWT.
- Valider les entrées côté serveur avec les validateurs déjà présents dans `backend/src/middleware/validation.ts`. Protéger les routes métier avec `ensureAuth` et les contrôles RBAC appropriés.
- Ne jamais faire confiance au rôle transmis par le navigateur : charger l’utilisateur et son rôle depuis PostgreSQL.
- Préserver les journaux d’audit des actions sensibles et les limites de débit des routes d’authentification.
- Garder les secrets dans les fichiers d’environnement locaux. Ne jamais placer de vrais secrets dans le code, la documentation, les journaux ou les tests ; ne pas afficher de mots de passe, jetons ou données personnelles dans les logs.
- Ne pas écraser de données réelles, réinitialiser une base, supprimer des fichiers métier ou lancer une migration destructive sans demande explicite.
- Éviter d’insérer des données de test dans une base locale configurée qui peut contenir des données utiles. Utiliser des fixtures isolées lorsque le dépôt en fournit.

## Interface, UX et accessibilité

- Garder l’interface utilisateur en français, y compris les états vides, erreurs, chargements, confirmations et libellés d’actions. Employer des termes métier cohérents d’un écran à l’autre.
- Conserver des vues cohérentes, responsive et accessibles au clavier et aux lecteurs d’écran. Préserver des états de focus visibles, des libellés explicites, des contrastes suffisants, des zones tactiles praticables et la préférence de mouvement réduit.
- Préserver les expériences bureau, mobile, tablette et Régie, ainsi que les états de diffusion (`ON_AIR`, `AIRED`, etc.). Une modification d’une vue partagée ne doit pas dégrader les autres formats.
- Lors d’un diagnostic UX/UI, suivre les parcours depuis la navigation visible et inspecter les écrans réellement rendus si l’application peut être lancée sans risque pour les données. Ne pas créer, modifier, publier ou supprimer de données pendant une simple inspection. Si une inspection visuelle n’est pas possible, le dire et étayer les constats avec le code.
- Rattacher chaque recommandation UX/UI à un écran, un composant ou un parcours observé. Indiquer l’impact utilisateur et distinguer les problèmes confirmés des points à vérifier avec les utilisateurs ou le produit.
- Ne pas traiter un chiffre différent entre deux vues comme un défaut avant d’avoir vérifié sa définition, sa source et sa période. Clarifier l’interface si les métriques ont des périmètres différents.
- Les modèles de grille se choisissent depuis la vue hebdomadaire lorsqu’une grille est active. Le modèle Diaspora fait partie des six modèles proposés.
- Lorsqu’un modèle peut remplacer des programmes existants, conserver une confirmation explicite qui décrit clairement cette conséquence.
- Respecter les conventions des jours : `0 = dimanche`, `1 = lundi`, …, `6 = samedi`, ainsi que les formats horaires déjà employés par l’API.

## Tests et vérifications

Ne pas ajouter ni lancer de tests ou de builds pour une simple analyse, sauf si l’utilisateur demande une vérification. Pour une demande de vérification ou une modification qui doit être validée, choisir les commandes adaptées aux fichiers touchés et rapporter exactement leurs résultats.

Commandes de vérification disponibles depuis la racine :

```bash
cd frontend && npm test -- --run
cd frontend && npm run build
cd backend && npm run build
```

Vitest est configuré dans le frontend ; examiner les tests réellement présents avant d’affirmer leur couverture. Jest est configuré côté backend ; si Jest répond `No tests found`, le rapporter ainsi et ne pas dire que les tests backend ont réussi.

Après les vérifications demandées, résumer les fichiers ou comportements modifiés, les commandes exécutées et les blocages éventuels. Ne jamais annoncer un test ou une compilation réussis sans résultat de commande correspondant.

Une inspection visuelle ou une analyse de code seule ne prouve pas qu’un test, un build ou un déploiement a réussi. Ne pas transformer un résultat passé ou une note historique en garantie actuelle.

## Comptes locaux

Les comptes locaux peuvent être créés ou mis à jour avec `backend/src/scripts/create-local-user.ts`. Ne pas inventer d’identifiants ou de mots de passe. Le compte et le mot de passe doivent être choisis par le propriétaire de l’installation ; aucun identifiant secret réel ne doit être ajouté à un exemple versionné.

