# 🎛️ GrilleTV Pro — Guide Régie ON AIR

**Version 4 — Guide Opérateurs & Régie**

---

## 🎯 À qui s'adresse ce guide ?

Ce guide est destiné aux **opérateurs de régie**, **techniciens de diffusion** et **superviseurs ON AIR** qui utilisent GrilleTV Pro en situation de direct.

**Contexte d'usage** :
- Régie live en pression
- Lecture à distance (2-3 mètres)
- Décisions rapides
- Supervision temps réel

---

## 🚨 Écran ON AIR — Vue Critique

### Activation

1. **Cliquer sur le bouton "Régie ON AIR"** dans le Header
2. L'interface s'adapte automatiquement :
   - Police agrandie (≥ 15px)
   - Contraste élevé
   - Programme ON AIR mis en évidence

### Informations Affichées

**Header fixe** :
- Heure locale en temps réel
- Date du jour
- Statut ON AIR (badge rouge pulsant)

**Programme en cours** :
- Titre du programme (grand format)
- Horaire (début – fin)
- Type (Direct / Replay / Commercial)
- Catégorie (badge couleur)

**Timeline temps réel** :
- Barre de progression visuelle continue
- Pourcentage complété en temps réel
- **Temps restant précis** : format `MM:SS` (positif pour tout programme en cours)
- **Détection des dépassements** : si le programme dépasse l'horaire prévu, l'affichage bascule immédiatement en statut d'alerte `⚠️ DÉPASSEMENT ANTENNE` avec le compteur `+MM:SS` en rouge vif

**Programme suivant** :
- Titre
- Horaire de début
- Type et catégorie

### Playlist InstaPlayout lorsqu’aucun programme n’est à l’antenne

Lorsqu’aucun programme de la grille n’est en cours, la Régie permet d’importer localement le fichier XML de playlist InstaPlayout. Le fichier doit contenir des éléments `<file>` avec un chemin et une durée. Il est lu dans le navigateur et n’est pas envoyé à l’API.

Pour synchroniser le calcul :

1. Importer le XML de la playlist.
2. Lancer la lecture dans InstaPlayout.
3. Cliquer immédiatement sur **Synchroniser avec la lecture**.

La Régie calcule alors l’élément attendu en suivant l’ordre du XML et les durées depuis ce clic. L’étiquette indique qu’il s’agit d’une estimation : le fichier fourni ne contient pas de statut de lecture en direct. Après un arrêt, une pause, un saut ou une recherche dans InstaPlayout, relancer la lecture et utiliser **Resynchroniser la lecture**. Si la playlist se termine, la Régie le signale au lieu de conserver un ancien titre.

### Règles d'Usage

✅ **À FAIRE** :
- Vérifier l'heure locale avant chaque prise d'antenne
- Surveiller la timeline pour anticiper les transitions
- Noter les écarts (retard, dépassement) dans le journal de bord

❌ **À ÉVITER** :
- Modifier un programme pendant qu'il est ON AIR
- Ignorer les alertes visuelles
- Utiliser l'écran régie pour autre chose que la supervision

---

## 📱 Mode Mobile — Supervision Terrain

### Navigation

**Bottom bar** (toujours visible) :
- **Aujourd'hui** : Timeline verticale du jour
- **ON AIR** : Écran critique (lisible à 2 mètres)
- **Semaine** : Swipe horizontal jour par jour
- **Alertes** : Notifications en temps réel

### Écran ON AIR Mobile

