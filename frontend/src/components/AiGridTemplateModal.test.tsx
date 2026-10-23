import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import toast from 'react-hot-toast'
import apiClient from '../lib/api'
import AiGridTemplateModal from './AiGridTemplateModal'

vi.mock('../lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }))
vi.mock('./ui', () => ({
  Button: ({ children, onClick, disabled }: React.PropsWithChildren<{ onClick?: () => void; disabled?: boolean }>) =>
    <button type="button" onClick={onClick} disabled={disabled}>{children}</button>,
  Modal: ({ children, isOpen, title }: React.PropsWithChildren<{ isOpen: boolean; title: string }>) =>
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
}))

const mockedApi = apiClient as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }
const mockedToast = toast as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> }

describe('AiGridTemplateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedApi.get.mockResolvedValue({
      data: {
        models: [
          { source: 'opencode', providerID: 'opencode', modelID: 'gateway-example', name: 'Modèle OpenCode', configured: true },
          { source: 'direct', providerID: 'anthropic', modelID: 'claude-example', name: 'Modèle Claude', configured: true },
          { source: 'direct', providerID: 'deepseek', modelID: 'deepseek-example', name: 'Modèle DeepSeek', configured: true },
          { source: 'direct', providerID: 'google', modelID: 'gemini-example', name: 'Modèle Gemini', configured: true },
          { source: 'direct', providerID: 'mistral', modelID: 'mistral-example', name: 'Modèle Mistral', configured: true },
          { source: 'direct', providerID: 'ollama', modelID: 'ollama-example', name: 'Modèle local', configured: true },
          { source: 'direct', providerID: 'openai', modelID: 'gpt-example', name: 'Modèle OpenAI', configured: true },
          { source: 'direct', providerID: 'openrouter', modelID: 'openrouter-example', name: 'Modèle OpenRouter', configured: true },
          { source: 'direct', providerID: 'xai', modelID: 'grok-example', name: 'Modèle Grok', configured: true },
        ],
        defaultModel: { source: 'opencode', providerID: 'opencode', modelID: 'gateway-example' },
      },
    })
    mockedApi.post.mockResolvedValue({
      data: {
        programs: [{
          title: 'Journal test',
          type: 'LIVE',
          startTime: '06:00',
          endTime: '07:00',
          durationMin: 60,
          days: [1, 2, 3, 4, 5],
        }],
      },
    })
  })

  it('charge les modèles configurés et transmet le fournisseur et le modèle choisis', async () => {
    render(<AiGridTemplateModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />)

    const providerSelect = await screen.findByRole('combobox', { name: 'Fournisseur IA' })
    expect(providerSelect).toHaveValue('opencode:opencode')
    expect([...providerSelect.querySelectorAll('option')].map(option => option.textContent)).toEqual(expect.arrayContaining([
      'OpenAI · API directe',
      'Anthropic / Claude · API directe',
      'Google Gemini · API directe',
      'OpenRouter · API directe',
      'Mistral · API directe',
      'Ollama (local) · API directe',
      'DeepSeek · API directe',
      'xAI / Grok · API directe',
    ]))
    fireEvent.change(providerSelect, { target: { value: 'direct:google' } })
    expect(screen.getByRole('combobox', { name: 'Modèle' })).toHaveValue('gemini-example')

    fireEvent.click(screen.getByRole('button', { name: 'Générer les programmes' }))

    await waitFor(() => expect(mockedApi.post).toHaveBeenCalledWith('/v3/templates/ai/generate', expect.objectContaining({
      providerID: 'google',
      modelID: 'gemini-example',
      source: 'direct',
    })))
    expect(mockedToast.success).toHaveBeenCalledWith(expect.stringContaining('programmes proposés'))
  })

  it('permet d’actualiser les modèles après une erreur de chargement', async () => {
    mockedApi.get.mockRejectedValueOnce({ response: { data: { error: 'OpenCode indisponible' } } })
      .mockResolvedValueOnce({ data: { models: [], defaultModel: null } })
    render(<AiGridTemplateModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('OpenCode indisponible')
    fireEvent.click(screen.getByRole('button', { name: 'Actualiser les modèles' }))

    await waitFor(() => expect(mockedApi.get).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(/Aucun modèle disponible/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Générer les programmes' })).toBeDisabled()
  })

  it('affiche un message neutre si la génération échoue sans erreur API détaillée', async () => {
    mockedApi.post.mockRejectedValueOnce(new Error('Network error'))
    render(<AiGridTemplateModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />)

    const providerSelect = await screen.findByRole('combobox', { name: 'Fournisseur IA' })
    fireEvent.change(providerSelect, { target: { value: 'direct:google' } })
    fireEvent.click(screen.getByRole('button', { name: 'Générer les programmes' }))

    await waitFor(() => expect(mockedToast.error).toHaveBeenCalledWith(
      'Impossible de générer le modèle. Vérifiez la configuration du fournisseur sélectionné.'
    ))
  })

  it('affiche les fournisseurs non configurés et explique comment les activer', async () => {
    mockedApi.get.mockResolvedValueOnce({
      data: {
        models: [
          { source: 'opencode', providerID: 'opencode', modelID: 'gateway-example', name: 'Modèle OpenCode', configured: true },
          { source: 'direct', providerID: 'openai', modelID: '', name: 'À configurer', configured: false, setupHint: ['OPENAI_API_KEY', 'OPENAI_MODEL'] },
          { source: 'direct', providerID: 'anthropic', modelID: '', name: 'À configurer', configured: false, setupHint: ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL'] },
          { source: 'direct', providerID: 'google', modelID: '', name: 'À configurer', configured: false, setupHint: ['GOOGLE_API_KEY', 'GOOGLE_MODEL'] },
          { source: 'direct', providerID: 'openrouter', modelID: '', name: 'À configurer', configured: false, setupHint: ['OPENROUTER_API_KEY', 'OPENROUTER_MODEL'] },
          { source: 'direct', providerID: 'mistral', modelID: '', name: 'À configurer', configured: false, setupHint: ['MISTRAL_API_KEY', 'MISTRAL_MODEL'] },
          { source: 'direct', providerID: 'ollama', modelID: '', name: 'À configurer', configured: false, setupHint: ['OLLAMA_MODEL'] },
          { source: 'direct', providerID: 'deepseek', modelID: '', name: 'À configurer', configured: false, setupHint: ['DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL'] },
          { source: 'direct', providerID: 'xai', modelID: '', name: 'À configurer', configured: false, setupHint: ['XAI_API_KEY', 'XAI_MODEL'] },
        ],
        defaultModel: { source: 'opencode', providerID: 'opencode', modelID: 'gateway-example' },
      },
    })
    render(<AiGridTemplateModal isOpen onClose={vi.fn()} onCreated={vi.fn()} />)

    const providerSelect = await screen.findByRole('combobox', { name: 'Fournisseur IA' })
    expect(providerSelect.querySelectorAll('option')).toHaveLength(9)
    fireEvent.change(providerSelect, { target: { value: 'direct:openai' } })

    expect(screen.getByRole('combobox', { name: 'Modèle' })).toHaveValue('')
    expect(screen.getByText(/OPENAI_API_KEY/)).toBeInTheDocument()
    expect(screen.getByText(/OPENAI_MODEL/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Générer les programmes' })).toBeDisabled()
  })
})
