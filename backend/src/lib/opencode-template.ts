export interface SuggestedProgram {
  title: string
  category?: string
  type: 'LIVE' | 'REPLAY' | 'PAD' | 'ADS' | 'SPECIAL'
  startTime: string
  endTime: string
  durationMin: number
  days: number[]
  description?: string
}

export interface OpenCodeModel {
  source: 'opencode' | 'direct'
  providerID: string
  modelID: string
  name: string
  configured: boolean
  setupHint?: string[]
}

export interface OpenCodeModelSelection {
  source?: 'opencode' | 'direct'
  providerID: string
  modelID: string
}

interface DirectProviderConfig {
  id: string
  name: string
  keyEnv?: string
  modelEnv: string
  baseUrlEnv: string
  defaultBaseUrl: string
  protocol: 'openai' | 'anthropic' | 'google' | 'ollama'
}

const DIRECT_PROVIDERS: DirectProviderConfig[] = [
  { id: 'openai', name: 'OpenAI', keyEnv: 'OPENAI_API_KEY', modelEnv: 'OPENAI_MODEL', baseUrlEnv: 'OPENAI_BASE_URL', defaultBaseUrl: 'https://api.openai.com/v1', protocol: 'openai' },
  { id: 'anthropic', name: 'Anthropic / Claude', keyEnv: 'ANTHROPIC_API_KEY', modelEnv: 'ANTHROPIC_MODEL', baseUrlEnv: 'ANTHROPIC_BASE_URL', defaultBaseUrl: 'https://api.anthropic.com', protocol: 'anthropic' },
  { id: 'google', name: 'Google Gemini', keyEnv: 'GOOGLE_API_KEY', modelEnv: 'GOOGLE_MODEL', baseUrlEnv: 'GOOGLE_BASE_URL', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta', protocol: 'google' },
  { id: 'openrouter', name: 'OpenRouter', keyEnv: 'OPENROUTER_API_KEY', modelEnv: 'OPENROUTER_MODEL', baseUrlEnv: 'OPENROUTER_BASE_URL', defaultBaseUrl: 'https://openrouter.ai/api/v1', protocol: 'openai' },
  { id: 'mistral', name: 'Mistral', keyEnv: 'MISTRAL_API_KEY', modelEnv: 'MISTRAL_MODEL', baseUrlEnv: 'MISTRAL_BASE_URL', defaultBaseUrl: 'https://api.mistral.ai/v1', protocol: 'openai' },
  { id: 'ollama', name: 'Ollama (local)', modelEnv: 'OLLAMA_MODEL', baseUrlEnv: 'OLLAMA_BASE_URL', defaultBaseUrl: 'http://localhost:11434', protocol: 'ollama' },
  { id: 'deepseek', name: 'DeepSeek', keyEnv: 'DEEPSEEK_API_KEY', modelEnv: 'DEEPSEEK_MODEL', baseUrlEnv: 'DEEPSEEK_BASE_URL', defaultBaseUrl: 'https://api.deepseek.com', protocol: 'openai' },
  { id: 'xai', name: 'xAI / Grok', keyEnv: 'XAI_API_KEY', modelEnv: 'XAI_MODEL', baseUrlEnv: 'XAI_BASE_URL', defaultBaseUrl: 'https://api.x.ai/v1', protocol: 'openai' },
]

const MAX_PROGRAMS = 70
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/
const ALLOWED_TYPES = new Set(['LIVE', 'REPLAY', 'PAD', 'ADS', 'SPECIAL'])

export class OpenCodeRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
    this.name = 'OpenCodeRequestError'
  }
}

function extractResponseMessage(value: unknown): string {
  if (!value || typeof value !== 'object') return ''
  const record = value as Record<string, unknown>
  for (const candidate of [record.message, record.error, record.name]) {
    if (typeof candidate === 'string') return candidate
    if (candidate && typeof candidate === 'object') {
      const nested = candidate as Record<string, unknown>
      if (typeof nested.message === 'string') return nested.message
      const data = nested.data
      if (data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string') {
        return (data as { message: string }).message
      }
    }
  }
  return ''
}