**Design optimisé** :
- Fond rouge (#C1121F) pour maximum de visibilité
- Titre en grand format (3xl)
- Barre de progression épaisse
- Aucun bouton dangereux

**Usage recommandé** :
- Consultation rapide en déplacement
- Vérification avant une transition
- Supervision secondaire (backup)

---

## 🔔 Système d'Alertes

### Types d'Alertes

**🟠 Préparation** :
- **T-60 min** : Événements spéciaux
- **T-45 min** : Plateaux
- **T-30 min** : Directs

**🔴 ON AIR** :
- Notification automatique quand un programme passe ON AIR
- Badge rouge pulsant

**⚠️ Anomalie** :
- **DELAYED** : Programme en retard
- **OVERRUN** : Programme dépasse son horaire
- **SKIPPED** : Programme annulé
- **MANUAL_OVERRIDE** : Modification manuelle

### Canaux de Notification

**Telegram** :
- Messages instantanés
- Format structuré avec emojis
- Historique consultable

**Email** :
- Rapport détaillé
- Format HTML professionnel
- Pièces jointes possibles

### Configuration

**Programme journalier** :
- Envoi automatique à **04:30** (matin)
- Envoi automatique à **13:30** (soir)
- Contenu : Tous les programmes du jour avec horaires

**Alertes préparation** :
- Déclenchées automatiquement selon le type de programme
- `LIVE` : T-30 min par défaut
- `ADS` : T-45 min par défaut
- `SPECIAL` : T-60 min par défaut

Ces délais sont configurables avec `ALERT_PREP_DIRECT`, `ALERT_PREP_COMMERCIAL` et `ALERT_PREP_SPECIAL`. Le serveur doit exécuter le planificateur d’alertes pour que les notifications soient envoyées.

---

## 📊 Statuts Broadcast

### Statuts Opérationnels

**PLANNED** : Programme planifié (non confirmé)  
**CONFIRMED** : Programme confirmé par la production  
**IN_PRODUCTION** : En cours de préparation  
**READY** : Prêt pour diffusion  
**ON_AIR** : Actuellement en diffusion (calculé automatiquement)  
**DONE** : Diffusion terminée  
**CANCELED** : Programme annulé

### Statuts d'Anomalie

**DELAYED** : Programme en retard  
**OVERRUN** : Programme dépasse son horaire  
**SKIPPED** : Programme sauté  
**MANUAL_OVERRIDE** : Modification manuelle du statut

### Règles de Calcul ON_AIR

Le statut **ON_AIR** est calculé automatiquement par le système :

1. **Vérification de l'heure** : Heure actuelle entre `startTime` et `endTime`
2. **Vérification du jour** : Jour actuel dans la liste `days` du programme
3. **Fuseau horaire** : Par défaut `Africa/Dakar` (configurable)

**Override manuel** :
- Seuls les utilisateurs **ADMIN** peuvent forcer un statut ON_AIR
- Utiliser avec précaution (traçabilité dans l'audit trail)

---

## 📤 Exports PDF

Depuis le menu **Export**, les opérateurs peuvent générer un PDF hebdomadaire ou, dans les vues Semaine et Jour, un PDF du jour sélectionné.

### PDF hebdomadaire

- Format A4 paysage.
- Bandeau avec le nom de grille lorsqu’il est fourni, la date d’export et le mode.
- Compteurs de programmes, de diffusions et de jours couverts.
- Tableau des jours, horaires, programmes, catégories, types de diffusion et durées.
- En-têtes et numéros de page répétés; état explicite lorsqu’aucun programme n’est planifié.
- Le mode Régie affiche « MODE REGIE - NE PAS DIFFUSER » et un filigrane discret. Le mode Direction identifie le document comme interne.

Les modes changent le marquage du document; ils ne remplacent pas une validation de grille et n’ajoutent pas, à eux seuls, de statistiques métier différentes.

### PDF journalier

Le PDF journalier est un export distinct limité au jour sélectionné. Vérifier la sélection avant de lancer l’export.

### Export EPG (vMix)

L’export EPG est une sortie JSON disponible depuis le menu Export. Il est généré à la demande pour la grille active. Vérifier la configuration locale de vMix avant de charger son contenu à l’antenne.

## ⌨️ Raccourcis Clavier Mode Régie

**F11** : Plein écran (toggle)  
**Esc** : Quitter plein écran  
**Ctrl+Shift+R** : Basculer Mode Régie  
**Space** : Pause visuelle (freeze UI)

---

## 🎨 Design Broadcast

### Couleurs

**ON AIR** : `#C1121F` (rouge broadcast)  
**Fond principal** : `#0B1220` (noir profond)  
**Surface** : `#111827` (gris foncé)  
**Texte principal** : `#F1F5F9` (blanc)  
**Texte secondaire** : `#94A3B8` (gris clair)

### Typographie

**Titres** : Inter / Roboto / SF Pro (≥ 15px mobile, +20% tablette)  
**Heures** : JetBrains Mono / Courier New (monospace, ≥ 14px)  
**Corps** : Inter (≥ 15px mobile)

---

## 📋 Checklist Pré-Direct

Avant chaque prise d'antenne, vérifier :

- [ ] Heure locale synchronisée
- [ ] Programme ON AIR correctement identifié
- [ ] Programme suivant visible et vérifié
- [ ] Alertes consultées (pas d'anomalie)
- [ ] Timeline temps réel fonctionnelle
- [ ] Export PDF régie disponible (si besoin)

---

## 🚨 Gestion des Incidents

### Retard (DELAYED)

**Action** :
1. Noter l'heure réelle de début dans le journal
2. Marquer le statut DELAYED
3. Vérifier l'impact sur le programme suivant
4. Alerte automatique envoyée

### Dépassement (OVERRUN)

**Action** :
1. Noter l'heure réelle de fin
2. Marquer le statut OVERRUN
3. Vérifier l'impact sur le programme suivant
4. Alerte automatique envoyée

### Annulation (SKIPPED)

**Action** :
1. Marquer le statut SKIPPED
2. Noter la raison dans le journal
3. Alerte automatique envoyée

---

## 📞 Support & Assistance

**En cas de problème** :
1. Consulter les logs dans la console navigateur
2. Vérifier la connexion au backend
3. Contacter l'équipe technique

**Documentation complète** : Voir README.md technique

---

## ✅ Bonnes Pratiques

### Régie Live

- ✅ Toujours vérifier l'heure locale avant une transition
- ✅ Surveiller la timeline pour anticiper
- ✅ Noter tous les écarts dans le journal
- ✅ Utiliser les exports PDF pour documentation

### Mobile

- ✅ Utiliser l'écran ON AIR pour consultation rapide
- ✅ Ne pas modifier de programmes depuis mobile
- ✅ Consulter les alertes régulièrement

### Coordination

- ✅ Utiliser le Coordination Hub pour communiquer
- ✅ Documenter les incidents immédiatement
- ✅ Signaler les écarts prévu vs diffusé

---

*Guide Régie ON AIR — GrilleTV Pro V4*
