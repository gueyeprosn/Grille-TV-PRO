# GrilleTV Pro — Présentation du produit

GrilleTV Pro V4 est une application locale de planification et de suivi des programmes de Broadcast SN+. Elle aide les équipes de programmation, de production et de régie à préparer les grilles et à suivre les opérations de diffusion.

## Fonctions principales

- Création et gestion de plusieurs grilles, avec états brouillon, publiée et archivée.
- Vues hebdomadaire et journalière, filtres et formulaires de programme.
- Détails accessibles depuis une carte; sur téléphone/tablette, toucher un programme ouvre d’abord sa fiche, puis l’action Modifier ouvre le formulaire.
- Catégories, types de diffusion, statuts opérationnels et détection de conflits.
- Modes d’interface Standard, Régie et Direction.
- Utilisation sur ordinateur, tablette et téléphone, avec interfaces adaptées aux appareils.
- Suivi ON AIR, coordination, incidents, écarts et rapports.
- Exports PDF, CSV et JSON; export EPG compatible avec le flux vMix configuré.
- Modèles Ramadan disponibles depuis la vue semaine d’une grille active.
- Création assistée de grilles brouillon génériques avec un modèle IA OpenCode configuré par l’installation.

## Export PDF hebdomadaire

Le PDF hebdomadaire est un document A4 paysage. Il indique la grille hebdomadaire, la date d’export, le mode, des compteurs de programmes, de diffusions et de jours couverts, puis les horaires, titres, catégories, types de diffusion et durées. Les titres et la pagination sont repris sur les pages suivantes. Le mode Régie ajoute un filigrane « NE PAS DIFFUSER »; les exports Direction portent leur libellé de mode.

L’export reprend les programmes chargés dans la vue. Le PDF est un support de lecture et ne remplace pas le statut de validation de la grille dans l’application.

## Données et fonctionnement

L’application est conçue pour un fonctionnement local. L’API stocke les données métier dans PostgreSQL. L’authentification repose sur des comptes locaux et les autorisations sont contrôlées côté serveur. Les notifications par e-mail ou Telegram sont facultatives et dépendent de la configuration du serveur.

La génération IA est facultative et transmet le descriptif saisi au fournisseur sélectionné dans OpenCode. Certains modèles sont gratuits ou proposés temporairement, mais l’accès gratuit dépend du fournisseur, de ses conditions et de sa disponibilité. Ne saisissez pas de contenu confidentiel.

## Navigation dans les programmes

Dans la vue semaine, double-cliquez sur un programme ou sélectionnez-le au clavier puis appuyez sur Entrée pour consulter sa fiche. Sur téléphone et tablette, touchez la carte pour ouvrir les détails; utilisez ensuite « Modifier le programme » pour passer à l’édition. Les actions disponibles restent soumises à votre rôle.

Sur téléphone et tablette, la barre du bas donne accès à Aujourd’hui, ON AIR, Semaine et Alertes. En tablette paysage, ON AIR conserve la vue Régie partagée avec la grille du jour. Le menu « Plus » ouvre le conducteur du jour, la Coordination et le Rapport lorsque la grille est sélectionnée. Le bouton soleil/lune dans l’en-tête permet de passer du thème clair au thème sombre; cette préférence est mémorisée localement.

## Accès et documentation

Pour installer ou démarrer l’application, consulter le [README technique](../README.md). Le [guide Régie](README_REGIE.md) couvre les usages d’antenne. Le [guide de déploiement](DEPLOIEMENT_V4.md) décrit les étapes à adapter à l’infrastructure.

Les fonctionnalités, versions et résultats de vérification évoluent. Ce document évite les indicateurs chiffrés de couverture ou de performance qui ne sont pas mesurés pour chaque livraison.

---

Produit propriétaire de Broadcast SN+.
