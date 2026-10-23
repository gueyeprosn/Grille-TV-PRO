import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import WeekAgendaModern from './WeekAgendaModern'
import apiClient from '../lib/api'

vi.mock('../lib/api', () => ({
  default: { get: vi.fn() },
}))
vi.mock('../lib/uiModeStore', () => ({
  useUIModeStore: vi.fn(() => ({ mode: 'STANDARD', isRegieMode: vi.fn(() => false) })),
}))

const mockedApi = apiClient as unknown as { get: ReturnType<typeof vi.fn> }

const mockPrograms = [
  {
    id: 'prog-1',
    title: 'Journal de 20h',
    start: '20:00',
    end: '20:30',
    duration: 30,
    days: ['Lundi'],
    category: 'Information',
    typeDiffusion: 'Direct',
    opStatus: 'ON_AIR' as const,
  },
  {
    id: 'prog-2',
    title: 'Meteo',
    start: '20:30',
    end: '21:00',
    duration: 30,
    days: ['Lundi'],
    category: 'Information',
    typeDiffusion: 'PAD',
    opStatus: 'PLANNED' as const,
  },
  {
    id: 'prog-3',
    title: 'Film du soir',
    start: '21:00',
    end: '23:00',
    duration: 120,
    days: ['Mardi'],
    category: 'Divertissement',
    typeDiffusion: 'REPLAY',
    opStatus: 'PLANNED' as const,
  },
]

describe('WeekAgendaModern (accessibility)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedApi.get.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.removeItem('grille-week-density')
  })

  it('rend la grille sans erreur et affiche les programmes', () => {
    render(
      <WeekAgendaModern
        programs={mockPrograms}
        weekDays={['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']}
        startHour={6}
        endHour={23}
      />
    )

    expect(screen.getByText('Journal de 20h')).toBeInTheDocument()
    expect(screen.getByText('Meteo')).toBeInTheDocument()
    expect(screen.getByText('Film du soir')).toBeInTheDocument()
  })

  it('ne reporte pas au lendemain un programme qui se termine exactement à minuit', () => {
    render(
      <WeekAgendaModern
        programs={[{
          id: 'midnight-end',
          title: 'Continuité nocturne',
          start: '23:05',
          end: '00:00',
          duration: 55,
          days: ['Lundi'],
          category: 'Continuité',
        }]}
        weekDays={['Lundi', 'Mardi']}
        startHour={0}
        endHour={24}
      />
    )

    expect(screen.getAllByRole('button', { name: /Programme Continuité nocturne/ })).toHaveLength(1)
  })

  it('positionne un programme d’une minute à son heure exacte sans le gonfler à un quart d’heure', () => {
    render(
      <WeekAgendaModern
        programs={[{
          id: 'one-minute',
          title: 'Jingle horaire',
          start: '01:04',
          end: '01:05',
          duration: 1,
          days: ['Lundi'],
          category: 'Habillage',
        }]}
        weekDays={['Lundi']}
        startHour={0}
        endHour={24}
      />
    )

    const card = screen.getByRole('button', { name: /Programme Jingle horaire/ }) as HTMLElement
    expect(card.style.top).toMatch(/px$/)
    expect(Number.parseFloat(card.style.height)).toBeLessThan(10)
    expect(Number.parseFloat(card.style.height)).toBeGreaterThan(0)

    fireEvent.focus(card)
    expect(screen.getByText('01:04–01:05 · 1 min')).toBeInTheDocument()
    expect(screen.getByText('Jingle horaire')).toBeInTheDocument()
  })

  it('ouvre la modification au double-clic et garde les détails accessibles avec Entrée', () => {
    const onEdit = vi.fn()
    render(
      <WeekAgendaModern
        programs={[{
          id: 'details-program',
          title: 'Émission détaillée',
          start: '09:15',
          end: '10:00',
          duration: 45,
          days: ['Lundi'],
          category: 'Culture',
          typeDiffusion: 'REPLAY',
          description: 'Présentation complète de l’émission.',
          gridId: 'grille-2026',
        }]}
        weekDays={['Lundi']}
        startHour={0}
        endHour={24}
        onEdit={onEdit}
      />
    )

    const card = screen.getByRole('button', { name: /Programme Émission détaillée/ })
    fireEvent.doubleClick(card)
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'details-program' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.keyDown(card, { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Présentation complète de l’émission.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveTextContent('09:15 – 10:00')
  })

  it('attribue un aria-label descriptif, role et tabindex a chaque carte programme', () => {
    render(
      <WeekAgendaModern
        programs={mockPrograms}
        weekDays={['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']}
        startHour={6}
        endHour={23}
      />
    )

    const journal = screen.getByText('Journal de 20h')
    const card = journal.closest('[role="button"]')
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('role', 'button')
    expect(card).toHaveAttribute('tabindex', '0')
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('Journal de 20h'))
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('Lundi'))
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('20:00'))
  })

  it('affiche les boutons daction avec aria-label explicite', () => {
    // Mode détaillé nécessaire pour voir les actions rapides
    localStorage.setItem('grille-week-density', 'detailed')
    render(
      <WeekAgendaModern
        programs={mockPrograms}
        weekDays={['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']}
        startHour={6}
        endHour={23}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )

    const editButtons = screen.getAllByRole('button', { name: /Modifier/ })
    const deleteButtons = screen.getAllByRole('button', { name: /Supprimer/ })
    expect(editButtons.length).toBeGreaterThan(0)
    expect(deleteButtons.length).toBeGreaterThan(0)
  })

  it('garde un statut historique non renseigné et modifie une diffusion datée', () => {
    localStorage.setItem('grille-week-density', 'detailed')
    const onStatusChange = vi.fn()
    const today = new Date()
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
    const serviceDate = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

    render(
      <WeekAgendaModern
        programs={[{
          id: 'dated-broadcast',
          title: 'Diffusion datée',
          start: '10:00',
          end: '11:30',
          duration: 90,
          days: ['Lundi'],
          category: 'Culture',
          occurrenceStatuses: { [serviceDate]: null },
        }]}
        weekDays={['Lundi']}
        startHour={0}
        endHour={24}
        userRole="DIRECTION"
        onStatusChange={onStatusChange}
      />
    )

    expect(screen.getByText('Non renseigné')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: `Marquer diffusé : Diffusion datée, diffusion du ${serviceDate}` }))
    expect(onStatusChange).toHaveBeenCalledWith('dated-broadcast', serviceDate, 'AIRED')
  })
})