function openCodeError(status: number, responseMessage: string): OpenCodeRequestError {
  if (responseMessage.toLowerCase().includes('free tier can only be used from within opencode')) {
    return new OpenCodeRequestError(
      503,
      'Le forfait gratuit OpenCode ne permet pas la génération via cette API. Configurez un fournisseur et un modèle utilisables par le serveur, puis réessayez.'
    )
  }
  if (status === 401) return new OpenCodeRequestError(502, 'Authentification OpenCode refusée. Vérifiez OPENCODE_USERNAME et OPENCODE_PASSWORD.')
  if (status === 403) return new OpenCodeRequestError(502, 'OpenCode refuse l’accès au modèle. Vérifiez les autorisations et la configuration du fournisseur.')
  if (status === 404) return new OpenCodeRequestError(502, 'L’API de sessions OpenCode est introuvable. Mettez à jour le serveur OpenCode puis réessayez.')
  if (status === 429) return new OpenCodeRequestError(503, 'Le fournisseur OpenCode limite temporairement les requêtes. Réessayez plus tard.')
  if (status >= 500) return new OpenCodeRequestError(502, `Le serveur ou le fournisseur OpenCode a refusé la génération (HTTP ${status}). Vérifiez le modèle, son authentification et son quota.`)
  return new OpenCodeRequestError(502, responseMessage || `La requête OpenCode a échoué (HTTP ${status}).`)
}

function getOpenCodeHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.OPENCODE_USERNAME && process.env.OPENCODE_PASSWORD) {
    headers.Authorization = `Basic ${Buffer.from(`${process.env.OPENCODE_USERNAME}:${process.env.OPENCODE_PASSWORD}`).toString('base64')}`
  }
  return headers
}

function parseOpenCodeModels(value: unknown): OpenCodeModel[] {
  const data = value && typeof value === 'object' && 'data' in value
    ? (value as { data?: unknown }).data
    : value
  const entries = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? Object.values(data)
      : []
  const models = entries.flatMap((entry): OpenCodeModel[] => {
    if (!entry || typeof entry !== 'object') return []
    const model = entry as Record<string, unknown>
    const providerID = typeof model.providerID === 'string' ? model.providerID.trim() : ''
    const modelID = typeof model.modelID === 'string' ? model.modelID.trim() : typeof model.id === 'string' ? model.id.trim() : ''
    if (!providerID || !modelID || model.enabled === false) return []
    const name = typeof model.name === 'string' && model.name.trim() ? model.name.trim() : modelID
    return [{ source: 'opencode', providerID, modelID, name, configured: true }]
  })
  const uniqueModels = new Map(models.map(model => [`${model.providerID}/${model.modelID}`, model]))
  return [...uniqueModels.values()].sort((left, right) =>
    left.providerID.localeCompare(right.providerID) || left.name.localeCompare(right.name)
  )
}

function listDirectProviderModels(includeUnconfigured = true): OpenCodeModel[] {
  return DIRECT_PROVIDERS.flatMap((provider): OpenCodeModel[] => {
    const modelID = process.env[provider.modelEnv]?.trim()
    const apiKey = provider.keyEnv ? process.env[provider.keyEnv]?.trim() : 'local'
    if (!modelID || !apiKey) {
      if (!includeUnconfigured) return []
      return [{
        source: 'direct',
        providerID: provider.id,
        modelID: '',
        name: 'À configurer',
        configured: false,
        setupHint: [
          ...(apiKey ? [] : provider.keyEnv ? [provider.keyEnv] : []),
          ...(modelID ? [] : [provider.modelEnv]),
        ],
      }]
    }
    return [{
      source: 'direct' as const,
      providerID: provider.id,
      modelID,
      name: `${provider.name} · ${modelID}`,
      configured: true,
    }]
  })
}

