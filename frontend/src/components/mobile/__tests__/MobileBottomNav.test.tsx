import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MobileBottomNav from '../MobileBottomNav'

describe('MobileBottomNav', () => {
  const defaultProps = {
    currentView: 'today' as const,
    onViewChange: vi.fn(),
  }

  it('affiche tous les onglets de navigation', () => {
    render(<MobileBottomNav {...defaultProps} />)

    expect(screen.getByText('Aujourd\'hui')).toBeInTheDocument()
    expect(screen.getByText('ON AIR')).toBeInTheDocument()
    expect(screen.getByText('Semaine')).toBeInTheDocument()
    expect(screen.getByText('Alertes')).toBeInTheDocument()
    expect(screen.getByText('Plus')).toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('met en évidence la vue active', () => {
    render(<MobileBottomNav {...defaultProps} currentView="onair" />)

    const onAirButton = screen.getByText('ON AIR').closest('button')
    expect(onAirButton).toHaveAttribute('aria-current', 'page')
  })

  it('appelle onViewChange quand on clique sur un onglet', async () => {
    const user = userEvent.setup()
    const handleViewChange = vi.fn()

    render(
      <MobileBottomNav
        currentView="today"
        onViewChange={handleViewChange}
      />
    )

    const onAirButton = screen.getByText('ON AIR').closest('button')
    if (onAirButton) {
      await user.click(onAirButton)
      expect(handleViewChange).toHaveBeenCalledWith('onair')
    }
  })

  it('affiche le badge ON AIR si onAirBadge est fourni', () => {
    render(
      <MobileBottomNav
        {...defaultProps}
        onAirBadge={1}
      />
    )

    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('affiche le badge Alertes si alertsBadge est fourni', () => {
    render(
      <MobileBottomNav
        {...defaultProps}
        alertsBadge={3}
      />
    )

    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('affiche "9+" si le badge dépasse 9', () => {
    render(
      <MobileBottomNav
        {...defaultProps}
        onAirBadge={15}
      />
    )

    expect(screen.getByText('9+')).toBeInTheDocument()
  })

  it('applique les styles broadcast (couleurs)', () => {
    const { container } = render(<MobileBottomNav {...defaultProps} />)

    const nav = container.firstChild as HTMLElement
    expect(nav).toHaveStyle({ backgroundColor: 'var(--mobile-nav-bg)' })
  })
})
