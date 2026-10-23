/**
 * Templates de grilles Ramadan
 * Génération automatique de programmes réalistes
 */

import { RamadanTemplateType } from './types.js'
import type { RamadanTemplate, RamadanProgram } from './types.js'
import {
  createSuhurProgram,
  createFajrProgram,
  createTafsirProgram,
  createPreIftarPlateauProgram,
  createIftarProgram,
  createTarawihProgram,
  createXassidaProgram,
  createCommercialProgram,
  createFallbackProgram,
  createGenericProgram,
} from './programs.js'
import { ProgramType } from '@prisma/client'

/**
 * Template SEMaine normale (Lundi-Jeudi)
 */
export function getWeekTemplate(): RamadanTemplate {
  const programs: RamadanProgram[] = [
    // Nuit / Aube
    createSuhurProgram('03:00', '04:00', [1, 2, 3, 4]), // Lundi-Jeudi
    createFajrProgram('04:00', '04:30', [1, 2, 3, 4]),
    createTafsirProgram('04:30', '05:30', [1, 2, 3, 4]),
    
    // Matin
    createXassidaProgram('05:30', '06:00', [1, 2, 3, 4]),
    createGenericProgram('Émission Matinale', ProgramType.REPLAY, '06:00', '08:00', [1, 2, 3, 4], 'Magazine'),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '08:00', '09:00', [1, 2, 3, 4], 'Série'),
    createGenericProgram('Documentaire', ProgramType.REPLAY, '09:00', '10:00', [1, 2, 3, 4], 'Documentaire'),
    createXassidaProgram('10:00', '11:00', [1, 2, 3, 4]),
    
    // Midi
    createGenericProgram('Magazine Midi', ProgramType.REPLAY, '11:00', '12:00', [1, 2, 3, 4], 'Magazine'),
    createTafsirProgram('12:00', '13:00', [1, 2, 3, 4]),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '13:00', '14:00', [1, 2, 3, 4], 'Série'),
    
    // Après-midi
    createXassidaProgram('14:00', '15:00', [1, 2, 3, 4]),
    createGenericProgram('Documentaire', ProgramType.REPLAY, '15:00', '16:00', [1, 2, 3, 4], 'Documentaire'),
    createGenericProgram('Émission Jeunesse', ProgramType.REPLAY, '16:00', '17:00', [1, 2, 3, 4], 'Jeunesse'),
    
    // Pré-Iftar
    createPreIftarPlateauProgram('17:00', '18:30', [1, 2, 3, 4]),
    
    // Iftar
    createIftarProgram('18:30', '19:00', [1, 2, 3, 4]),
    
    // Soir
    createGenericProgram('Magazine Soir', ProgramType.REPLAY, '19:00', '20:00', [1, 2, 3, 4], 'Magazine'),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '20:00', '21:00', [1, 2, 3, 4], 'Série'),
    
    // Tarawih
    createTarawihProgram('21:00', '22:30', [1, 2, 3, 4]),
    
    // Nuit
    createXassidaProgram('22:30', '23:30', [1, 2, 3, 4]),
    createGenericProgram('Émission Nuit', ProgramType.REPLAY, '23:30', '00:30', [1, 2, 3, 4], 'Magazine'),
    createFallbackProgram('00:30', '03:00', [1, 2, 3, 4]),
  ]

  return {
    id: 'ramadan-week',
    name: 'Template Ramadan - Semaine',
    type: RamadanTemplateType.WEEK,
    description: 'Grille type pour les jours de semaine (Lundi-Jeudi)',
    programs,
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

/**
 * Template VENDREDI (jour spécial)
 */
export function getFridayTemplate(): RamadanTemplate {
  const programs: RamadanProgram[] = [
    // Nuit / Aube
    createSuhurProgram('03:00', '04:00', [5]), // Vendredi
    createFajrProgram('04:00', '04:30', [5]),
    createTafsirProgram('04:30', '05:30', [5]),
    
    // Matin
    createXassidaProgram('05:30', '06:00', [5]),
    createGenericProgram('Émission Matinale', ProgramType.REPLAY, '06:00', '08:00', [5], 'Magazine'),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '08:00', '09:00', [5], 'Série'),
    createTafsirProgram('09:00', '10:00', [5]),
    
    // Pré-Khutba
    createGenericProgram('Préparation Khutba', ProgramType.LIVE, '10:00', '12:00', [5], 'Religieux'),
    
    // Khutba (Sermon du Vendredi)
    createGenericProgram('Khutba du Vendredi EN DIRECT', ProgramType.LIVE, '12:00', '13:00', [5], 'Religieux'),
    
    // Après-midi
    createGenericProgram('Magazine Vendredi', ProgramType.REPLAY, '13:00', '14:00', [5], 'Magazine'),
    createXassidaProgram('14:00', '15:00', [5]),
    createGenericProgram('Documentaire', ProgramType.REPLAY, '15:00', '16:00', [5], 'Documentaire'),
    createGenericProgram('Émission Spéciale', ProgramType.REPLAY, '16:00', '17:00', [5], 'Magazine'),
    
    // Pré-Iftar
    createPreIftarPlateauProgram('17:00', '18:30', [5]),
    
    // Iftar
    createIftarProgram('18:30', '19:00', [5]),
    
    // Soir
    createGenericProgram('Magazine Soir', ProgramType.REPLAY, '19:00', '20:00', [5], 'Magazine'),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '20:00', '21:00', [5], 'Série'),
    
    // Tarawih
    createTarawihProgram('21:00', '22:30', [5]),
    
    // Nuit
    createXassidaProgram('22:30', '23:30', [5]),
    createGenericProgram('Émission Nuit', ProgramType.REPLAY, '23:30', '00:30', [5], 'Magazine'),
    createFallbackProgram('00:30', '03:00', [5]),
  ]

  return {
    id: 'ramadan-friday',
    name: 'Template Ramadan - Vendredi',
    type: RamadanTemplateType.FRIDAY,
    description: 'Grille spéciale pour le Vendredi (Khutba inclus)',
    programs,
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

/**
 * Template WEEK-END (Samedi-Dimanche)
 */
export function getWeekendTemplate(): RamadanTemplate {
  const programs: RamadanProgram[] = [
    // Nuit / Aube
    createSuhurProgram('03:00', '04:00', [0, 6]), // Dimanche, Samedi
    createFajrProgram('04:00', '04:30', [0, 6]),
    createTafsirProgram('04:30', '05:30', [0, 6]),
    
    // Matin
    createXassidaProgram('05:30', '06:00', [0, 6]),
    createGenericProgram('Émission Matinale', ProgramType.REPLAY, '06:00', '08:00', [0, 6], 'Magazine'),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '08:00', '09:00', [0, 6], 'Série'),
    createGenericProgram('Documentaire', ProgramType.REPLAY, '09:00', '10:00', [0, 6], 'Documentaire'),
    createXassidaProgram('10:00', '11:00', [0, 6]),
    
    // Midi
    createGenericProgram('Magazine Week-end', ProgramType.REPLAY, '11:00', '12:00', [0, 6], 'Magazine'),
    createTafsirProgram('12:00', '13:00', [0, 6]),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '13:00', '14:00', [0, 6], 'Série'),
    
    // Après-midi
    createXassidaProgram('14:00', '15:00', [0, 6]),
    createGenericProgram('Documentaire', ProgramType.REPLAY, '15:00', '16:00', [0, 6], 'Documentaire'),
    createGenericProgram('Émission Jeunesse', ProgramType.REPLAY, '16:00', '17:00', [0, 6], 'Jeunesse'),
    
    // Pré-Iftar
    createPreIftarPlateauProgram('17:00', '18:30', [0, 6]),
    
    // Iftar
    createIftarProgram('18:30', '19:00', [0, 6]),
    
    // Soir
    createGenericProgram('Magazine Soir', ProgramType.REPLAY, '19:00', '20:00', [0, 6], 'Magazine'),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '20:00', '21:00', [0, 6], 'Série'),
    
    // Tarawih
    createTarawihProgram('21:00', '22:30', [0, 6]),
    
    // Nuit
    createXassidaProgram('22:30', '23:30', [0, 6]),
    createGenericProgram('Émission Nuit', ProgramType.REPLAY, '23:30', '00:30', [0, 6], 'Magazine'),
    createFallbackProgram('00:30', '03:00', [0, 6]),
  ]

  return {
    id: 'ramadan-weekend',
    name: 'Template Ramadan - Week-end',
    type: RamadanTemplateType.WEEKEND,
    description: 'Grille pour le week-end (Samedi-Dimanche)',
    programs,
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

/**
 * Template COMMERCIAL (sponsorisé)
 */
export function getCommercialTemplate(): RamadanTemplate {
  const programs: RamadanProgram[] = [
    // Nuit / Aube
    createSuhurProgram('03:00', '04:00', [1, 2, 3, 4, 5]),
    createFajrProgram('04:00', '04:30', [1, 2, 3, 4, 5]),
    createTafsirProgram('04:30', '05:30', [1, 2, 3, 4, 5]),
    
    // Matin
    createXassidaProgram('05:30', '06:00', [1, 2, 3, 4, 5]),
    createCommercialProgram('Émission Matinale Sponsor', '06:00', '08:00', [1, 2, 3, 4, 5], 'Sponsor Principal'),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '08:00', '09:00', [1, 2, 3, 4, 5], 'Série'),
    createCommercialProgram('Documentaire Sponsor', '09:00', '10:00', [1, 2, 3, 4, 5], 'Sponsor Secondaire'),
    createXassidaProgram('10:00', '11:00', [1, 2, 3, 4, 5]),
    
    // Midi
    createCommercialProgram('Magazine Midi Sponsor', '11:00', '12:00', [1, 2, 3, 4, 5], 'Sponsor Principal'),
    createTafsirProgram('12:00', '13:00', [1, 2, 3, 4, 5]),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '13:00', '14:00', [1, 2, 3, 4, 5], 'Série'),
    
    // Après-midi
    createXassidaProgram('14:00', '15:00', [1, 2, 3, 4, 5]),
    createCommercialProgram('Documentaire Sponsor', '15:00', '16:00', [1, 2, 3, 4, 5], 'Sponsor Secondaire'),
    createGenericProgram('Émission Jeunesse', ProgramType.REPLAY, '16:00', '17:00', [1, 2, 3, 4, 5], 'Jeunesse'),
    
    // Pré-Iftar (sponsorisé)
    createPreIftarPlateauProgram('17:00', '18:30', [1, 2, 3, 4, 5], true),
    
    // Iftar
    createIftarProgram('18:30', '19:00', [1, 2, 3, 4, 5]),
    
    // Soir
    createCommercialProgram('Magazine Soir Sponsor', '19:00', '20:00', [1, 2, 3, 4, 5], 'Sponsor Principal'),
    createGenericProgram('Série Ramadan', ProgramType.REPLAY, '20:00', '21:00', [1, 2, 3, 4, 5], 'Série'),
    
    // Tarawih
    createTarawihProgram('21:00', '22:30', [1, 2, 3, 4, 5]),
    
    // Nuit
    createXassidaProgram('22:30', '23:30', [1, 2, 3, 4, 5]),
    createGenericProgram('Émission Nuit', ProgramType.REPLAY, '23:30', '00:30', [1, 2, 3, 4, 5], 'Magazine'),
    createFallbackProgram('00:30', '03:00', [1, 2, 3, 4, 5]),
  ]

  return {
    id: 'ramadan-commercial',
    name: 'Template Ramadan - Commercial',
    type: RamadanTemplateType.COMMERCIAL,
    description: 'Grille avec programmes sponsorisés',
    programs,
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

/**
 * Template FALLBACK / URGENCE (minimal)
 */
export function getFallbackTemplate(): RamadanTemplate {
  const programs: RamadanProgram[] = [
    // Programmes essentiels uniquement
    createSuhurProgram('03:00', '04:00', [0, 1, 2, 3, 4, 5, 6]),
    createFajrProgram('04:00', '04:30', [0, 1, 2, 3, 4, 5, 6]),
    createTafsirProgram('04:30', '05:30', [0, 1, 2, 3, 4, 5, 6]),
    
    // Fallback pour le reste
    createFallbackProgram('05:30', '17:00', [0, 1, 2, 3, 4, 5, 6]),
    
    // Pré-Iftar
    createPreIftarPlateauProgram('17:00', '18:30', [0, 1, 2, 3, 4, 5, 6]),
    
    // Iftar
    createIftarProgram('18:30', '19:00', [0, 1, 2, 3, 4, 5, 6]),
    
    // Fallback soir
    createFallbackProgram('19:00', '21:00', [0, 1, 2, 3, 4, 5, 6]),
    
    // Tarawih
    createTarawihProgram('21:00', '22:30', [0, 1, 2, 3, 4, 5, 6]),
    
    // Fallback nuit
    createFallbackProgram('22:30', '03:00', [0, 1, 2, 3, 4, 5, 6]),
  ]

  return {
    id: 'ramadan-fallback',
    name: 'Template Ramadan - Fallback',
    type: RamadanTemplateType.FALLBACK,
    description: 'Template minimal de secours (programmes essentiels uniquement)',
    programs,
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

/**
 * Template DIASPORA (Grille Internationale Diaspora Europe/USA)
 */
export function getDiasporaTemplate(): RamadanTemplate {
  const programs: RamadanProgram[] = [
    // Nuit / Aube
    createGenericProgram('LECTURE DU SAINT CORAN', ProgramType.LIVE, '05:00', '05:30', [0, 1, 2, 3, 4, 5, 6], 'Coran'),
    createGenericProgram('TAFSIR & COMMENTAIRE DU CORAN', ProgramType.LIVE, '05:30', '06:00', [0, 1, 2, 3, 4, 5, 6], 'Tafsir'),
    createGenericProgram('XASSIDA & PANÉGYRIQUES', ProgramType.REPLAY, '06:00', '06:30', [0, 1, 2, 3, 4, 5, 6], 'Xassida'),
    
    // Matin (Lundi-Vendredi)
    createGenericProgram('ENSEIGNEMENT ISLAMIQUE (FIQH & AQIDA)', ProgramType.LIVE, '06:30', '07:30', [1, 2, 3, 4, 5], 'Fiqh'),
    createGenericProgram('MATINALE SÉNÉGAL', ProgramType.LIVE, '07:30', '08:30', [1, 2, 3, 4, 5], 'Information'),
    createGenericProgram('JOURNAL DE LA DIASPORA', ProgramType.REPLAY, '08:30', '09:00', [1, 2, 3, 4, 5], 'Diaspora'),
    createGenericProgram('FEMMES & SOCIÉTÉ', ProgramType.REPLAY, '09:00', '10:00', [1, 2, 3, 4, 5], 'Société'),
    createGenericProgram('ISLAM & MODERNITÉ', ProgramType.LIVE, '10:00', '11:00', [1, 3, 5], 'Débat'),
    createGenericProgram('HISTOIRE DU SÉNÉGAL', ProgramType.REPLAY, '11:00', '12:00', [1, 2, 3, 4, 5], 'Culture'),
    
    // Midi
    createGenericProgram('JOURNAL MIDI', ProgramType.LIVE, '12:00', '12:30', [1, 2, 3, 4, 5], 'Information'),
    createGenericProgram('CULTURE SÉNÉGALAISE', ProgramType.REPLAY, '12:30', '13:30', [1, 2, 3, 4, 5], 'Culture'),
    createGenericProgram('DIASPORA CONNECT', ProgramType.LIVE, '13:30', '15:00', [2, 4], 'Diaspora'),
    
    // Après-midi
    createGenericProgram('REDIFFUSIONS SÉLECTIONNÉES', ProgramType.REPLAY, '15:00', '17:00', [1, 2, 3, 4, 5], 'Replay'),
    createGenericProgram('JEUNESSE & VALEURS', ProgramType.LIVE, '17:00', '18:00', [1, 2, 3, 4, 5], 'Éducation'),
    
    // Soir (Plateaux sponsorisés)
    createGenericProgram('PLATEAU RELIGIEUX & CULTUREL', ProgramType.LIVE, '18:00', '19:00', [1, 2, 3, 4, 5], 'Religion'),
    createGenericProgram('JOURNAL DU SOIR', ProgramType.LIVE, '19:00', '19:30', [1, 2, 3, 4, 5], 'Information'),
    createGenericProgram('DÉCRYPTAGE SÉNÉGAL', ProgramType.LIVE, '19:30', '20:00', [1, 2, 3, 4, 5], 'Analyse'),
    createGenericProgram('GRAND PLATEAU SÉNÉGAL', ProgramType.LIVE, '20:00', '21:30', [1, 3, 5], 'Plateau'),
    createGenericProgram('SÉNÉGAL GLOBAL (DIASPORA)', ProgramType.LIVE, '21:30', '22:30', [2, 4], 'Diaspora'),
    
    // Nuit
    createGenericProgram('MESSAGE SPIRITUEL DU SOIR', ProgramType.REPLAY, '22:30', '23:00', [0, 1, 2, 3, 4, 5, 6], 'Religion'),
    createGenericProgram('LECTURE CORANIQUE CONTINUE', ProgramType.REPLAY, '23:00', '02:00', [0, 1, 2, 3, 4, 5, 6], 'Coran'),
    createGenericProgram('XASSIDA & INVOCATIONS', ProgramType.REPLAY, '02:00', '05:00', [0, 1, 2, 3, 4, 5, 6], 'Xassida'),
  ]

  // Marquer les plateaux comme commerciaux/événements et désactiver le flag Ramadan
  programs.forEach(p => {
    if (p.title.includes('PLATEAU')) {
      p.flags.isCommercial = true
      p.flags.isEvent = true
    }
    // Diaspora n'est pas spécifique Ramadan
    p.flags.isRamadan = false
    // Les plateaux sont des événements critiques
    if (p.title.includes('GRAND PLATEAU') || p.title.includes('PLATEAU RELIGIEUX')) {
      p.flags.isCritical = true
    }
  })

  return {
    id: 'diaspora-internationale',
    name: 'Grille Internationale Diaspora (Europe / USA)',
    type: RamadanTemplateType.DIASPORA,
    description: 'Version commerciale premium avec sponsoring & plateaux pour la diaspora en Europe et USA',
    programs,
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }
}

/**
 * Récupère un template par type
 */
export function getTemplate(type: RamadanTemplateType): RamadanTemplate {
  switch (type) {
    case RamadanTemplateType.WEEK:
      return getWeekTemplate()
    case RamadanTemplateType.FRIDAY:
      return getFridayTemplate()
    case RamadanTemplateType.WEEKEND:
      return getWeekendTemplate()
    case RamadanTemplateType.COMMERCIAL:
      return getCommercialTemplate()
    case RamadanTemplateType.FALLBACK:
      return getFallbackTemplate()
    case RamadanTemplateType.DIASPORA:
      return getDiasporaTemplate()
    default:
      return getFallbackTemplate()
  }
}

/**
 * Liste tous les templates disponibles
 */
export function getAllTemplates(): RamadanTemplate[] {
  return [
    getWeekTemplate(),
    getFridayTemplate(),
    getWeekendTemplate(),
    getCommercialTemplate(),
    getFallbackTemplate(),
    getDiasporaTemplate(),
  ]
}

