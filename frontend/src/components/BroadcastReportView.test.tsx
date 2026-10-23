import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { exportWeekToPdf } from '../legacy/lib/pdf'
import BroadcastReportView from './BroadcastReportView'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))
vi.mock('../legacy/lib/pdf', () => ({ exportWeekToPdf: vi.fn() }))
vi.mock('./ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Loading: ({ text }: { text: string }) => <p>{text}</p>,
}))

const mockedAxios = axios as unknown as { get: ReturnType<typeof vi.fn> }
const mockedPdf = exportWeekToPdf as unknown as ReturnType<typeof vi.fn>

describe('BroadcastReportView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.endsWith('/programs')) {
        return Promise.resolve({ data: { data: [
          { id: 'daily', title: 'Journal', startTime: '00:30', endTime: '01:30', durationMin: 60, days: [1, 3], category: 'Information', typeDiffusion: 'Direct', opStatus: 'DONE' },
          { id: 'weekly', title: 'Magazine', startTime: '05:00', endTime: '06:00', durationMin: 60, days: [5], category: 'Culture', typeDiffusion: 'REPLAY', opStatus: 'PLANNED' },
        ] } })
      }
      if (url.endsWith('/grille')) return Promise.resolve({ data: { id: 'grille', name: 'Grille test', startDate: '2026-10-01', endDate: '2027-09-30' } })
      return Promise.resolve({ data: [] })
    })
  })

  it('décrit les statuts des fiches sans les présenter comme des diffusions par occurrence', async () => {
    render(<BroadcastReportView gridId="grille" />)

    expect(await screen.findByText('Fiches au statut diffusé / en direct')).toBeInTheDocument()
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    expect(screen.getByText('1 sur 2 fiches')).toBeInTheDocument()
    expect(screen.getByText(/ne décrit pas chaque diffusion récurrente/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Export PDF/ }))
    await waitFor(() => expect(mockedPdf).toHaveBeenCalled())
    const exportedPrograms = mockedPdf.mock.calls[0][0]
    expect(exportedPrograms).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Journal', duration: 60, days: ['Lundi', 'Mercredi'] }),
      expect.objectContaining({ title: 'Magazine', duration: 60, days: ['Vendredi'] }),
    ]))
  })

  it('signale un échec de génération PDF et propose un nouvel essai', async () => {
    mockedPdf.mockRejectedValueOnce(new Error('Erreur de génération'))
    render(<BroadcastReportView gridId="grille" />)

    fireEvent.click(await screen.findByRole('button', { name: /Export PDF/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Échec de l’export PDF : L’export PDF n’a pas pu être généré. Réessayez.')
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeInTheDocument()
  })
})
