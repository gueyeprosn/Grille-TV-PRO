/**
 * Middlewares de validation pour les routes API
 * 
 * Utilise express-validator pour valider et nettoyer les entrées utilisateur
 */

import { body, oneOf, param, query, validationResult } from 'express-validator'
import type { Request, Response, NextFunction } from 'express'
import { ValidationError } from '../lib/errors.js'

/**
 * Middleware pour gérer les erreurs de validation
 */
export function handleValidationErrors(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.type === 'field' ? err.path : 'unknown',
      message: err.msg,
      value: err.type === 'field' ? err.value : undefined
    }))
    
    console.error('[VALIDATION] ❌ Erreurs de validation détectées:', JSON.stringify({
      path: req.path,
      method: req.method,
      errors: errorMessages,
      body: req.body
    }))
    
    throw new ValidationError('Erreurs de validation', errorMessages)
  }
  console.error('[VALIDATION] ✅ Validation réussie pour:', req.method, req.path)
  next()
}

// ============================================
// VALIDATION DES PARAMÈTRES D'URL
// ============================================

export const validateGridId = [
  param('gridId')
    .trim()
    .notEmpty()
    .withMessage('gridId est requis')
    .isLength({ min: 1, max: 100 })
    .withMessage('gridId doit faire entre 1 et 100 caractères')
]

export const validateProgramId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('ID du programme est requis')
    .isLength({ min: 1, max: 100 })
    .withMessage('ID doit faire entre 1 et 100 caractères')
]

export const validateGridIdParam = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('ID de la grille est requis')
    .isLength({ min: 1, max: 100 })
    .withMessage('ID doit faire entre 1 et 100 caractères')
]

// ============================================
// VALIDATION DES GRILLES
// ============================================

export const validateCreateGrid = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom de la grille est requis')
    .isLength({ min: 1, max: 200 })
    .withMessage('Le nom doit faire entre 1 et 200 caractères')
    .escape(),
  
  body('type')
    .optional()
    .isIn(['WEEKLY', 'DAILY', 'SPECIAL', 'RAMADAN'])
    .withMessage('type doit être WEEKLY, DAILY, SPECIAL ou RAMADAN'),
  
  body('startDate')
    .notEmpty()
    .withMessage('startDate est requis')
    .isISO8601()
    .withMessage('startDate doit être une date ISO8601 valide (YYYY-MM-DD)')
    .custom((value) => {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        throw new Error('startDate invalide')
      }
      return true
    }),
  
  body('endDate')
    .notEmpty()
    .withMessage('endDate est requis')
    .isISO8601()
    .withMessage('endDate doit être une date ISO8601 valide (YYYY-MM-DD)')
    .custom((value, { req }) => {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        throw new Error('endDate invalide')
      }
      if (req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('endDate doit être après startDate')
      }
      return true
    }),
  
  body('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
    .withMessage('status doit être DRAFT, PUBLISHED ou ARCHIVED')
]

export const validateUpdateGrid = [
  ...validateGridIdParam,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Le nom doit faire entre 1 et 200 caractères')
    .escape(),
  
  body('type')
    .optional()
    .isIn(['WEEKLY', 'DAILY', 'SPECIAL', 'RAMADAN'])
    .withMessage('type doit être WEEKLY, DAILY, SPECIAL ou RAMADAN'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate doit être une date ISO8601 valide')
    .custom((value) => {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        throw new Error('startDate invalide')
      }
      return true
    }),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate doit être une date ISO8601 valide')
    .custom((value, { req }) => {
      const date = new Date(value)
      if (isNaN(date.getTime())) {
        throw new Error('endDate invalide')
      }
      if (req.body.startDate && new Date(value) < new Date(req.body.startDate)) {
        throw new Error('endDate doit être après startDate')
      }
      return true
    }),
  
  body('status')
    .optional()
    .isIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
    .withMessage('status doit être DRAFT, PUBLISHED ou ARCHIVED')
]

// ============================================
// VALIDATION DES PROGRAMMES
// ============================================