async function requestOpenCode(path: string, timeoutMs = 10_000): Promise<unknown> {
  const baseUrl = process.env.OPENCODE_BASE_URL?.trim().replace(/\/+$/, '')
  if (!baseUrl) throw new OpenCodeRequestError(503, 'OpenCode n’est pas configuré. Définissez OPENCODE_BASE_URL dans backend/.env.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response: Response
    try {
      response = await fetch(`${baseUrl}${path}`, {
        headers: getOpenCodeHeaders(),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new OpenCodeRequestError(504, 'Le serveur OpenCode ne répond pas à temps.')
      }
      throw new OpenCodeRequestError(502, 'Impossible de joindre le serveur OpenCode. Vérifiez son adresse et son état.')
    }
    const responseText = await response.text()
    let responseBody: unknown
    if (responseText) {
      try {
        responseBody = JSON.parse(responseText)
      } catch {
        responseBody = undefined
      }
    }
    if (!response.ok) throw openCodeError(response.status, extractResponseMessage(responseBody))
    return responseBody
  } finally {
    clearTimeout(timeout)
  }
}

export async function listAvailableAiModels(): Promise<{ models: OpenCodeModel[]; defaultModel: OpenCodeModelSelection | null; warning?: string }> {
  let openCodeModels: OpenCodeModel[] = []
  let defaultRecord: Record<string, unknown> | null = null
  let warning: string | undefined
  try {
    const [modelResponse, defaultResponse] = await Promise.all([
      requestOpenCode('/api/model'),
      requestOpenCode('/api/model/default'),
    ])
    openCodeModels = parseOpenCodeModels(modelResponse)
    const defaultData = defaultResponse && typeof defaultResponse === 'object' && 'data' in defaultResponse
      ? (defaultResponse as { data?: unknown }).data
      : defaultResponse
    defaultRecord = defaultData && typeof defaultData === 'object' ? defaultData as Record<string, unknown> : null
  } catch {
    warning = 'OpenCode est indisponible. Les fournisseurs directs restent configurables depuis cette liste.'
  }
  const configuredProvider = process.env.OPENCODE_PROVIDER_ID?.trim()
  const configuredModel = process.env.OPENCODE_MODEL?.trim()
  const openCodeDefaultModel: OpenCodeModelSelection | null = configuredProvider && configuredModel
    ? { providerID: configuredProvider, modelID: configuredModel }
    : defaultRecord && typeof defaultRecord.providerID === 'string' && typeof defaultRecord.modelID === 'string'
      ? { source: 'opencode', providerID: defaultRecord.providerID, modelID: defaultRecord.modelID }
      : null
  const defaultModel = openCodeDefaultModel && openCodeModels.some(model =>
    model.providerID === openCodeDefaultModel.providerID && model.modelID === openCodeDefaultModel.modelID
  )
    ? openCodeDefaultModel
    : listDirectProviderModels(false)[0] ?? openCodeDefaultModel
  const models = [
    ...openCodeModels,
    ...listDirectProviderModels(),
  ]
  return { models, defaultModel, ...(warning ? { warning } : {}) }
}

function parseJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  const candidate = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed
  let sanitized = ''
  let inString = false
  let escaped = false
  for (let index = 0; index < candidate.length; index++) {
    const character = candidate[index]!
    if (inString) {
      sanitized += character
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') {
      inString = true
      sanitized += character
    } else if (character === ',') {
      let next = index + 1
      while (/\s/.test(candidate[next] ?? '')) next++
      if (candidate[next] !== '}' && candidate[next] !== ']') sanitized += character
    } else {
      sanitized += character
    }
  }
  try {
    return JSON.parse(sanitized)
  } catch {
    throw new Error('Réponse IA illisible. Réessayez avec une demande plus précise.')
  }
}

