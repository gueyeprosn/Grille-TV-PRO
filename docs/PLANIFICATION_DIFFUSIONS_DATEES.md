# Planification et suivi des diffusions datées

## Besoins confirmés

- Une grille contient des fiches de programmes récurrentes sur une période de validité.
- Chaque diffusion réelle reçoit son propre statut : `PLANNED`, `ON_AIR`, `AIRED` ou `CANCELLED`.
- La Régie consulte les grilles et les diffusions sans pouvoir modifier le planning ni les statuts.
- Production et Direction peuvent créer et modifier les programmes du planning et changer les statuts de diffusion. La création/gestion des grilles et l’archivage des programmes restent réservés aux rôles déjà autorisés.
- Les modifications importantes sont historisées avec l’utilisateur et la date. Les programmes et grilles sont archivés plutôt que supprimés physiquement.
- Les jours sont stockés selon la convention `0 = dimanche` à `6 = samedi`.
- La grille annuelle « Grille 2026–2027 » couvre du 1 octobre 2026 au 30 septembre 2027. Sa fenêtre d’affichage va de 05:00 à 00:00 ; les programmes après minuit sont conservés dans les données, mais masqués dans cette vue.

## Modèle retenu

- `Grid` conserve les dates de validité.
- `Program` conserve le programme récurrent et ses jours/heures.
- `ProgramOccurrence` matérialise une diffusion pour chaque date de service et garde un instantané du titre, des heures et de la durée. Son statut nullable permet de représenter « Non renseigné » pour les diffusions antérieures à la mise en place du suivi, sans les déclarer artificiellement diffusées.
- Une modification de programme actualise les instantanés des occurrences futures encore planifiées. Les diffusions passées et les statuts déjà renseignés restent conservés.

## Parcours principaux

1. La personne ouvre une grille et consulte les programmes récurrents en semaine ou par jour.
2. Une personne autorisée crée ou modifie un programme ; l’API valide les données, enregistre le programme, synchronise ses occurrences et écrit la trace d’audit dans une transaction.
3. Production ou Direction met à jour le statut d’une occurrence précise. La mise à jour et sa trace d’audit sont atomiques.
4. La Régie consulte les mêmes informations en lecture seule.
5. Une suppression dans l’interface archive la fiche et annule ses occurrences futures planifiées ; l’historique demeure disponible.

## Décisions UX/UI à préserver

- Les libellés et messages restent en français.
- La vue jour conserve un bouton distinct par jour.
- La vue semaine garde les programmes courts visibles et les actions utiles accessibles, sans surcharger les cartes.
- Le statut est clairement rattaché à une date de diffusion et « Non renseigné » distingue l’absence d’historique d’un statut planifié.
- Les actions non autorisées sont masquées dans l’interface et refusées par le RBAC serveur.
- Le chevauchement déclenche un avertissement sans bloquer l’enregistrement.

## Problèmes ouverts et limites

- Les statuts historiques antérieurs à la migration ne peuvent pas être reconstitués sans source métier fiable ; ils restent donc nuls (« Non renseigné »).
- La vue de suivi des occurrences est actuellement chargée pour la semaine courante. Une navigation vers d’autres dates nécessitera de transmettre explicitement la plage affichée à l’API.
- Les règles de décalage des programmes après minuit doivent rester cohérentes avec la convention de jour de grille déjà appliquée par les données et les vues.

## Critères d’acceptation

- Changer le statut d’une occurrence un lundi ne modifie pas le statut de la diffusion du lundi suivant.
- Les diffusions passées sans trace restent « Non renseigné » ; aucune n’est marquée « Diffusé » par défaut.
- Une modification de titre ou d’horaire actualise les occurrences futures planifiées, sans réécrire les diffusions passées ou déjà suivies.
- Régie peut consulter mais les opérations d’écriture échouent côté serveur avec un refus d’autorisation.
- Un échec d’audit annule l’écriture métier associée.
- L’import d’une grille crée ses occurrences et ses traces d’audit dans le même parcours transactionnel.
- L’archivage conserve grille, programme, occurrences et historique en base.
