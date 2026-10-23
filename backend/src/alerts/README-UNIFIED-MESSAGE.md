# 📺 SYSTÈME DE NOTIFICATION PROFESSIONNEL UNIFIÉ

## 🎯 Objectif

Un **seul modèle de message** décliné automatiquement selon :
- Le type d'événement (ON AIR, PRÉPARATION, INCIDENT, etc.)
- Le canal (Telegram / Email)
- Le niveau de criticité

## 🧱 Structure Unique Obligatoire

Chaque message contient **TOUJOURS** les 3 lectures :

### 1. 🎛️ RÉGIE (action immédiate)
- État diffusion : OK | ATTENTION | CRITIQUE
- Timeline : Pourcentage écoulé ou temps restant
- Action requise : AUCUNE | SURVEILLANCE | INTERVENTION

### 2. 📊 DIRECTION (impact & décision)
- Impact antenne : AUCUN | MINEUR | MAJEUR
- Conformité : OK | ÉCART
- Décision : AUTOMATIQUE | VALIDÉE | À CONFIRMER

### 3. 💰 COMMERCIAL (valeur & engagement)
- Statut pub : NON CONCERNÉ | SPONSORISÉ | À RATTRAPER
- Annonceur : Nom ou N/A
- Impact valeur : AUCUN | À SUIVRE | CRITIQUE

## 📐 Format du Message

```
📺 GRILLETv PRO — [TYPE DE MESSAGE]
🗓️ [Jour Date] — 🕒 [Heure]

────────────────────
🎬 PROGRAMME
────────────────────
Titre        : [Nom du programme]
Horaire      : [HH:mm – HH:mm]
Type         : [DIRECT | PLATEAU | REDIFF | COMMERCIAL]
Catégorie    : [RELIGION | CULTURE | INFO | COMMERCIAL]
Statut       : [ON AIR | À VENIR | TERMINÉ | INCIDENT]

────────────────────
🎛️ RÉGIE
────────────────────
État diffusion : [OK | ATTENTION | CRITIQUE]
Timeline       : [XX% écoulé]
Action requise : [AUCUNE | SURVEILLANCE | INTERVENTION]

────────────────────
📊 DIRECTION
────────────────────
Impact antenne : [AUCUN | MINEUR | MAJEUR]
Conformité     : [OK | ÉCART]
Décision       : [AUTOMATIQUE | VALIDÉE | À CONFIRMER]

────────────────────
💰 COMMERCIAL
────────────────────
Statut pub     : [NON CONCERNÉ | SPONSORISÉ | À RATTRAPER]
Annonceur      : [N/A | Nom annonceur]
Impact valeur  : [AUCUN | À SUIVRE | CRITIQUE]

────────────────────
📝 NOTE
────────────────────
[Résumé clair en 1–2 lignes maximum]

⏱️ Généré automatiquement — GrilleTV Pro
```

## 📡 Types de Messages Supportés

1. **ON_AIR** : Programme en cours de diffusion
2. **PREPARATION** : Alerte de préparation avant diffusion (`LIVE` T-30, `ADS` T-45, `SPECIAL` T-60 par défaut; délais configurables côté backend)
3. **INCIDENT** : DELAYED / OVERRUN / SKIPPED / OVERRIDE
4. **FALLBACK** : Xassida / Animation / Playlist automatique
5. **DAILY_SCHEDULE** : Programme journalier (Matin / Soir)
6. **END_OF_SERVICE** : Rapport quotidien de fin de service

## 🔔 Canaux

### Telegram PRO
- Texte clair avec emojis fonctionnels
- Formatage HTML simple
- Envoi instantané

### Email PRO
- Version HTML stylée (broadcast)
- Même structure que Telegram
- Objet normalisé : `[GRILLETv PRO] [TYPE]`

## 💻 Utilisation

### Fonction principale

```typescript
import { formatUnifiedMessage, buildOnAirContext } from './unified-message.js'

const context = buildOnAirContext(alert)
const message = formatUnifiedMessage('ON_AIR', context)

// Utiliser les formats
await sendTelegramMessage(message.telegramText)
await sendEmail(message.emailSubject, message.emailHtml, message.emailText)
```

### Helpers disponibles

- `buildOnAirContext(alert: OnAirAlert)` : Contexte ON AIR
- `buildPreparationContext(alert: PreparationAlert)` : Contexte PRÉPARATION
- `buildIncidentContext(alert: AnomalyAlert)` : Contexte INCIDENT
- `buildFallbackContext(block: DailyScheduleBlock, date: Date)` : Contexte FALLBACK
- `buildDailyScheduleContext(block: DailyScheduleBlock, date: Date)` : Contexte PROGRAMME JOURNALIER
- `buildEndOfServiceContext(report: EndOfServiceReport)` : Contexte FIN DE SERVICE

## ✅ Intégration

Le système est **déjà intégré** dans :
- `telegram.ts` : Toutes les fonctions de formatage utilisent le système unifié
- `email.ts` : Toutes les fonctions de formatage utilisent le système unifié
- `index.ts` : Les fonctions d'envoi utilisent les nouveaux formats

**Aucune modification nécessaire** dans le code existant. Le système fonctionne en transparence.

Les heures de préparation ci-dessus sont des valeurs par défaut, pas une garantie d’envoi. Le planificateur backend doit tourner et la configuration d’envoi doit être valide.

## 📝 Exemples

Voir `unified-message-examples.ts` pour des exemples complets :
- ON AIR avec programme en cours
- INCIDENT avec retard
- FIN DE SERVICE avec incidents
- PRÉPARATION pour plateau commercial

Pour exécuter les exemples :
```bash
npm run alerts:examples
```

ou

```bash
npx tsx src/alerts/unified-message-examples.ts
```

## 🔥 Priorité

Ce système est un **outil de diffusion broadcast**, pas une messagerie SaaS.
Il doit fonctionner **sous pression antenne** avec une lecture en moins de 5 secondes.

