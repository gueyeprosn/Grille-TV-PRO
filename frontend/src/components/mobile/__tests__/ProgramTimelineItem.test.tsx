import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProgramTimelineItem from '../ProgramTimelineItem'

describe('ProgramTimelineItem', () => {
  it('affiche l\'heure de début', () => {
    render(
      <ProgramTimelineItem
        startTime="18:00"
        title="Plateau Religieux"
      />
    )

    expect(screen.getByText('18:00')).toBeInTheDocument()
  })

  it('affiche l\'heure de fin si fournie', () => {
    render(
      <ProgramTimelineItem
        startTime="18:00"
        endTime="19:00"
        title="Test"
      />
    )

    expect(screen.getByText('19:00')).toBeInTheDocument()
  })

  it('affiche le titre du programme', () => {
    render(
      <ProgramTimelineItem
        startTime="18:00"
        title="Plateau Religieux"
      />
    )

    expect(screen.getByText('Plateau Religieux')).toBeInTheDocument()
  })

  it('affiche la catégorie si fournie', () => {
    render(
      <ProgramTimelineItem
        startTime="18:00"
        title="Test"
        category="Religieux"
      />
    )

    expect(screen.getByText('Religieux')).toBeInTheDocument()
  })

  it('affiche le badge ON AIR si isOnAir est true', () => {
    render(
      <ProgramTimelineItem
        startTime="18:00"
        title="Test"
        isOnAir={true}
      />
    )

    expect(screen.getByText(/ON/i)).toBeInTheDocument()
  })

  it('affiche le badge ⏭ si isNext est true', () => {
    render(
      <ProgramTimelineItem
        startTime="18:00"
        title="Test"
        isNext={true}
      />
    )

    expect(screen.getByText(/⏭/)).toBeInTheDocument()
  })

  it('appelle onClick quand on clique dessus', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <ProgramTimelineItem
        startTime="18:00"
        title="Test"
        onClick={handleClick}
      />
    )

    const item = screen.getByText('Test').closest('div')
    if (item) {
      await user.click(item)
      expect(handleClick).toHaveBeenCalledTimes(1)
    }
  })

  it('applique les styles ON AIR si isOnAir est true', () => {
    const { container } = render(
      <ProgramTimelineItem
        startTime="18:00"
        title="Test"
        isOnAir={true}
      />
    )

    const item = container.firstChild as HTMLElement
    expect(item).toHaveClass('bg-[#C1121F]/15')
    expect(item).toHaveClass('border-[#C1121F]')
  })
})

