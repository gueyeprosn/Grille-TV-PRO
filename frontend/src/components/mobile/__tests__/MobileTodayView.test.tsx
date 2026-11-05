import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import apiClient from '../../../lib/api'
import MobileTodayView from '../MobileTodayView'
import type { Program } from '../../AppModernV3'

vi.mock('../../../lib/api', () => ({
  default: { get: vi.fn() },
}))
const mockedApiClient = apiClient as unknown as { get: ReturnType<typeof vi.fn> }

describe('MobileTodayView', () => {
  const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']
  // Horloge figée : un jeudi à midi, avant les deux programmes de test (18h et
  // 19h). Sans cela, ces tests donnaient un résultat différent selon l'heure du
  // lancement — ils échouaient notamment entre 18h et 19h.
  const MAINTENANT = new Date('2026-11-05T12:00:00')
  // La vue ne doit dépendre que de l'horloge : les données suivent donc ce
  // jour, et `currentDay` reçoit volontairement un AUTRE jour pour vérifier
  // qu'il n'entre pas dans le calcul.
  const todayName = DAYS_FR[MAINTENANT.getDay()]
  const autreJour = DAYS_FR[(MAINTENANT.getDay() + 1) % 7]

  const mockPrograms: Program[] = [
    {
      id: '1',
      title: 'Programme ON AIR',
      start: '18:00',
      end: '19:00',
      duration: 60,
      days: [todayName],
      category: 'Religieux',
      type: 'LIVE',
      opStatus: 'ON_AIR',
    },
    {
      id: '2',
      title: 'Programme Suivant',
      start: '19:00',
      end: '20:00',
      duration: 60,
      days: [todayName],
      category: 'Information',
      type: 'REPLAY',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    // Seule la date est simulée : les minuteries restent réelles, car `waitFor`
    // de Testing Library s'appuie sur setInterval pour son sondage.
    vi.useFakeTimers({ toFake: ['Date'], now: MAINTENANT })
    mockedApiClient.get.mockReset()
    // Mock localStorage
    Storage.prototype.getItem = vi.fn(() => 'mock-token')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('affiche le titre de la vue du jour', () => {
    mockedApiClient.get.mockReturnValue(new Promise(() => {}))

    render(
      <MobileTodayView
        programs={mockPrograms}
        currentDay={autreJour}
      />
    )

    expect(screen.getByRole('heading', { name: 'Aujourd’hui' })).toBeInTheDocument()
  })

  it('charge les données depuis l\'API broadcast/now', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        program: mockPrograms[0],
      },
    })

    render(
      <MobileTodayView
        programs={mockPrograms}
        currentDay={autreJour}
      />
    )

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/v3/broadcast/now')
    })
  })

  it('charge les données depuis l\'API broadcast/next', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        program: mockPrograms[1],
      },
    })

    render(
      <MobileTodayView
        programs={mockPrograms}
        currentDay={autreJour}
      />
    )

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/v3/broadcast/next')
    })
  })

  it('affiche le programme ON AIR si disponible', async () => {
    mockedApiClient.get
      .mockResolvedValueOnce({ data: { program: mockPrograms[0] } })
      .mockResolvedValueOnce({ data: { program: mockPrograms[1] } })
      .mockResolvedValueOnce({ data: { programs: mockPrograms } })

    render(
      <MobileTodayView
        programs={mockPrograms}
        currentDay={autreJour}
      />
    )

    await waitFor(() => {
      const onAirElements = screen.getAllByText('Programme ON AIR')
      expect(onAirElements.length).toBeGreaterThan(0)
    })
  })

  it('charge le programme suivant et la grille du jour', async () => {
    const todayPrograms = mockPrograms.map(program => ({ ...program, days: [todayName] }))
    mockedApiClient.get.mockImplementation(async (path: string) => {
      if (path.endsWith('/broadcast/next')) return { data: { program: todayPrograms[1] } }
      if (path.endsWith('/broadcast/today')) return { data: { programs: todayPrograms } }
      return { data: {} }
    })

    render(
      <MobileTodayView
        programs={mockPrograms}
        currentDay={autreJour}
      />
    )

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/v3/broadcast/next')
      expect(screen.getAllByText('Programme Suivant')).toHaveLength(2)
    })
  })

  it('ignore le jour sélectionné et n’affiche que les programmes d’aujourd’hui', async () => {
    mockedApiClient.get.mockReturnValue(new Promise(() => {}))

    const programmeAutreJour: Program = {
      ...mockPrograms[0],
      id: 'autre-jour',
      title: 'Programme d’un autre jour',
      opStatus: 'PLANNED',
      days: [autreJour],
    }

    render(
      <MobileTodayView
        programs={[...mockPrograms, programmeAutreJour]}
        currentDay={autreJour}
      />
    )

    await waitFor(() => {
      expect(screen.getAllByText('Programme Suivant').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('Programme d’un autre jour')).not.toBeInTheDocument()
  })

  it('conserve les programmes du jour renvoyés par l’API quand la grille locale n’est pas encore chargée', async () => {
    // Au premier rendu, `programs` est vide : la grille arrive de l'API un peu
    // plus tard. La réponse `broadcast/today` ne doit pas être écrasée par un
    // calcul local fait sur cette liste encore vide.
    const duJour: Program[] = [
      { id: 'j1', title: 'Journal du matin', start: '06:00', end: '07:00', duration: 60, days: [todayName], category: 'Information', type: 'LIVE' },
      { id: 'j2', title: 'Magazine de midi', start: '12:00', end: '13:00', duration: 60, days: [todayName], category: 'Divers', type: 'PAD' },
      { id: 'j3', title: 'Film du soir', start: '21:00', end: '22:30', duration: 90, days: [todayName], category: 'Divers', type: 'PAD' },
    ]
    mockedApiClient.get.mockImplementation(async (path: string) => {
      if (path.endsWith('/broadcast/now')) return { data: { program: null } }
      if (path.endsWith('/broadcast/next')) return { data: { program: duJour[2] } }
      if (path.endsWith('/broadcast/today')) return { data: { programs: duJour } }
      return { data: {} }
    })

    const { rerender } = render(<MobileTodayView programs={[]} currentDay={autreJour} />)

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith('/v3/broadcast/today')
    })

    // La grille locale finit par arriver, sans que le jour ne change.
    rerender(<MobileTodayView programs={duJour} currentDay={autreJour} />)

    await waitFor(() => {
      expect(screen.getByText('(3)')).toBeInTheDocument()
    })
    expect(screen.getByText('Journal du matin')).toBeInTheDocument()
    expect(screen.queryByText(/Aucun programme prévu/)).not.toBeInTheDocument()
  })

  it('applique les styles broadcast (couleurs)', () => {
    mockedApiClient.get.mockReturnValue(new Promise(() => {}))

    const { container } = render(
      <MobileTodayView
        programs={mockPrograms}
        currentDay={autreJour}
      />
    )

    const view = container.firstChild as HTMLElement
    expect(view).toHaveStyle({ backgroundColor: 'var(--bg)' })
  })
})
