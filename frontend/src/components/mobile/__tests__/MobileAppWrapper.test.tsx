import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import MobileAppWrapper from '../MobileAppWrapper'

vi.mock('../MobileTodayView', () => ({ default: () => <div data-testid="today-view" /> }))
vi.mock('../MobileOnAirView', () => ({ default: () => <div data-testid="onair-view" /> }))
vi.mock('../MobileWeekView', () => ({
  default: ({ mode, initialDay }: { mode: string; initialDay?: string }) => (
    <div data-testid="schedule-view" data-mode={mode} data-day={initialDay} />
  ),
}))
vi.mock('../MobileAlertsView', () => ({ default: () => <div data-testid="alerts-view" /> }))
vi.mock('../../CoordinationHub', () => ({ default: () => <div data-testid="coordination-view" /> }))
vi.mock('../../BroadcastReportView', () => ({ default: () => <div data-testid="report-view" /> }))
vi.mock('../../tablet/TabletSplitView', () => ({
  default: ({ main, sidebar }: { main: ReactNode; sidebar: ReactNode }) => (
    <div data-testid="tablet-split">{main}{sidebar}</div>
  ),
}))
vi.mock('../../tablet/TabletRegieView', () => ({ default: () => <div data-testid="tablet-regie" /> }))

const originalViewport = { width: window.innerWidth, height: window.innerHeight }

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalViewport.width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalViewport.height })
})

const defaultProps = {
  programs: [],
  currentDay: 'Lundi',
  currentGridId: 'grid-1',
  theme: 'dark' as const,
  onThemeToggle: vi.fn(),
}

describe('MobileAppWrapper', () => {
  it('synchronise la route Coordination avec la vue mobile', () => {
    render(<MobileAppWrapper {...defaultProps} viewMode="coordination" />)

    expect(screen.getByTestId('coordination-view')).toBeInTheDocument()
  })

  it('ouvre les vues Jour, Coordination et Rapport depuis Plus', async () => {
    const onViewModeChange = vi.fn()
    render(<MobileAppWrapper {...defaultProps} onViewModeChange={onViewModeChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Plus' }))
    fireEvent.click(screen.getByRole('button', { name: /Conducteur du jour/ }))
    expect(screen.getByTestId('schedule-view')).toHaveAttribute('data-mode', 'day')
    expect(screen.getByTestId('schedule-view')).toHaveAttribute('data-day', 'Lundi')
    expect(onViewModeChange).toHaveBeenCalledWith('day')

    fireEvent.click(screen.getByRole('button', { name: 'Plus' }))
    fireEvent.click(screen.getByRole('button', { name: /^Coordination/ }))
    expect(screen.getByTestId('coordination-view')).toBeInTheDocument()
    expect(onViewModeChange).toHaveBeenCalledWith('coordination')

    fireEvent.click(screen.getByRole('button', { name: 'Plus' }))
    fireEvent.click(screen.getByRole('button', { name: /^Rapport/ }))
    expect(await screen.findByTestId('report-view')).toBeInTheDocument()
    expect(onViewModeChange).toHaveBeenCalledWith('report')
  })

  it('expose la bascule de thème avec un libellé accessible', () => {
    const onThemeToggle = vi.fn()
    render(<MobileAppWrapper {...defaultProps} onThemeToggle={onThemeToggle} />)

    fireEvent.click(screen.getByRole('button', { name: 'Activer le thème clair' }))
    expect(onThemeToggle).toHaveBeenCalledOnce()
  })

  it('conserve la vue Régie partagée sur tablette paysage', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 900 })
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 })
    render(<MobileAppWrapper {...defaultProps} />)

    fireEvent.click(screen.getByRole('button', { name: 'ON AIR' }))

    expect(screen.getByTestId('tablet-split')).toBeInTheDocument()
    expect(screen.getByTestId('tablet-regie')).toBeInTheDocument()
  })
})
