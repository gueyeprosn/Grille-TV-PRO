import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import axios from 'axios'
import TabletRegieView from './TabletRegieView'
import type { Program } from '../AppModernV3'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))
vi.mock('../../lib/api', () => ({ getApiBaseURL: () => '/api' }))

const mockedAxios = vi.mocked(axios, true)

describe('TabletRegieView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.get.mockResolvedValue({ data: { program: null } })
  })

  it('applies the configured category color to the programme card and its category badge', async () => {
    const currentDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(new Date())
    const program = {
      id: 'tablet-program',
      title: 'Magazine de test',
      category: 'Magazine personnalisé',
      start: '12:00',
      end: '13:00',
      duration: 60,
      days: [currentDay],
    } satisfies Program

    render(
      <TabletRegieView
        programs={[program]}
        currentDay={currentDay}
        categoryStyles={{ 'Magazine personnalisé': '#123456' }}
      />
    )

    const title = await screen.findByRole('heading', { name: 'Magazine de test' })
    const card = title.closest('.border-l-4')
    expect(card).not.toBeNull()
    expect(card).toHaveStyle({ backgroundColor: 'rgba(18, 52, 86, 0.1)', borderColor: 'rgb(18, 52, 86)' })

    const category = screen.getByText('Magazine personnalisé')
    expect(category).toHaveStyle({ backgroundColor: 'rgba(18, 52, 86, 0.16)', color: 'rgb(18, 52, 86)' })
  })
})
