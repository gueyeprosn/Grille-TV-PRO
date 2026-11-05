/**
 * Sélection des programmes d'antenne : grille du jour, programme en cours,
 * programme suivant.
 *
 * Cette logique est isolée des routes pour pouvoir être vérifiée sans serveur
 * ni authentification. Les routes `/api/v3/broadcast/*` ne font plus que
 * résoudre la grille, appeler ces fonctions et formater la réponse.
 *
 * Le jour et l'heure de référence viennent du fuseau d'antenne, pas de
 * l'horloge du serveur, et les programmes à cheval sur minuit appartiennent au
 * jour où ils ont commencé — mêmes règles que `onAirCalculator`.
 */

import { getBroadcastTime, timeToMinutes, isDayInSchedule } from './onAirCalculator.js'

export const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const FUSEAU_ANTENNE = 'Africa/Dakar'

/** Programme tel que Prisma le stocke. */
export interface ProgrammePrisma {
  id: string
  title: string
  startTime: string
  endTime: string
  durationMin: number
  days: number[]
  category?: string | null
  type?: string | null
  typeDiffusion?: string | null
  opStatus?: string | null
  description?: string | null
}

/**
 * Forme attendue par les vues (`start`, `end`, `duration`, jours en libellés).
 * Les vues mobiles et Régie consomment directement la réponse de ces routes,
 * sans passer par la conversion de `useGridPrograms`.
 */
export function toFrontendProgram(p: ProgrammePrisma) {
  return {
    id: p.id,
    title: p.title,
    start: p.startTime,
    end: p.endTime,
    duration: p.durationMin,
    days: (p.days ?? []).map((d) => DAYS_FR[d] ?? DAYS_FR[0]),
    category: p.category ?? '',
    type: p.type ?? undefined,
    typeDiffusion: p.typeDiffusion ?? undefined,
    opStatus: p.opStatus ?? undefined,
    description: p.description ?? undefined,
  }
}

/** Jour (0 = dimanche) et minutes écoulées, dans le fuseau d'antenne. */
export function momentAntenne(now: Date = new Date(), timezone: string = FUSEAU_ANTENNE) {
  const { dayIndex, minutes } = getBroadcastTime(now, timezone)
  return { dayIndex: dayIndex ?? now.getDay(), minutes }
}

function traverseMinuit(p: ProgrammePrisma): boolean {
  return timeToMinutes(p.endTime) <= timeToMinutes(p.startTime)
}

function parHeureDeDebut(a: ProgrammePrisma, b: ProgrammePrisma): number {
  return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
}

/**
 * Programmes diffusés le jour demandé, triés par heure de début.
 * Un programme de nuit reste rattaché au jour où il commence.
 */
export function selectDayPrograms(programs: ProgrammePrisma[], dayIndex: number): ProgrammePrisma[] {
  return programs.filter((p) => isDayInSchedule(dayIndex, p.days)).sort(parHeureDeDebut)
}

/** Programmes de la journée d'antenne en cours. */
export function selectTodayPrograms(
  programs: ProgrammePrisma[],
  now: Date = new Date(),
  timezone: string = FUSEAU_ANTENNE
): ProgrammePrisma[] {
  const { dayIndex } = momentAntenne(now, timezone)
  return selectDayPrograms(programs, dayIndex)
}

/**
 * Programme actuellement à l'antenne, ou null.
 * Un choix explicite de la régie (`MANUAL_OVERRIDE`) l'emporte sur l'horaire.
 */
export function selectOnAirProgram(
  programs: ProgrammePrisma[],
  now: Date = new Date(),
  timezone: string = FUSEAU_ANTENNE
): ProgrammePrisma | null {
  const { dayIndex, minutes } = momentAntenne(now, timezone)
  const veille = (dayIndex + 6) % 7

  const enCours = programs.filter((p) => {
    const debut = timeToMinutes(p.startTime)
    const fin = timeToMinutes(p.endTime)

    if (!traverseMinuit(p)) {
      return isDayInSchedule(dayIndex, p.days) && minutes >= debut && minutes < fin
    }
    // À cheval sur minuit : soit la part du soir, soit celle du petit matin,
    // qui appartient au jour de la veille.
    if (minutes >= debut) return isDayInSchedule(dayIndex, p.days)
    return minutes < fin && isDayInSchedule(veille, p.days)
  })

  if (enCours.length === 0) return null

  const choixRegie = enCours.find((p) => p.opStatus === 'MANUAL_OVERRIDE')
  if (choixRegie) return choixRegie

  // Plusieurs programmes se chevauchent : le plus récemment commencé est à l'antenne.
  return enCours.sort((a, b) => timeToMinutes(b.startTime) - timeToMinutes(a.startTime))[0] ?? null
}

/**
 * Prochain programme à commencer.
 * Si la journée est terminée, la recherche se poursuit sur les jours suivants :
 * à 23:50, le conducteur doit annoncer le premier programme de demain.
 */
export function selectNextProgram(
  programs: ProgrammePrisma[],
  now: Date = new Date(),
  timezone: string = FUSEAU_ANTENNE
): ProgrammePrisma | null {
  const { dayIndex, minutes } = momentAntenne(now, timezone)

  const restantAujourdhui = selectDayPrograms(programs, dayIndex).find(
    (p) => timeToMinutes(p.startTime) > minutes
  )
  if (restantAujourdhui) return restantAujourdhui

  for (let decalage = 1; decalage <= 7; decalage++) {
    const jour = (dayIndex + decalage) % 7
    const premier = selectDayPrograms(programs, jour)[0]
    if (premier) return premier
  }
  return null
}