export function validateSuggestedPrograms(value: unknown): SuggestedProgram[] {
  const raw = (value as { programs?: unknown } | null)?.programs
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_PROGRAMS) {
    throw new Error(`Le modèle doit contenir entre 1 et ${MAX_PROGRAMS} programmes.`)
  }
  const validated = raw.map((item, index) => {
    const program = item as Record<string, unknown>
    const title = typeof program?.title === 'string' ? program.title.trim() : ''
    const startTime = typeof program?.startTime === 'string' ? program.startTime : ''
    const endTime = typeof program?.endTime === 'string' ? program.endTime : ''
    const type = typeof program?.type === 'string' ? program.type.toUpperCase() : 'PAD'
    const durationMin = Number(program?.durationMin)
    const days = program?.days
    if (!title || title.length > 120) throw new Error(`Nom invalide pour le programme ${index + 1}.`)
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime) || endTime <= startTime) {
      throw new Error(`Horaires invalides pour « ${title} ».`)
    }
    if (!Array.isArray(days) || days.length < 1 || days.length > 7 || days.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
      throw new Error(`Jours invalides pour « ${title} ». Utilisez 0 pour dimanche et 6 pour samedi.`)
    }
    if (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 1440 || !ALLOWED_TYPES.has(type)) {
      throw new Error(`Durée ou type invalide pour « ${title} ».`)
    }
    const [startHour, startMinute] = startTime.split(':').map(Number)
    const [endHour, endMinute] = endTime.split(':').map(Number)
    const actualDuration = (endHour! * 60 + endMinute!) - (startHour! * 60 + startMinute!)
    if (Math.abs(actualDuration - durationMin) > 1) throw new Error(`La durée ne correspond pas aux horaires de « ${title} ».`)
    const category = typeof program.category === 'string' ? program.category.trim().slice(0, 80) : undefined
    const description = typeof program.description === 'string' ? program.description.trim().slice(0, 500) : undefined
    return { title, startTime, endTime, durationMin, days: [...new Set(days as number[])], type: type as SuggestedProgram['type'], ...(category ? { category } : {}), ...(description ? { description } : {}) }
  })
  for (let i = 0; i < validated.length; i++) {
    const current = validated[i]!
    const start = current.startTime.split(':').map(Number).reduce((hours, part) => hours * 60 + part, 0)
    const end = current.endTime.split(':').map(Number).reduce((hours, part) => hours * 60 + part, 0)
    for (let j = 0; j < i; j++) {
      const prior = validated[j]!
      if (!current.days.some(day => prior.days.includes(day))) continue
      const priorStart = prior.startTime.split(':').map(Number).reduce((hours, part) => hours * 60 + part, 0)
      const priorEnd = prior.endTime.split(':').map(Number).reduce((hours, part) => hours * 60 + part, 0)
      if (start < priorEnd && end > priorStart) throw new Error(`Chevauchement détecté entre « ${current.title} » et « ${prior.title} ».`)
    }
  }
  return validated
}

