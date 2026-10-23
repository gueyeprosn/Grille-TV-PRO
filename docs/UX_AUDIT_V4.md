# Besoins produit et audit UX/UI — GrilleTV Pro V4

**État au 20 octobre 2026**

Ce document convertit les besoins récurrents des échanges accessibles en critères de produit et consigne des constats vérifiables dans le code et l’interface. Il sert de référence fonctionnelle, pas de compte rendu exhaustif d’entretiens utilisateurs.

## Sources et limites

- Historique de cette conversation, incluant les demandes sur les vues semaine/jour, les horaires à la minute, les détails d’un programme, la navigation, les couleurs et la densité visuelle.
- Trois tâches Codex accessibles pour ce projet, consultées dans les limites de leur historique disponible : audit UX initial, poursuite des travaux V4 et audit de cohérence/API. Les échanges d’autres tâches ou comptes n’ont pas été consultés.
- Code, `AGENTS.md`, README et documentation du dépôt.
- Inspection visuelle en lecture seule de l’application locale, le 19 octobre 2026.
- Vérification de la grille ouverte et du code local, le 20 octobre 2026. La disponibilité de l’API et de PostgreSQL ainsi que l’application des migrations en attente ont été confirmées pendant le redémarrage. Les vues Coordination, rapport et mobile n’ont pas été retestées visuellement dans cette mise à jour.

L’inspection n’est pas une étude complète auprès d’utilisateurs. La vérification mobile à plusieurs largeurs n’a pas été possible. L’interface a affiché une erreur serveur lors de l’ouverture de Coordination. La vérification de l’état des migrations n’a pas pu joindre PostgreSQL depuis le terminal utilisé; aucune migration ni écriture en base n’a été effectuée. La cause de l’erreur de Coordination reste donc à diagnostiquer côté serveur/base active.

## Besoins confirmés

1. **Planifier et lire une grille de diffusion** depuis les vues semaine et jour, avec horaires et durées fidèles aux données, y compris les programmes d’une minute et les horaires non alignés sur les pas visuels.
2. **Identifier rapidement les contenus** par catégorie/type, et distinguer le direct et le replay avec un code couleur lisible.
3. **Garder les cartes compactes et cadrées** dans la grille, limiter les arrondis et les blocs décoratifs, tout en conservant les actions utiles.
4. **Modifier, supprimer ou déplacer un programme** depuis les parcours de planification, avec confirmation adaptée aux actions destructives.
5. **Consulter les détails avant modification sur mobile**; sur ordinateur, ouvrir les détails par double-clic et au clavier.
6. **Naviguer de façon cohérente** entre Grilles, Jour, Semaine, Coordination, Rapports et Statistiques, sans imposer une interface identique à des usages différents.
7. **Créer des modèles de grille génériques assistés par IA**, au-delà de Ramadan, avec relecture avant création ou application.
8. **Exporter la semaine en PDF** comme document lisible pour la planification et la régie.
9. Maintenir le produit **V4**, le fonctionnement local, l’authentification par comptes locaux, PostgreSQL comme source métier et les contrôles RBAC. Les six modèles existants, dont Diaspora, doivent rester accessibles.

## Parcours principaux

### Préparer une grille

Choisir une grille active → examiner la couverture hebdomadaire → repérer les trous/conflits et les programmes courts → ouvrir les détails → modifier, déplacer ou supprimer selon ses permissions → contrôler le résultat dans les vues jour et semaine.

### Suivre la diffusion

Ouvrir la vue jour ou régie → repérer le programme en direct et son statut → ouvrir sa fiche → coordonner incident, écart ou tâche → distinguer clairement une erreur de chargement d’une absence réelle de données.

### Rendre compte et partager

Ouvrir Rapport ou Statistiques → comprendre la période et l’unité des indicateurs → exporter une vue hebdomadaire PDF/CSV cohérente avec les mêmes règles de période et de récurrence.

### Créer une grille

Décrire le besoin → générer une proposition de modèle → relire et corriger → confirmer la création d’une grille brouillon → appliquer un modèle à une grille active avec avertissement explicite si des programmes seront remplacés.

## Décisions UX/UI à préserver

- Français dans l’interface et les messages utilisateur.
- Semaine et jour partagent le vocabulaire, les statuts, les couleurs et les règles horaires, tout en gardant leurs mises en page adaptées à leur usage.
- Les catégories/type de contenu portent une couleur identifiable; le direct et le replay conservent un indicateur lisible sur toute la carte.
- Limiter les arrondis et décorations; préserver densité, lisibilité et contraste en contexte de régie.
- Ne pas cacher les actions principales. Sur ordinateur, le double-clic ouvre la modification et Entrée ouvre les détails; sur mobile, le toucher ouvre les détails et l’édition reste une action distincte.
- Pour `grid-2026-2027-bon`, le périmètre affiché va de 05:00 à 00:00; les programmes conservés après minuit ne sont pas visibles ni comptabilisés dans la couverture de cette grille.
- Privilégier les boutons natifs, l’ordre clavier, un focus visible, des libellés accessibles et des cibles tactiles confortables.
- Respecter la convention jours API `0 = dimanche` à `6 = samedi`, l’authentification locale, les permissions serveur, l’audit et PostgreSQL.
- Le numéro produit V4 et le contrat HTTP `/api/v3` sont deux versions différentes; ne pas les présenter comme concurrentes.

