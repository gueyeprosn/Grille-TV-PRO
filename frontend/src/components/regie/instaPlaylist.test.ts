import { describe, expect, it } from 'vitest'
import { decodeInstaPlaylistXml, getCurrentPlaylistItem, parseInstaPlaylistXml } from './instaPlaylist'

describe('InstaPlayout playlist helpers', () => {
  it('decodes UTF-16 little-endian XML without a byte-order mark', () => {
    const text = '<m_config />'
    const bytes = new Uint8Array(text.length * 2)
    for (let index = 0; index < text.length; index += 1) {
      bytes[index * 2] = text.charCodeAt(index)
    }

    expect(decodeInstaPlaylistXml(bytes.buffer)).toBe(text)
  })

  it('reads media paths and durations from InstaPlayout XML with legacy invalid characters', () => {
    const xml = [
      '<m_config>',
      '<object><file /></object>',
      '<file path="D:\\\\Playlist\\\\Journal & Magazine.mp4" duration="61.5" loop="false"><info /></file>',
      '<file path="D:\\\\Playlist\\\\Jingle.mp4" duration="8" loop="true" />',
      '</m_config>',
    ].join('')

    expect(parseInstaPlaylistXml(xml)).toEqual([
      { title: 'Journal & Magazine', durationSeconds: 61.5, loop: false },
      { title: 'Jingle', durationSeconds: 8, loop: true },
    ])
  })

  it('reports unusable playlist entries instead of silently changing playlist timing', () => {
    expect(() => parseInstaPlaylistXml('<m_config><file path="clip.mp4" duration="0" /></m_config>'))
      .toThrow('Le média 1 ne contient pas de chemin ou de durée exploitable.')
  })

  it('selects the item at the elapsed playlist offset and stops after the final item', () => {
    const items = [
      { title: 'Premier', durationSeconds: 60, loop: false },
      { title: 'Deuxième', durationSeconds: 90, loop: false },
    ]

    expect(getCurrentPlaylistItem(items, 1_000, 60_999)?.item.title).toBe('Premier')
    expect(getCurrentPlaylistItem(items, 1_000, 61_000)).toMatchObject({
      item: items[1],
      index: 1,
      startAt: 61_000,
      endAt: 151_000,
    })
    expect(getCurrentPlaylistItem(items, 1_000, 151_000)).toBeNull()
  })

  it('keeps a looping media active while advancing its estimated segment', () => {
    const item = { title: 'Boucle', durationSeconds: 10, loop: true }
    expect(getCurrentPlaylistItem([item], 1_000, 12_500)).toEqual({
      item,
      index: 0,
      startAt: 11_000,
      endAt: 21_000,
    })
  })
})