export async function generateGridTemplate(brief: string, selection?: OpenCodeModelSelection): Promise<SuggestedProgram[]> {
  const source = selection?.source ?? 'opencode'
  const baseUrl = process.env.OPENCODE_BASE_URL?.trim().replace(/\/+$/, '')
  if (source === 'opencode') {
    if (!baseUrl) throw new Error('La génération IA n’est pas configurée. Définissez OPENCODE_BASE_URL dans backend/.env.')
    let parsedBaseUrl: URL
    try {
      parsedBaseUrl = new URL(baseUrl)
    } catch {
      throw new Error('OPENCODE_BASE_URL doit être une URL HTTP ou HTTPS valide.')
    }
    if (!['http:', 'https:'].includes(parsedBaseUrl.protocol) || parsedBaseUrl.username || parsedBaseUrl.password) {
      throw new Error('OPENCODE_BASE_URL doit être une URL HTTP ou HTTPS sans identifiants intégrés.')
    }
  }
  if (selection?.source && selection.source !== 'opencode' && selection.source !== 'direct') {
    throw new OpenCodeRequestError(400, 'La source de génération choisie n’est pas prise en charge.')
  }
  const configuredModel = selection?.modelID ?? process.env.OPENCODE_MODEL?.trim()
  const configuredProvider = selection?.providerID ?? process.env.OPENCODE_PROVIDER_ID?.trim()
  if (configuredModel && !configuredProvider) {
    throw new Error('OPENCODE_PROVIDER_ID est requis lorsque OPENCODE_MODEL est défini.')
  }
  if (selection) {
    const availableModels = await listAvailableAiModels()
    if (!availableModels.models.some(model =>
      model.configured && model.source === source && model.providerID === selection.providerID && model.modelID === selection.modelID
    )) {
      throw new OpenCodeRequestError(400, 'Le modèle choisi n’est plus disponible. Actualisez la liste des modèles.')
    }
  }
  const prompt = [
    'Tu es un assistant de programmation télévisuelle. Génère un modèle de grille générique, qui peut concerner tout thème ou toute période, sans supposer Ramadan.',
    'Réponds uniquement avec un objet JSON de la forme {"programs":[{"title":"...","category":"...","type":"PAD","startTime":"06:00","endTime":"07:00","durationMin":60,"days":[1,2,3,4,5],"description":"..."}]}.',
    'Règles: heures au format 24h HH:mm; jours 0 dimanche, 1 lundi, ..., 6 samedi; type parmi LIVE, REPLAY, PAD, ADS, SPECIAL; durée entière en minutes; ne dépasse pas 70 programmes; propose une journée cohérente et des émissions plausibles; évite les chevauchements pour un même jour; pas de texte hors JSON.',
    `Demande de l’utilisateur: ${brief}`,
  ].join('\n\n')
  if (source === 'direct') {
    const directProvider = DIRECT_PROVIDERS.find(provider => provider.id === configuredProvider)
    if (!directProvider) throw new OpenCodeRequestError(400, 'Le fournisseur direct choisi n’est pas pris en charge.')
    const model = listDirectProviderModels(false).find(item => item.providerID === configuredProvider && item.modelID === configuredModel)
    if (!model) throw new OpenCodeRequestError(400, `Configurez ${directProvider.modelEnv} et sa clé API dans backend/.env avant de générer.`)
    const apiKey = directProvider.keyEnv ? process.env[directProvider.keyEnv]!.trim() : ''
    const baseUrl = process.env[directProvider.baseUrlEnv]?.trim().replace(/\/+$/, '') || directProvider.defaultBaseUrl
    let parsedUrl: URL
    try {
      parsedUrl = new URL(baseUrl)
    } catch {
      throw new OpenCodeRequestError(503, `${directProvider.baseUrlEnv} doit être une URL valide.`)
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
      throw new OpenCodeRequestError(503, `${directProvider.baseUrlEnv} doit être une URL HTTP ou HTTPS sans identifiants intégrés.`)
    }
    const requestHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (apiKey) requestHeaders.Authorization = `Bearer ${apiKey}`
    if (directProvider.protocol === 'anthropic') {
      delete requestHeaders.Authorization
      requestHeaders['x-api-key'] = apiKey
      requestHeaders['anthropic-version'] = '2023-06-01'
    }
    if (directProvider.protocol === 'google') {
      delete requestHeaders.Authorization
      requestHeaders['x-goog-api-key'] = apiKey
    }
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90_000)
    try {
      let endpoint: string
      let body: Record<string, unknown>
      if (directProvider.protocol === 'anthropic') {
        endpoint = `${baseUrl}/v1/messages`
        body = { model: configuredModel, max_tokens: 8192, system: prompt, messages: [{ role: 'user', content: 'Génère le JSON demandé.' }] }
      } else if (directProvider.protocol === 'google') {
        endpoint = `${baseUrl}/models/${encodeURIComponent(configuredModel!)}:generateContent`
        body = { systemInstruction: { parts: [{ text: prompt }] }, contents: [{ role: 'user', parts: [{ text: 'Génère le JSON demandé.' }] }], generationConfig: { responseMimeType: 'application/json' } }
      } else if (directProvider.protocol === 'ollama') {
        endpoint = `${baseUrl}/api/chat`
        body = { model: configuredModel, stream: false, format: 'json', messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Génère le JSON demandé.' }] }
      } else {
        endpoint = `${baseUrl}/chat/completions`
        body = { model: configuredModel, stream: false, messages: [{ role: 'system', content: prompt }, { role: 'user', content: 'Génère le JSON demandé.' }] }
      }
      let response: Response
      try {
        response = await fetch(endpoint, { method: 'POST', headers: requestHeaders, body: JSON.stringify(body), signal: controller.signal })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw new OpenCodeRequestError(504, 'La génération prend trop de temps. Réessayez.')
        throw new OpenCodeRequestError(502, `Impossible de joindre le fournisseur ${directProvider.name}. Vérifiez son URL et son état.`)
      }
      const responseText = await response.text()
      let responseBody: unknown
      try { responseBody = JSON.parse(responseText) } catch { responseBody = undefined }
      if (!response.ok) {
        const message = extractResponseMessage(responseBody)
        if (response.status === 401 || response.status === 403) throw new OpenCodeRequestError(502, `Authentification ou accès refusé par ${directProvider.name}. Vérifiez sa clé API et les droits du modèle.`)
        if (response.status === 429) throw new OpenCodeRequestError(503, `${directProvider.name} limite temporairement les requêtes. Réessayez plus tard.`)
        if (response.status === 503) throw new OpenCodeRequestError(503, `${directProvider.name} est temporairement indisponible (HTTP 503). Réessayez dans quelques instants. Si le problème persiste, vérifiez le modèle configuré et l’état du service fournisseur.`)
        if (response.status >= 500) throw new OpenCodeRequestError(502, `${directProvider.name} a rencontré une erreur de service (HTTP ${response.status}). Réessayez plus tard et vérifiez la configuration du modèle si le problème persiste.`)
        throw new OpenCodeRequestError(502, message || `La requête ${directProvider.name} a échoué (HTTP ${response.status}).`)
      }
      const responseData = responseBody as Record<string, unknown> | undefined
      let generatedText = ''
      if (directProvider.protocol === 'anthropic') {
        generatedText = (responseData?.content as Array<{ type?: string; text?: string }> | undefined)
          ?.filter(part => part.type === 'text' && typeof part.text === 'string').map(part => part.text).join('\n') ?? ''
      } else if (directProvider.protocol === 'google') {
        const candidates = responseData?.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined
        generatedText = candidates?.flatMap(candidate => candidate.content?.parts ?? []).map(part => part.text ?? '').join('\n') ?? ''
      } else if (directProvider.protocol === 'ollama') {
        const message = responseData?.message as { content?: unknown } | undefined
        generatedText = typeof message?.content === 'string' ? message.content : ''
      } else {
        const choices = responseData?.choices as Array<{ message?: { content?: unknown } }> | undefined
        const content = choices?.[0]?.message?.content
        generatedText = typeof content === 'string' ? content : Array.isArray(content)
          ? content.flatMap(part => part && typeof part === 'object' && typeof (part as { text?: unknown }).text === 'string' ? [(part as { text: string }).text] : []).join('\n')
          : ''
      }
      if (!generatedText.trim()) throw new OpenCodeRequestError(502, `${directProvider.name} n’a pas renvoyé de texte exploitable.`)
      return validateSuggestedPrograms(parseJson(generatedText))
    } finally {
      clearTimeout(timeout)
    }
  }
  const headers = getOpenCodeHeaders()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  let sessionID: string | undefined
  try {
    const request = async (path: string, init: RequestInit = {}): Promise<unknown> => {
      let response: Response
      try {
        response = await fetch(`${baseUrl}${path}`, {
          ...init,
          headers,
          signal: controller.signal,
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error
        throw new OpenCodeRequestError(502, 'Impossible de joindre le serveur OpenCode. Vérifiez son adresse et son état.')
      }
      const responseText = await response.text()
      let responseBody: unknown
      if (responseText) {
        try {
          responseBody = JSON.parse(responseText)
        } catch {
          responseBody = undefined
        }
      }
      if (!response.ok) {
        throw openCodeError(response.status, extractResponseMessage(responseBody))
      }
      return responseBody
    }

    const sessionResponse = await request('/api/session', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Proposition de grille TV',
        ...(configuredModel && configuredProvider
          ? { model: { providerID: configuredProvider, id: configuredModel } }
          : {}),
      }),
    }) as { data?: { id?: unknown } } | undefined
    const session = sessionResponse?.data
    if (!session || typeof session.id !== 'string' || !session.id) {
      throw new OpenCodeRequestError(502, 'OpenCode n’a pas créé de session exploitable.')
    }
    sessionID = session.id

    const result = await request(`/api/session/${encodeURIComponent(sessionID)}/generate`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }) as { data?: { text?: unknown } } | undefined
    const generatedText = typeof result?.data?.text === 'string' ? result.data.text : ''
    if (!generatedText.trim()) throw new OpenCodeRequestError(502, 'OpenCode n’a pas renvoyé de texte exploitable.')
    return validateSuggestedPrograms(parseJson(generatedText))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new OpenCodeRequestError(504, 'La génération prend trop de temps. Réessayez.')
    }
    throw error
  } finally {
    clearTimeout(timeout)
    if (sessionID) {
      const cleanupController = new AbortController()
      const cleanupTimeout = setTimeout(() => cleanupController.abort(), 3_000)
      try {
        const cleanup = await fetch(`${baseUrl}/api/session/${encodeURIComponent(sessionID)}`, {
          method: 'DELETE',
          headers,
          signal: cleanupController.signal,
        })
        if (!cleanup.ok) console.warn(`Nettoyage de session OpenCode échoué (HTTP ${cleanup.status}).`)
      } catch {
        console.warn('Impossible de nettoyer la session temporaire OpenCode.')
      } finally {
        clearTimeout(cleanupTimeout)
      }
    }
  }
}
