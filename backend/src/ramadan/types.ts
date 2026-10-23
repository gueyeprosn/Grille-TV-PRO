/**
 * Types pour le système de templates Ramadan
 */

import { ProgramType, OpStatus } from '@prisma/client'

/**
 * Types de templates Ramadan disponibles
 */
export enum RamadanTemplateType {
  WEEK = 'WEEK',              // Semaine normale
  FRIDAY = 'FRIDAY',          // Vendredi (jour spécial)
  WEEKEND = 'WEEKEND',        // Week-end (Samedi-Dimanche)
  COMMERCIAL = 'COMMERCIAL',  // Template commercial/sponsorisé
  FALLBACK = 'FALLBACK',      // Template de secours/urgence
  DIASPORA = 'DIASPORA',      // Grille Internationale Diaspora (Europe/USA)
}

/**
 * Flags métier pour les programmes Ramadan
 */
export interface RamadanFlags {
  isRamadan: boolean          // Programme spécifique Ramadan
  isCritical: boolean         // Programme critique (Iftar, Tarawih, Suhur)
  isEvent: boolean            // Événement spécial (plateaux, directs)
  isCommercial: boolean       // Programme sponsorisé
  fallbackContent?: string    // Contenu de secours si trou de diffusion
}

/**
 * Programme Ramadan à générer
 */
export interface RamadanProgram {
  title: string
  category?: string
  type: ProgramType
  startTime: string          // Format HH:MM
  endTime: string            // Format HH:MM
  durationMin: number
  days: number[]             // 0=Dimanche, 1=Lundi, ..., 6=Samedi
  description?: string
  opStatus: OpStatus
  flags: RamadanFlags
}

/**
 * Configuration d'un template Ramadan
 */
export interface RamadanTemplate {
  id: string
  name: string
  type: RamadanTemplateType
  description: string
  programs: RamadanProgram[]
  metadata?: {
    version: string
    createdAt: Date
    updatedAt: Date
  }
}

/**
 * Options pour appliquer un template
 */
export interface ApplyTemplateOptions {
  gridId: string
  templateType: RamadanTemplateType
  startDate: Date
  endDate: Date
  userId: string
  overwriteExisting?: boolean  // Remplacer les programmes existants
}

/**
 * Résultat de l'application d'un template
 */
export interface ApplyTemplateResult {
  success: boolean
  programsCreated: number
  programsSkipped: number
  errors: string[]
  templateId: string
  templateName: string
}

