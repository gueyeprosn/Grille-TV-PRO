export interface InstaPlaylistItem {
  title: string
  durationSeconds: number
  loop: boolean
}

export interface CurrentPlaylistItem {
  item: InstaPlaylistItem
  index: number
  startAt: number
  endAt: number
}

const XML_INVALID_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g

export function decodeInstaPlaylistXml(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  const hasUtf16LeBom = bytes[0] === 0xff && bytes[1] === 0xfe
  const hasUtf16BeBom = bytes[0] === 0xfe && bytes[1] === 0xff
  const isUtf16Le = hasUtf16LeBom || (bytes[0] === 0x3c && bytes[1] === 0x00)
  const isUtf16Be = hasUtf16BeBom || (bytes[0] === 0x00 && bytes[1] === 0x3c)
  const encoding = isUtf16Le ? 'utf-16le' : isUtf16Be ? 'utf-16be' : 'utf-8'
  return new TextDecoder(encoding).decode(buffer)
}

function findMarkupEnd(xml: string, start: number): number {
  let quote = ''
  for (let index = start + 1; index < xml.length; index += 1) {
    const character = xml[index]
    if (quote) {
      if (character === quote) quote = ''
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '>') {
      return index
    }
  }
  return -1
}

function decodeXmlAttribute(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, reference: string) => {
    if (reference.toLowerCase() === 'amp') return '&'
    if (reference.toLowerCase() === 'lt') return '<'
    if (reference.toLowerCase() === 'gt') return '>'
    if (reference.toLowerCase() === 'quot') return '"'
    if (reference.toLowerCase() === 'apos') return "'"
    const codePoint = reference.toLowerCase().startsWith('#x')
      ? Number.parseInt(reference.slice(2), 16)
      : Number.parseInt(reference.slice(1), 10)
    return Number.isFinite(codePoint) && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
  })
}

function getFileAttributes(xml: string): Array<Record<string, string>> {
  const files: Array<Record<string, string>> = []
  let index = 0

  while (index < xml.length) {
    const start = xml.indexOf('<', index)
    if (start === -1) break
    if (xml.startsWith('<!--', start)) {
      const commentEnd = xml.indexOf('-->', start + 4)
      if (commentEnd === -1) throw new Error('Le fichier XML de playlist est incomplet.')
      index = commentEnd + 3
      continue
    }
    if (xml.startsWith('<![CDATA[', start)) {
      const cdataEnd = xml.indexOf(']]>', start + 9)
      if (cdataEnd === -1) throw new Error('Le fichier XML de playlist est incomplet.')
      index = cdataEnd + 3
      continue
    }

    const end = findMarkupEnd(xml, start)
    if (end === -1) throw new Error('Le fichier XML de playlist est incomplet.')
    const markup = xml.slice(start, end + 1)
    const elementName = /^<\s*([^\s/>]+)/.exec(markup)?.[1]
    if (elementName === 'file') {
      const attributeText = markup.slice(markup.indexOf(elementName) + elementName.length, -1)
      const attributePattern = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
      const attributes: Record<string, string> = {}
      for (const match of attributeText.matchAll(attributePattern)) {
        const name = match[1]
        if (name) attributes[name] = decodeXmlAttribute(match[2] ?? match[3] ?? '')
      }
      files.push(attributes)
    }
    index = end + 1
  }

  return files
}

export function parseInstaPlaylistXml(xml: string): InstaPlaylistItem[] {
  const files = getFileAttributes(xml.replace(XML_INVALID_CHARACTERS, ''))
  const items = files.flatMap((file, index): InstaPlaylistItem[] => {
    const path = file.path?.trim()
    const durationValue = file.duration || file['img.default_duration']
    if (!path && !durationValue) return []
    const durationSeconds = Number(durationValue)

    if (!path || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new Error(`Le média ${index + 1} ne contient pas de chemin ou de durée exploitable.`)
    }

    const fileName = path.split(/[\\/]/).pop() || `Média ${index + 1}`
    const title = fileName.replace(/\.[^.]+$/, '').trim() || `Média ${index + 1}`
    return [{
      title,
      durationSeconds,
      loop: file.loop?.toLowerCase() === 'true',
    }]
  })

  if (items.length === 0) {
    throw new Error('Aucun média n’a été trouvé dans ce fichier XML InstaPlayout.')
  }
  return items
}

export function getCurrentPlaylistItem(
  items: InstaPlaylistItem[],
  startedAt: number,
  now: number
): CurrentPlaylistItem | null {
  const elapsedSeconds = Math.max(0, (now - startedAt) / 1000)
  let offsetSeconds = 0

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index]
    if (!item) continue
    const endOffsetSeconds = offsetSeconds + item.durationSeconds

    if (elapsedSeconds < endOffsetSeconds || item.loop) {
      const itemElapsedSeconds = elapsedSeconds - offsetSeconds
      const loopOffsetSeconds = item.loop
        ? Math.floor(itemElapsedSeconds / item.durationSeconds) * item.durationSeconds
        : 0
      const startAt = startedAt + (offsetSeconds + loopOffsetSeconds) * 1000
      return {
        item,
        index,
        startAt,
        endAt: startAt + item.durationSeconds * 1000,
      }
    }

    offsetSeconds = endOffsetSeconds
  }

  return null
}
