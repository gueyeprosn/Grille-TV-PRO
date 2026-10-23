/**
 * Construction d'alertes mobiles à partir des programmes de la grille.
 *
 * Les alertes générées sont :
 * - type 'on-air' : programme dont le statut est ON_AIR (diffusion en cours)
 * - type 'preparation' : programme qui commence dans les 30 minutes
 * - type 'anomaly' : programme en statut DELAYED ou OVERRUN
 *
 * Les programmes AIRED (déjà diffusés) ne génèrent PAS d'alerte ON AIR.
 */

export interface MobileAlert {
  id: string
  type: 'preparation' | 'on-air' | 'anomaly' | 'warning'
  title: string
  time: string
  message?: string
  programTitle?: string
}

import { DAYS_FR, isProgramToday } from './broadcastDay'

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Le jour retenu est celui de l'horloge. Le jour sélectionné dans la vue semaine
// était accepté ici, ce qui produisait des alertes pour un autre jour.
function isTodayProgram(program: { days?: string[] }, now: Date): boolean {
  return isProgramToday(program, now)
}

/**
 * Construit la liste des alertes mobiles à partir des programmes de la grille.
 * Ne génère aucune alerte "en dur" : toutes les alertes dérivent des données programmes.
 */
export function buildMobileAlerts(
  programs: any[],
  currentDay: string,
  now: Date = new Date()
): MobileAlert[] {
  const alerts: MobileAlert[] = []
  const todayIndex = new Date().getDay()
  const todayName = DAYS_FR[todayIndex]
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const todayPrograms = programs.filter((p) => isTodayProgram(p, now))

  for (const p of todayPrograms) {
    const startMinutes = toMinutes(p.start || '00:00')
    const endMinutes = p.end ? toMinutes(p.end) : startMinutes + (p.duration || 60)

    // 1. Alerte ON AIR : programme en cours de diffusion (statut ON_AIR uniquement, pas AIRED)
    if (p.opStatus === 'ON_AIR' && startMinutes <= currentMinutes && currentMinutes < endMinutes) {
      alerts.push({
        id: `on-air-${p.id}`,
        type: 'on-air',
        title: `En direct : ${p.title}`,
        time: formatTime(startMinutes),
        message: `Diffusion en cours${p.category ? ` — ${p.category}` : ''}`,
        programTitle: p.title,
      })
      continue
    }

    // 2. Alerte Préparation : programme qui commence dans les 30 minutes
    const minutesUntilStart = startMinutes - currentMinutes
    if (minutesUntilStart > 0 && minutesUntilStart <= 30 && p.opStatus !== 'ON_AIR') {
      alerts.push({
        id: `prep-${p.id}`,
        type: 'preparation',
        title: `Préparation : ${p.title}`,
        time: formatTime(startMinutes),
        message: `Début dans ${minutesUntilStart} min${p.category ? ` — ${p.category}` : ''}`,
        programTitle: p.title,
      })
      continue
    }

    // 3. Alerte Anomalie : programme en retard ou dépassement
    if (p.opStatus === 'DELAYED' || p.opStatus === 'OVERRUN') {
      alerts.push({
        id: `anomaly-${p.id}`,
        type: 'anomaly',
        title: `Anomalie : ${p.title}`,
        time: formatTime(startMinutes),
        message:
          p.opStatus === 'DELAYED'
            ? `Programme en retard${p.category ? ` — ${p.category}` : ''}`
            : `Dépassement d'horaire${p.category ? ` — ${p.category}` : ''}`,
        programTitle: p.title,
      })
    }
  }

  // Trier par priorité : on-air > anomaly > preparation > warning
  const typeOrder: Record<string, number> = { 'on-air': 0, anomaly: 1, preparation: 2, warning: 3 }
  return alerts.sort((a, b) => (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99))
}
