import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MobileOnAirCard from '../MobileOnAirCard'

describe('MobileOnAirCard', () => {
  it('affiche le titre du programme', () => {
    render(
      <MobileOnAirCard
        title="Plateau Religieux"
        startTime="18:00"
        endTime="19:00"
        category="Religieux"
        type="Direct"
      />
    )

    expect(screen.getByText('Plateau Religieux')).toBeInTheDocument()
  })

  it('affiche les horaires en format monospace', () => {
    render(
      <MobileOnAirCard
        title="Test"
        startTime="18:00"
        endTime="19:00"
      />
    )

    const timeElement = screen.getByText('18:00 – 19:00')
    expect(timeElement).toBeInTheDocument()
    expect(timeElement).toHaveClass('font-mono')
  })

  it('affiche le badge ON AIR', () => {
    render(
      <MobileOnAirCard
        title="Test"
        startTime="18:00"
        endTime="19:00"
      />
    )

    expect(screen.getByText(/ON AIR/i)).toBeInTheDocument()
  })

  it('affiche la catégorie si fournie', () => {
    render(
      <MobileOnAirCard
        title="Test"
        startTime="18:00"
        endTime="19:00"
        category="Religieux"
      />
    )

    expect(screen.getByText('Religieux')).toBeInTheDocument()
  })

  it('affiche le type si fourni', () => {
    render(
      <MobileOnAirCard
        title="Test"
        startTime="18:00"
        endTime="19:00"
        type="Direct"
      />
    )

    expect(screen.getByText('Direct')).toBeInTheDocument()
  })

  it('applique les styles broadcast (rouge ON AIR)', () => {
    const { container } = render(
      <MobileOnAirCard
        title="Test"
        startTime="18:00"
        endTime="19:00"
      />
    )

    const card = container.firstChild as HTMLElement
    expect(card).toHaveStyle({ backgroundColor: '#C1121F' })
  })
})