export const validateCreateProgram = [
  ...validateGridId,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Le titre est requis')
    .isLength({ min: 1, max: 200 })
    .withMessage('Le titre doit faire entre 1 et 200 caractères')
    .escape(),
  
  body('startTime')
    .notEmpty()
    .withMessage('startTime est requis')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('startTime doit être au format HH:mm (ex: 10:30)'),
  
  body('endTime')
    .notEmpty()
    .withMessage('endTime est requis')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$|^24:00$/)
    .withMessage('endTime doit être au format HH:mm (ex: 11:30 ou 24:00)')
    .custom((endTime, { req }) => {
      if (req.body.startTime && endTime === req.body.startTime) {
        throw new Error('endTime doit être différent de startTime')
      }
      return true
    }),
  
  body('durationMin')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('durationMin doit être un entier entre 1 et 1440 minutes')
    .custom((duration, { req }) => {
      if (req.body.startTime && req.body.endTime) {
        const start = req.body.startTime.split(':').map(Number)
        const end = req.body.endTime.split(':').map(Number)
        const startMinutes = start[0] * 60 + start[1]
        let endMinutes = end[0] * 60 + end[1]
        if (endMinutes <= startMinutes) {
          endMinutes += 24 * 60
        }
        const calculatedDuration = endMinutes - startMinutes
        if (calculatedDuration <= 0) {
          throw new Error('La durée calculée est invalide')
        }
        if (duration && Math.abs(duration - calculatedDuration) > 5) {
          // Tolérance de 5 minutes
          console.warn(`⚠️  Durée fournie (${duration}) diffère de la durée calculée (${calculatedDuration})`)
        }
      }
      return true
    }),
  
  body('days')
    .isArray({ min: 1 })
    .withMessage('days doit être un tableau avec au moins un jour')
    .custom((days) => {
      const validDays = [0, 1, 2, 3, 4, 5, 6]
      if (!Array.isArray(days)) {
        throw new Error('days doit être un tableau')
      }
      if (days.length === 0) {
        throw new Error('days doit contenir au moins un jour')
      }
      const invalidDays = days.filter((d: any) => !validDays.includes(Number(d)))
      if (invalidDays.length > 0) {
        throw new Error(`Jours invalides: ${invalidDays.join(', ')}. Utilisez 0-6 (0=dimanche, 6=samedi)`)
      }
      // Vérifier les doublons
      const uniqueDays = [...new Set(days)]
      if (uniqueDays.length !== days.length) {
        throw new Error('days contient des doublons')
      }
      return true
    }),
  
  body('type')
    .optional()
    .isIn(['LIVE', 'REPLAY', 'PAD', 'ADS', 'SPECIAL'])
    .withMessage('type doit être LIVE, REPLAY, PAD, ADS ou SPECIAL'),
  
  body('typeDiffusion')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('typeDiffusion doit faire moins de 50 caractères')
    .escape(),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('category doit faire moins de 100 caractères')
    .escape(),
  
  body('categoryId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('categoryId doit faire moins de 100 caractères'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('description doit faire moins de 2000 caractères')
    .escape(),
  
  body('opStatus')
    .optional()
    .isIn(['DRAFT', 'PLANNED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'ON_AIR', 'DONE', 'CANCELED', 'AIRED', 'CANCELLED'])
    .withMessage('opStatus doit être DRAFT, PLANNED, CONFIRMED, IN_PRODUCTION, READY, ON_AIR, DONE, CANCELED, AIRED ou CANCELLED'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('color doit être un code couleur hexadécimal (ex: #FF5733)'),
  
  body('adsRequired')
    .optional()
    .isBoolean()
    .withMessage('adsRequired doit être un booléen')
]

export const validateUpdateProgram = [
  ...validateProgramId,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Le titre doit faire entre 1 et 200 caractères')
    .escape(),
  
  body('startTime')
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('startTime doit être au format HH:mm'),
  
  body('endTime')
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$|^24:00$/)
    .withMessage('endTime doit être au format HH:mm (ex: 11:30 ou 24:00)')
    .custom((endTime, { req }) => {
      if (req.body.startTime && endTime === req.body.startTime) {
        throw new Error('endTime doit être différent de startTime')
      }
      return true
    }),
  
  body('durationMin')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('durationMin doit être un entier entre 1 et 1440 minutes'),
  
  body('days')
    .optional()
    .isArray({ min: 1 })
    .withMessage('days doit être un tableau avec au moins un jour')
    .custom((days) => {
      if (!Array.isArray(days)) {
        throw new Error('days doit être un tableau')
      }
      const validDays = [0, 1, 2, 3, 4, 5, 6]
      const invalidDays = days.filter((d: any) => !validDays.includes(Number(d)))
      if (invalidDays.length > 0) {
        throw new Error(`Jours invalides: ${invalidDays.join(', ')}`)
      }
      return true
    }),
  
  body('type')
    .optional()
    .isIn(['LIVE', 'REPLAY', 'PAD', 'ADS', 'SPECIAL'])
    .withMessage('type invalide'),

  body('typeDiffusion')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('typeDiffusion doit faire moins de 50 caractères'),
  
  body('category')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .escape(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .escape(),
  
  body('opStatus')
    .not().exists()
    .withMessage('Le statut se modifie sur une diffusion datée, pas sur la fiche récurrente'),
  
  body('color')
    .optional()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('color doit être un code couleur hexadécimal')
]

export const validateProgramStatus = [
  ...validateProgramId,
  body('opStatus')
    .notEmpty()
    .withMessage('opStatus est requis')
    .isIn(['DRAFT', 'PLANNED', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'ON_AIR', 'DONE', 'CANCELED', 'AIRED', 'CANCELLED'])
    .withMessage('opStatus invalide')
]

export const validateOccurrenceStatus = [
  ...validateProgramId,
  param('serviceDate')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('serviceDate doit être au format YYYY-MM-DD')
    .custom((value: string) => {
      const date = new Date(`${value}T00:00:00.000Z`)
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
        throw new Error('serviceDate doit être une date réelle au format YYYY-MM-DD')
      }
      return true
    }),
  body('status')
    .notEmpty()
    .withMessage('status est requis')
    .isIn(['PLANNED', 'ON_AIR', 'AIRED', 'CANCELLED'])
    .withMessage('status doit être PLANNED, ON_AIR, AIRED ou CANCELLED'),
]

// ============================================
// VALIDATION DES INCIDENTS
// ============================================

export const validateCreateIncident = [
  ...validateGridId,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Le titre est requis')
    .isLength({ min: 1, max: 200 })
    .withMessage('Le titre doit faire entre 1 et 200 caractères')
    .escape(),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('description doit faire moins de 2000 caractères')
    .escape(),
  
  body('severity')
    .optional()
    .isIn(['CRITICAL', 'MAJOR', 'MINOR', 'INFO'])
    .withMessage('severity doit être CRITICAL, MAJOR, MINOR ou INFO'),
  
  body('status')
    .optional()
    .isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
    .withMessage('status invalide'),
  
  body('occurredAt')
    .notEmpty()
    .withMessage('occurredAt est requis')
    .isISO8601()
    .withMessage('occurredAt doit être une date ISO8601 valide'),
  
  body('programId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('programId invalide')
]

// ============================================
// VALIDATION DES ÉCARTS
// ============================================

export const validateCreateDeviation = [
  ...validateGridId,
  body('programId')
    .optional()
    .trim()
    .isLength({ max: 100 }),
  
  body('plannedTime')
    .notEmpty()
    .withMessage('plannedTime est requis')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('plannedTime doit être au format HH:mm'),
  
  body('actualTime')
    .notEmpty()
    .withMessage('actualTime est requis')
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('actualTime doit être au format HH:mm'),
  
  body('plannedDuration')
    .notEmpty()
    .withMessage('plannedDuration est requis')
    .isInt({ min: 1, max: 1440 })
    .withMessage('plannedDuration doit être entre 1 et 1440 minutes'),
  
  body('actualDuration')
    .notEmpty()
    .withMessage('actualDuration est requis')
    .isInt({ min: 1, max: 1440 })
    .withMessage('actualDuration doit être entre 1 et 1440 minutes'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .escape()
]

// ============================================
// VALIDATION DES PUBLICITÉS
// ============================================

export const validateCreateAdLog = [
  ...validateGridId,
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Le titre est requis')
    .isLength({ min: 1, max: 200 })
    .escape(),
  
  body('adType')
    .optional()
    .isIn(['SPOT', 'SPONSORSHIP', 'BANNER', 'PRODUCT_PLACEMENT'])
    .withMessage('adType invalide'),
  
  body('durationSec')
    .notEmpty()
    .withMessage('durationSec est requis')
    .isInt({ min: 1, max: 3600 })
    .withMessage('durationSec doit être entre 1 et 3600 secondes'),
  
  body('scheduledAt')
    .notEmpty()
    .withMessage('scheduledAt est requis')
    .isISO8601()
    .withMessage('scheduledAt doit être une date ISO8601 valide'),
  
  body('status')
    .optional()
    .isIn(['SCHEDULED', 'AIRED', 'CANCELLED', 'MISSED'])
    .withMessage('status invalide'),
  
  body('programId')
    .optional()
    .trim()
    .isLength({ max: 100 })
]

// ============================================
// VALIDATION DES JOURNAUX DE BORD
// ============================================

export const validateCreateShiftLog = [
  ...validateGridId,
  body('shiftDate')
    .notEmpty()
    .withMessage('shiftDate est requis')
    .isISO8601()
    .withMessage('shiftDate doit être une date ISO8601 valide'),
  
  body('shiftType')
    .optional()
    .isIn(['DAY', 'EVENING', 'NIGHT', 'WEEKEND'])
    .withMessage('shiftType invalide'),
  
  body('operatorName')
    .trim()
    .notEmpty()
    .withMessage('operatorName est requis')
    .isLength({ min: 1, max: 100 })
    .withMessage('operatorName doit faire entre 1 et 100 caractères')
    .escape(),
  
  body('activities')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .escape(),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .escape(),
  
  body('issues')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .escape(),
  
  body('handoverTo')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .escape()
]

// ============================================
// VALIDATION DES RÈGLES DE NOTIFICATION
// ============================================

// L'interface envoie `event` et un délai en secondes ; `eventType` et
// `throttleMin` restent acceptés pour les appels directs à l'API.
const notificationEventRule = oneOf(
  [
    body('event').trim().notEmpty().isLength({ min: 1, max: 100 }),
    body('eventType').trim().notEmpty().isLength({ min: 1, max: 100 }),
  ],
  { message: 'event (ou eventType) est requis et doit faire entre 1 et 100 caractères' }
)

const notificationOptionalFields = [
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('enabled doit être un booléen'),

  body('throttlingSec')
    .optional()
    .isInt({ min: 0, max: 3600 })
    .withMessage('throttlingSec doit être entre 0 et 3600 secondes'),

  body('throttleMin')
    .optional()
    .isInt({ min: 0, max: 1440 })
    .withMessage('throttleMin doit être entre 0 et 1440 minutes'),

  body('target')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('target invalide'),

  body('channelId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('channelId invalide'),
]

export const validateCreateNotificationRule = [
  notificationEventRule,

  body('chatId')
    .trim()
    .notEmpty()
    .withMessage('chatId est requis')
    .isLength({ min: 1, max: 100 })
    .withMessage('chatId invalide'),

  ...notificationOptionalFields
]

// À la modification, l'interface peut n'envoyer qu'une partie de la règle
// (l'activation/désactivation par exemple) : chaque champ est donc optionnel.
export const validateUpdateNotificationRule = [
  body('event')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('event doit faire entre 1 et 100 caractères'),

  body('eventType')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('eventType doit faire entre 1 et 100 caractères'),

  body('chatId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('chatId invalide'),

  ...notificationOptionalFields
]