## Constats vérifiés et suivi

| Priorité / état | Constat | Critère d’acceptation |
| --- | --- | --- |
| P1 — corrigé dans cette livraison | Dans les vues mobiles, un tap ouvrait directement l’édition. Cela rendait l’inspection et la lecture risquées. | Un tap ouvre les détails; le formulaire d’édition n’apparaît qu’après l’action « Modifier le programme ». |
| P1 — corrigé dans cette livraison | Le double-clic de la semaine ouvrait les détails alors que la demande la plus récente demande l’édition. | Double-clic ouvre le formulaire de modification; Entrée ouvre les détails; les actions restent accessibles au clavier. |
| P1 — corrigé dans cette livraison | Pour la grille 2026–2027, semaine, jour et indicateurs n’appliquaient pas tous le même périmètre 05:00–00:00. | Les vues jour/semaine, temps libre, couverture et conflits utilisent le périmètre de la grille; les programmes nocturnes restent enregistrés mais ne sont pas affichés ni comptés. |
| P1 — corrigé dans cette livraison | Certains calculs de résumé privilégiaient la durée déclarée alors que la grille positionne le programme d’après son heure de fin. | L’heure de fin est la référence pour la durée calculée lorsque les deux champs divergent; la vue de contrôle conserve l’avertissement de durée incohérente. |
| P1 — corrigé dans cette livraison | L’erreur de chargement Coordination pouvait laisser visible un message d’état vide. | Erreur serveur distincte de l’état vide, avec action Réessayer; aucune donnée n’est annoncée absente après échec réseau. |
| P1 — corrigé dans cette livraison | Le serveur montait aussi une ancienne API JSON métier en plus de l’API Prisma V3; ces routes historiques n’ont pas de consommateur dans le frontend actuel. | Les routes V3 restent actives; anciennes routes métier désactivées avec réponse 410; endpoint santé conservé. |
| P1 — à revalider | Une inspection antérieure de Coordination avait retourné « Erreur serveur interne ». Lors du redémarrage du 20 octobre, l’API et PostgreSQL ont répondu; la vue Coordination n’a pas été rouverte. | Tester les onglets Coordination avec le compte et la grille actifs; distinguer erreurs serveur et listes vides. |
| P1 — partiellement corrigé | Le rapport additionnait les durées des fiches et présentait les statuts de ces fiches comme des « minutes diffusées » et un taux de conformité. L’API ne fournit pas de journal d’antenne par occurrence. | L’interface et le CSV décrivent maintenant la durée cumulée et la part de fiches marquées Diffusé/Terminé/En direct; ne pas les assimiler à une durée réelle à l’antenne. Pour un vrai taux de conformité, définir la période et enregistrer/relier les diffusions réelles par occurrence. |
| P2 — à vérifier visuellement | À la largeur observée (~1125 px), la vue semaine comporte plusieurs bandes de commandes et exige du défilement; certains titres de cartes courtes sont tronqués. | Contrôler 375, 768, 1024 et 1440 px ainsi que paysage; conserver les commandes principales accessibles et rendre les titres/détails consultables sans débordement. |
| P2 — précision d’indicateur | Une vue affiche 167 h 53 et 99,9 %, tandis que les compteurs semaine arrondissent à 168 h et 100 %. Ce résultat semble être un arrondi et n’établit pas seul un défaut de calcul. | Choisir un niveau de précision cohérent ou afficher le détail exact à proximité des valeurs arrondies. |

## Régressions à éviter

- Un programme court ne doit pas disparaître à cause d’un arrondi à l’heure ou d’une hauteur de carte nulle; conserver les minutes dans le calcul et les libellés.
- Le périmètre 05:00–00:00 ne doit pas effacer les programmes enregistrés après minuit; il les masque seulement dans les vues et indicateurs de cette grille.
- Une action tactile sur une carte ne doit pas déclencher une modification involontaire.
- Une erreur API ne doit pas se présenter comme une liste vide.
- Ne pas contourner auth/RBAC, ne pas réintroduire Firebase ou synchronisation cloud, ne pas faire d’écriture ou de réinitialisation de base pour diagnostiquer.
- Ne pas confondre grille de diffusion et sélection visuelle de jours; la semaine doit contenir les occurrences selon les jours réellement sélectionnés.

## Vérifications attendues avant livraison

- Tests ciblés des détails semaine/mobile et des états d’erreur Coordination.
- `cd frontend && npm test -- --run`
- `cd frontend && npm run build`
- `cd backend && npm run build`
- Vérification manuelle de la semaine et du jour avec programmes courts, actions autorisées, clavier et plusieurs largeurs; à compléter lorsque l’instance API et la base sont disponibles.
- Inspection des fichiers générés par la compilation TypeScript backend, car la configuration peut émettre dans l’arborescence source.
