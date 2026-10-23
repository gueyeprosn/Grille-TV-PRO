import React, { useEffect } from 'react'

// ----------------------
// 🧩 Types
// ----------------------

interface DetailItem {
  label: string
  value: string | number
}

interface ConfirmModalProps {
  open: boolean
  title: string
  description?: string
  details?: DetailItem[]
  onCancel?: () => void
  onConfirm?: () => void
  confirmLabel?: string
  cancelLabel?: string
}

// ----------------------
// 💬 Composant principal
// ----------------------

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  details = [],
  onCancel,
  onConfirm,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
}) => {
  // 🔹 Gestion de la touche Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel?.()
      }
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  // 🔹 Rendu principal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* Contenu de la modale */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        className="relative max-w-lg w-full bg-white rounded-2xl shadow-xl p-6 border border-slate-200"
      >
        <h3
          id="confirm-modal-title"
          className="text-lg font-semibold text-slate-900"
        >
          {title}
        </h3>
        {description && (
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        )}

        {/* Détails */}
        {details.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            {details.map((d, i) => (
              <div
                key={i}
                className="flex justify-between text-sm text-slate-700 bg-slate-50 p-2 rounded"
              >
                <div className="font-medium">{d.label}</div>
                <div className="text-slate-500">{d.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Boutons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn btn-ghost btn-sm"
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary btn-sm"
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal