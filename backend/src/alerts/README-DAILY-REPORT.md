# Générateur de Rapport de Diffusion Quotidien

## 📺 GrilleTV Pro - Système Broadcast Professionnel

Ce module génère un **rapport officiel de diffusion quotidien** destiné simultanément à :
- 🎛️ La régie ON AIR
- 📊 La direction des programmes
- 💰 Le service commercial

## 🎯 Caractéristiques

- ✅ **Ton institutionnel broadcast** - Format professionnel strict
- ✅ **Lisible sur Telegram et Email** - Format adapté aux deux canaux
- ✅ **Structure stricte avec sections** - Organisation claire par blocs horaires
- ✅ **Détails complets** - Heure, titre, durée, statut pour chaque programme
- ✅ **Gestion des plages vides** - Mention explicite des plages sans programme
- ✅ **Synthèses dédiées** - Une synthèse pour chaque service (Régie, Direction, Commercial)

## 📋 Structure du Rapport

Le rapport est organisé en sections :

### 1. En-tête
- Date et jour de la semaine
- Nom de la grille (optionnel)

### 2. Blocs horaires
Chaque bloc (MATIN / APRÈS-MIDI / SOIR) contient :
- Liste des programmes avec :
  - Heure de début
  - Titre
  - Durée
  - Statut (DIFFUSÉ / NON DIFFUSÉ)
  - Type de programme
  - Catégorie
  - Notes éventuelles
- Plages horaires vides avec mention du remplissage automatique

### 3. Synthèses

#### 🎛️ Synthèse Régie
- Nombre de programmes planifiés
- Nombre de programmes diffusés
- Nombre de programmes non diffusés
- Nombre d'incidents
- Statut global
- Détails des incidents

#### 📊 Synthèse Direction
- Taux de conformité
- Nombre de programmes diffusés
- Écarts signalés (Critiques / Majeurs / Mineurs)

#### 💰 Synthèse Commerciale
- Nombre de fenêtres commerciales planifiées
- Nombre de fenêtres commerciales diffusées
- Nombre de fenêtres commerciales non diffusées
- Alertes de rattrapage si nécessaire
- Détails des fenêtres commerciales

### 4. Observations
- Liste détaillée des incidents
- Liste des programmes non diffusés

### 5. Génération
- Date et heure de génération
- Informations système

## 🚀 Utilisation

### Import du module

```typescript
import { generateDailyBroadcastReport, type DailyBroadcastData } from './daily-broadcast-report.js'
```

### Création des données

```typescript
const data: DailyBroadcastData = {
  date: new Date(),
  programs: [
    {
      id: 'prog-001',
      title: 'Journal de Touba',
      startTime: '07:00',
      endTime: '07:30',
      durationMin: 30,
      type: 'LIVE',
      category: 'Actualités',
      opStatus: 'CONFIRMED',
      days: [1, 2, 3, 4, 5],
      status: 'DIFFUSÉ', // ou 'NON DIFFUSÉ'
    },
    // ... autres programmes
  ],
  incidents: [
    {
      time: '07:02',
      type: 'RETARD',
      description: 'Démarrage avec 2 minutes de retard',
      programId: 'prog-001',
      severity: 'MINEUR',
    },
  ],
  globalStatus: 'OK', // ou 'ATTENTION' ou 'CRITIQUE'
  gridName: 'Grille Ramadan 2025', // optionnel
}
```

### Génération du rapport

```typescript
const report = generateDailyBroadcastReport(data)

// Le rapport contient :
// - report.telegramText : Message formaté pour Telegram
// - report.emailHtml : Version HTML pour Email
// - report.emailSubject : Sujet de l'email
// - report.emailText : Version texte pour Email
```

### Envoi du rapport

#### Via Telegram

```typescript
import { sendTelegramMessage } from './telegram.js'

await sendTelegramMessage(report.telegramText)
```

#### Via Email

```typescript
import { sendEmail } from './email.js'

await sendEmail(
  report.emailSubject,
  report.emailHtml,
  report.emailText
)
```

**Note:** Les destinataires email sont configurés dans le fichier de configuration des alertes.

## 📝 Exemple Complet

Voir le fichier `test-daily-report.ts` pour un exemple complet d'utilisation.

### Exécuter l’exemple local

Depuis `backend/`, le script d’exemple est lancé directement avec `tsx` :

```bash
npx tsx src/alerts/test-daily-report.ts
```

Le script affiche le rapport, puis écrit des exemples dans `backend/test-output/`. Il n’existe pas de script `test:daily-report` dans `backend/package.json`. L’envoi Telegram ou e-mail est désactivé par défaut; ne définissez `SEND_TELEGRAM=true` ou `SEND_EMAIL=true` que si l’envoi réel est souhaité et que la configuration correspondante a été vérifiée.
```

## 🔧 Intégration avec le Système Existant

Le générateur de rapport peut être intégré dans :

1. **Scheduler quotidien** - Génération automatique en fin de journée
2. **API endpoint** - Génération à la demande via API
3. **Système d'alertes** - Intégration avec le système d'alertes unifié

### Exemple d'intégration avec scheduler

```typescript
import { scheduleJob } from 'node-schedule'
import { generateDailyBroadcastReport } from './daily-broadcast-report.js'
import { sendTelegramMessage } from './telegram.js'
import { sendEmail } from './email.js'

// Générer le rapport tous les jours à 23:59
scheduleJob('59 23 * * *', async () => {
  const data = await fetchDailyBroadcastData()
  const report = generateDailyBroadcastReport(data)
  
  // Envoyer aux destinataires
  await sendTelegramMessage(report.telegramText)
  await sendEmail(
    report.emailSubject,
    report.emailHtml,
    report.emailText
  )
})
```

## 📊 Format des Données

### ProgramWithStatus

```typescript
interface ProgramWithStatus extends Program {
  status: 'DIFFUSÉ' | 'NON DIFFUSÉ'
  actualStartTime?: string  // Heure réelle de début (si différente)
  actualEndTime?: string    // Heure réelle de fin (si différente)
  notes?: string            // Notes additionnelles
}
```

### Incident

```typescript
interface Incident {
  time: string              // Heure de l'incident (HH:MM)
  type: string              // Type d'incident (RETARD, NON DIFFUSÉ, etc.)
  description: string       // Description détaillée
  programId?: string        // ID du programme concerné
  severity: 'MINEUR' | 'MAJEUR' | 'CRITIQUE'
}
```

## ⚠️ Règles Importantes

1. **Ne jamais supprimer une plage horaire vide** - Toutes les plages doivent être mentionnées
2. **Ne jamais masquer une absence de programme** - Les plages vides sont explicitement signalées
3. **Ton institutionnel strict** - Pas de ton marketing, uniquement factuel
4. **Statuts explicites** - DIFFUSÉ ou NON DIFFUSÉ pour chaque programme
5. **Remplissage automatique** - Mentionner Animation / Xassida / Auto-play pour les plages vides

## 🎨 Format de Sortie

### Telegram
- Format HTML avec emojis
- Sections délimitées par des séparateurs
- Lisible sur mobile et desktop

### Email
- Version HTML stylée avec CSS inline
- Version texte pour les clients sans HTML
- Design professionnel broadcast

## 📞 Support

Pour toute question ou problème, consulter la documentation principale du système d'alertes.

