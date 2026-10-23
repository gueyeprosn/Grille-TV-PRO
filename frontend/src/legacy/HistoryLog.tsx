import React from 'react'
import { formatDistanceToNow } from './lib/relativeTime.js'
import Button from './Button.js'

// ----------------------
// 🧩 Types
// ----------------------

interface HistoryMeta {
  details?: string[]
  [key: string]: any
}

export interface HistoryEntry {
  id: string
  timestamp: number | string
  action: string
  description?: string
  meta?: HistoryMeta
}

interface HistoryItemProps {
  entry: HistoryEntry
}

interface HistoryLogProps {
  history: HistoryEntry[]
  onClear: () => void
}

// ----------------------
// 📜 Élément individuel
// ----------------------

const HistoryItem: React.FC<HistoryItemProps> = ({ entry }) => {
  const { timestamp, action, description, meta } = entry
  const date = new Date(timestamp)

  return (
    <div className="history-item rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-primary">{action}</div>
        <div className="text-xs text-muted dark:text-slate-300">
          {formatDistanceToNow(date)}
        </div>
      </div>
      {description && (
        <div className="mt-1 text-xs text-muted whitespace-pre-line dark:text-slate-300">
          {description}
        </div>
      )}
      {meta?.details?.length ? (
        <ul className="mt-2 text-[11px] text-muted space-y-1 list-disc list-inside dark:text-slate-300">
          {meta.details.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

// ----------------------
// 🗂️ Liste complète
// ----------------------

const HistoryLog: React.FC<HistoryLogProps> = ({ history, onClear }) => {
  return (
    <div className="space-y-3 text-primary">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500 dark:text-slate-300">
          {history.length
            ? `${history.length} évènement${
                history.length > 1 ? 's' : ''
              } enregistrés`
            : 'Aucune activité pour le moment.'}
        </div>
        {history.length > 0 && (
          <Button size="sm" variant="outline" onClick={onClear}>
            Vider l’historique
          </Button>
        )}
      </div>

      {history.length > 0 && (
        <div className="space-y-2">
          {history.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

export default HistoryLog