import React, { useMemo, useState } from 'react'
import { FileUp, RefreshCw } from 'lucide-react'
import Button from '../ui/Button'
import { getBroadcastClock } from '../../lib/broadcastClock'
import RegieCurrentProgram from './RegieCurrentProgram'
import { decodeInstaPlaylistXml, getCurrentPlaylistItem, parseInstaPlaylistXml, type InstaPlaylistItem } from './instaPlaylist'

interface InstaPlaylistFallbackProps {
  currentTime: Date
}

const MAX_PLAYLIST_SIZE_BYTES = 20 * 1024 * 1024

function formatBroadcastTime(timestamp: number): string {
  const { hour, minute } = getBroadcastClock(new Date(timestamp))
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

const InstaPlaylistFallback: React.FC<InstaPlaylistFallbackProps> = ({ currentTime }) => {
  const [items, setItems] = useState<InstaPlaylistItem[]>([])
  const [fileName, setFileName] = useState('')
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [error, setError] = useState('')

  const currentItem = useMemo(
    () => startedAt === null ? null : getCurrentPlaylistItem(items, startedAt, currentTime.getTime()),
    [items, startedAt, currentTime]
  )

  const program = currentItem ? {
    id: `instaplayout-${currentItem.index}`,
    title: currentItem.item.title,
    start: formatBroadcastTime(currentItem.startAt),
    end: formatBroadcastTime(currentItem.endAt),
    duration: Math.max(1, Math.ceil(currentItem.item.durationSeconds / 60)),
    type: 'PAD' as const,
    category: 'Playlist InstaPlayout',
    days: [],
  } : null

  const importPlaylist = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    const file = input.files?.[0]
    if (!file) return
    setError('')

    try {
      if (file.size > MAX_PLAYLIST_SIZE_BYTES) {
        throw new Error('Le fichier dépasse la taille maximale autorisée de 20 Mo.')
      }
      const parsedItems = parseInstaPlaylistXml(decodeInstaPlaylistXml(await file.arrayBuffer()))
      setItems(parsedItems)
      setFileName(file.name)
      setStartedAt(null)
    } catch (loadError) {
      setItems([])
      setFileName('')
      setStartedAt(null)
      setError(loadError instanceof Error ? loadError.message : 'Impossible de lire ce fichier XML.')
    } finally {
      input.value = ''
    }
  }

  const selectFile = (
    <label
      htmlFor="instaplayout-playlist-file"
      className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-amber-500"
    >
      <FileUp aria-hidden="true" className="h-4 w-4" />
      {items.length ? 'Changer de fichier XML' : 'Importer le XML InstaPlayout'}
      <input
        id="instaplayout-playlist-file"
        className="sr-only"
        type="file"
        accept=".xml,application/xml,text/xml"
        onChange={importPlaylist}
      />
    </label>
  )

  return (
    <section aria-label="Suivi de la playlist InstaPlayout">
      <RegieCurrentProgram
        program={program}
        currentTime={currentTime}
        sourceLabel={program ? 'InstaPlayout · estimation synchronisée' : undefined}
      />

      <div className="mx-auto mt-4 max-w-[1400px] rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-slate-200">
        {items.length === 0 ? (
          <>
            <p className="text-base font-semibold">Aucun programme de grille en cours</p>
            <p className="mt-1 text-sm text-slate-300">
              Importez le fichier XML de la playlist locale pour calculer le média diffusé à partir de l’ordre et des durées.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold" title={fileName}>Playlist chargée : {fileName}</p>
            <p className="mt-1 text-sm text-slate-300">
              {items.length} médias. Ce fichier ne fournit pas l’état réel du lecteur : le média affiché est calculé depuis l’heure de synchronisation.
            </p>
            {startedAt === null ? (
              <p className="mt-2 text-sm text-amber-200">
                Lancez la lecture dans InstaPlayout, puis cliquez immédiatement sur « Synchroniser avec la lecture ».
              </p>
            ) : currentItem ? (
              <p role="status" aria-atomic="true" className="mt-2 text-sm text-emerald-300">
                Suivi actif depuis {formatBroadcastTime(startedAt)} · média {currentItem.index + 1} sur {items.length}
              </p>
            ) : (
              <p role="status" aria-atomic="true" className="mt-2 text-sm text-amber-200">
                La durée totale de la playlist est dépassée. Relancez la lecture et synchronisez à nouveau.
              </p>
            )}
          </>
        )}

        {error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {selectFile}
          {items.length > 0 && (
            <Button
              variant="primary"
              size="md"
              leftIcon={<RefreshCw aria-hidden="true" className="h-4 w-4" />}
              onClick={() => {
                setStartedAt(Date.now())
                setError('')
              }}
            >
              {startedAt === null ? 'Synchroniser avec la lecture' : 'Resynchroniser la lecture'}
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}

export default InstaPlaylistFallback
