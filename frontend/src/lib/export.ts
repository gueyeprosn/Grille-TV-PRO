import { DAYS } from '../legacy/config'

interface Program {
  id: string
  title: string
  category: string
  typeDiffusion?: string
  start: string
  end?: string
  duration: number
  description?: string
  days: string[]
}

/**
 * Export des programmes en CSV
 */
export function exportToCSV(programs: Program[]): void {
  const headers = ['Jour', 'Heure Début', 'Heure Fin', 'Titre', 'Catégorie', 'Type', 'Durée (min)', 'Description']
  
  const rows = programs.flatMap((program) => {
    const days = Array.isArray(program.days) ? program.days : []
    if (days.length === 0) days.push('—')
    
    return days.map((day) => [
      day,
      program.start || '',
      program.end || '',
      program.title || '',
      program.category || '',
      program.typeDiffusion || '',
      program.duration?.toString() || '',
      (program.description || '').replace(/\n/g, ' '),
    ])
  })

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `grille-programmes-${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Export des programmes en JSON (format EPG avec organisation par jour)
 */
export function exportToJSON(programs: Program[]): void {
  // Ordre des jours de la semaine (Lundi à Dimanche)
  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
  
  // Organiser les programmes par jour de la semaine
  const programsByDay: Record<string, any[]> = {}
  
  // Initialiser tous les jours avec un tableau vide
  weekDays.forEach(day => {
    programsByDay[day] = []
  })
  
  // Grouper les programmes par jour
  programs.forEach((program) => {
    const days = Array.isArray(program.days) ? program.days : []
    
    // Si le programme n'a pas de jours spécifiés, l'ajouter à tous les jours
    if (days.length === 0) {
      weekDays.forEach(day => {
        programsByDay[day].push({
          id: program.id,
          title: program.title,
          category: program.category || 'Divers',
          typeDiffusion: program.typeDiffusion || '',
          start: program.start || '',
          end: program.end || '',
          duration: program.duration || 60,
          description: program.description || '',
        })
      })
    } else {
      // Ajouter le programme aux jours spécifiés
      days.forEach((day) => {
        // Normaliser le nom du jour (première lettre en majuscule)
        const normalizedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
        
        // Vérifier si le jour est valide
        if (weekDays.includes(normalizedDay)) {
          programsByDay[normalizedDay].push({
            id: program.id,
            title: program.title,
            category: program.category || 'Divers',
            typeDiffusion: program.typeDiffusion || '',
            start: program.start || '',
            end: program.end || '',
            duration: program.duration || 60,
            description: program.description || '',
          })
        }
      })
    }
  })
  
  // Trier les programmes par heure de début pour chaque jour
  weekDays.forEach(day => {
    programsByDay[day].sort((a, b) => {
      const timeA = a.start || '00:00'
      const timeB = b.start || '00:00'
      return timeA.localeCompare(timeB)
    })
  })
  
  // Créer la structure EPG
  const epgData = {
    exportDate: new Date().toISOString(),
    version: '3.0',
    format: 'EPG',
    totalPrograms: programs.length,
    week: {
      monday: programsByDay['Lundi'],
      tuesday: programsByDay['Mardi'],
      wednesday: programsByDay['Mercredi'],
      thursday: programsByDay['Jeudi'],
      friday: programsByDay['Vendredi'],
      saturday: programsByDay['Samedi'],
      sunday: programsByDay['Dimanche'],
    },
    // Conserver aussi la liste complète pour compatibilité
    programs: programs.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category || 'Divers',
      typeDiffusion: p.typeDiffusion || '',
      start: p.start || '',
      end: p.end || '',
      duration: p.duration || 60,
      description: p.description || '',
      days: p.days || [],
    })),
  }

  const jsonContent = JSON.stringify(epgData, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `epg-grille-programmes-${new Date().toISOString().split('T')[0]}.json`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/** Import a schedule JSON file, optionally including its grid definition. */
export interface ImportedScheduleJSON {
  grid?: Record<string, unknown>
  programs: Program[]
}

export function importFromJSON(file: File): Promise<ImportedScheduleJSON> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        const programs = Array.isArray(data.programs) ? data.programs : Array.isArray(data) ? data : []
        resolve({
          grid: data.grid && typeof data.grid === 'object' ? data.grid : undefined,
          programs: programs as Program[],
        })
      } catch (error) {
        reject(new Error('Fichier JSON invalide'))
      }
    }
    reader.onerror = () => reject(new Error('Erreur de lecture du fichier'))
    reader.readAsText(file)
  })
}

