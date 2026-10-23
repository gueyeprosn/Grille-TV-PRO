import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DayView from './DayView'

describe('DayView — périmètre 05:00–00:00', () => {
  it('masque les programmes après minuit et affiche uniquement la partie visible', () => {
    const programs = [
      {
        id: 'after-midnight',
        title: 'Programme de 00h30',
        start: '00:30',
        end: '01:30',
        duration: 60,
        category: 'Culture',
        days: ['Mardi'],
      },
      {
        id: 'visible',
        title: 'Programme du matin',
        start: '04:30',
        end: '06:00',
        duration: 90,
        category: 'Culture',
        days: ['Mardi'],
      },
    ]

    render(
      <DayView
        day="Mardi"
        programs={programs}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDuplicate={vi.fn()}
        visibleIds={new Set(programs.map((program) => program.id))}
        freeInfo={{ scheduledMinutes: 60, freeMinutes: 1080, freeSlots: ['06:00 – 00:00'] }}
        categoryStyles={{}}
        startHour={5}
        endHour={24}
      />
    )

    expect(screen.getByText('Périmètre : 05:00 → 00:00')).toBeInTheDocument()
    expect(screen.getByText('Programme du matin')).toBeInTheDocument()
    expect(screen.getByText('05:00')).toBeInTheDocument()
    expect(screen.getByText('06:00')).toBeInTheDocument()
    expect(screen.queryByText('Programme de 00h30')).not.toBeInTheDocument()
  })
})
