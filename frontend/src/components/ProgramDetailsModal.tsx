import React from 'react'
import { Edit } from 'lucide-react'
import { Button, Modal } from './ui'

export interface ProgramDetailsData {
  id: string
  title: string
  category?: string
  categoryId?: string
  typeDiffusion?: string
  type?: string
  start: string
  end?: string
  duration?: number
  description?: string
  days?: string[]
  opStatus?: string
  color?: string
  adsRequired?: boolean
  gridId?: string
  createdAt?: string
  updatedAt?: string
}

interface ProgramDetailsModalProps {
  program: ProgramDetailsData | null
  day?: string
  onClose: () => void
  onEdit?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planifié',
  DRAFT: 'Brouillon',
  CONFIRMED: 'Confirmé',
  IN_PRODUCTION: 'En production',
  READY: 'Prêt',
  ON_AIR: 'En direct',
  AIRED: 'Diffusé',
  DONE: 'Terminé',
  CANCELED: 'Annulé',
  CANCELLED: 'Annulé',
  DELAYED: 'En retard',
  OVERRUN: 'Dépassement',
  SKIPPED: 'Sauté',
  MANUAL_OVERRIDE: 'Modification manuelle',
}

const formatDuration = (minutes?: number) => {
  const value = Math.max(0, Math.round(minutes || 0))
  const hours = Math.floor(value / 60)
  const remainingMinutes = value % 60
  if (!hours) return `${remainingMinutes} min`
  if (!remainingMinutes) return `${hours} h`
  return `${hours} h ${String(remainingMinutes).padStart(2, '0')}`
}

const formatDate = (value?: string) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('fr-FR')
}

const formatDays = (days?: string[]) => {
  if (!days?.length) return undefined
  const labels = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  return days.map((day) => /^\d$/.test(day) && labels[Number(day)] ? labels[Number(day)] : day).join(', ')
}

const ProgramDetailsModal: React.FC<ProgramDetailsModalProps> = ({ program, day, onClose, onEdit }) => {
  if (!program) return null

  const details: Array<[string, string | undefined]> = [
    ['Horaire', `${program.start}${program.end ? ` – ${program.end}` : ''}`],
    ['Durée', formatDuration(program.duration)],
    ['Jour affiché', day],
    ['Jours de diffusion', formatDays(program.days)],
    ['Catégorie', program.category],
    ['Identifiant de catégorie', program.categoryId],
    ['Type de diffusion', program.typeDiffusion || program.type],
    ['Statut', STATUS_LABELS[program.opStatus || ''] || program.opStatus || 'Non défini'],
    ['Identifiant du programme', program.id],
    ['Identifiant de la grille', program.gridId],
    ['Publicité requise', program.adsRequired === undefined ? undefined : program.adsRequired ? 'Oui' : 'Non'],
    ['Créé le', formatDate(program.createdAt)],
    ['Mis à jour le', formatDate(program.updatedAt)],
  ]

  return (
    <Modal isOpen onClose={onClose} title="Détails du programme" size="lg">
      <div className="space-y-5 text-slate-100">
        <div className="border-l-4 pl-4" style={{ borderColor: program.color || '#38bdf8' }}>
          <h3 className="text-xl font-bold text-white">{program.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{program.category || 'Catégorie non renseignée'}</p>
        </div>

        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {details.filter(([, value]) => value !== undefined).map(([label, value]) => (
            <div key={label} className="rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-slate-100">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="rounded-md border border-slate-700 bg-slate-900/70 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-100">
            {program.description?.trim() || 'Aucune description renseignée.'}
          </p>
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          {onEdit && (
            <Button variant="primary" leftIcon={<Edit className="h-4 w-4" />} onClick={onEdit}>
              Modifier le programme
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    </Modal>
  )
}

export default ProgramDetailsModal
