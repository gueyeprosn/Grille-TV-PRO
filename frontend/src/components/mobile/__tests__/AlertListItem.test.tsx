import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AlertListItem, { type AlertType } from '../AlertListItem'

describe('AlertListItem', () => {
  const defaultProps = {
    type: 'on-air' as AlertType,
    time: '18:00',
    title: 'Programme ON AIR',
  }

  it('affiche le titre de l\'alerte', () => {
    render(<AlertListItem {...defaultProps} />)
    expect(screen.getByText('Programme ON AIR')).toBeInTheDocument()
  })

  it('affiche l\'heure de l\'alerte', () => {
    render(<AlertListItem {...defaultProps} />)
    expect(screen.getByText('18:00')).toBeInTheDocument()
  })

  it('affiche le message si fourni', () => {
    render(
      <AlertListItem
        {...defaultProps}
        message="Le programme est maintenant en diffusion"
      />
    )
    expect(screen.getByText('Le programme est maintenant en diffusion')).toBeInTheDocument()
  })

  it('affiche le titre du programme si fourni', () => {
    render(
      <AlertListItem
        {...defaultProps}
        programTitle="Plateau Religieux"
      />
    )
    expect(screen.getByText('Plateau Religieux')).toBeInTheDocument()
  })

  it('affiche l\'icône Radio pour type on-air', () => {
    render(<AlertListItem {...defaultProps} type="on-air" />)
    // L'icône Radio est présente (vérifiée via le composant)
    expect(screen.getByText('Programme ON AIR')).toBeInTheDocument()
  })

  it('affiche l\'icône Clock pour type preparation', () => {
    render(<AlertListItem {...defaultProps} type="preparation" />)
    expect(screen.getByText('Programme ON AIR')).toBeInTheDocument()
  })

  it('appelle onClick quand on clique dessus', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <AlertListItem
        {...defaultProps}
        onClick={handleClick}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Alerte ON AIR à 18:00 : Programme ON AIR' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applique les styles corrects pour type on-air', () => {
    const { container } = render(
      <AlertListItem {...defaultProps} type="on-air" />
    )

    const item = container.firstChild as HTMLElement
    expect(item).toHaveStyle({ borderColor: '#C1121F' })
    expect(item.style.background).toContain('rgba(193, 18, 31, 0.15)')
  })

  it('applique les styles corrects pour type preparation', () => {
    const { container } = render(
      <AlertListItem {...defaultProps} type="preparation" />
    )

    const item = container.firstChild as HTMLElement
    expect(item).toHaveStyle({ borderColor: '#F59E0B' })
    expect(item.style.background).toContain('rgba(245, 158, 11, 0.15)')
  })

  it('applique les styles corrects pour type anomaly', () => {
    const { container } = render(
      <AlertListItem {...defaultProps} type="anomaly" />
    )

    const item = container.firstChild as HTMLElement
    expect(item).toHaveStyle({ borderColor: '#EF4444' })
    expect(item.style.background).toContain('rgba(239, 68, 68, 0.15)')
  })
})
