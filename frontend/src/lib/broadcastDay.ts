/**
 * Correspondance entre un programme et un jour de la semaine.
 *
 * Les jours d'un programme arrivent sous deux formes : des libellés français
 * (« Dimanche », « Lundi »…) côté interface, et des index numériques 0–6
 * renvoyés par l'API (0 = dimanche). Les deux sont acceptées ici afin que cette
 * tolérance ne soit pas réécrite dans chaque vue.
 *
 * « Aujourd'hui » se détermine toujours à partir de l'horloge. Le jour
 * sélectionné ailleurs dans l'application (onglet de la vue semaine) ne doit
 * jamais entrer dans ce calcul : les deux notions avaient été confondues, ce qui
 * faisait apparaître les programmes du jour sélectionné dans les vues
 * « Aujourd'hui », « ON AIR », « Alertes » et Régie tablette.
 */

export const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

/** Libellé français du jour d'une date (par défaut : maintenant). */
export function getDayName(date: Date = new Date()): string {
  return DAYS_FR[date.getDay()]
}

/**
 * Vrai si le programme est diffusé le jour demandé.
 * @param dayIndex 0 = dimanche, … 6 = samedi
 */
export function isProgramOnDay(program: { days?: unknown } | null | undefined, dayIndex: number): boolean {
  const days = program?.days
  if (!Array.isArray(days)) return false

  const dayName = DAYS_FR[dayIndex]
  return days.some((day) => {
    if (typeof day === 'number') return day === dayIndex
    const value = String(day).trim()
    return (
      value === dayName ||
      value === String(dayIndex) ||
      value.toLowerCase() === dayName.toLowerCase()
    )
  })
}

/** Vrai si le programme est diffusé aujourd'hui, au sens de l'horloge. */
export function isProgramToday(
  program: { days?: unknown } | null | undefined,
  now: Date = new Date()
): boolean {
  return isProgramOnDay(program, now.getDay())
}
