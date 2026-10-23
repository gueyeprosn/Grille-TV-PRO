import React from 'react'
import { Modal, Button } from './ui'

interface CreateGridModalProps {
  isOpen: boolean
  newGridData: {
    name: string
    type: 'weekly' | 'special' | 'ramadan'
    startDate: string
    endDate: string
  }
  onNewGridDataChange: (data: {
    name: string
    type: 'weekly' | 'special' | 'ramadan'
    startDate: string
    endDate: string
  }) => void
  onClose: () => void
  onSubmit: () => void
}

const CreateGridModal: React.FC<CreateGridModalProps> = ({
  isOpen,
  newGridData,
  onNewGridDataChange,
  onClose,
  onSubmit,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer une nouvelle grille"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Nom de la grille *
          </label>
          <input
            type="text"
            value={newGridData.name}
            onChange={(e) => onNewGridDataChange({ ...newGridData, name: e.target.value })}
            placeholder="Ex: Grille Semaine 1 - Janvier 2025"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--card-bg-solid)',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Type de grille *
          </label>
          <select
            value={newGridData.type}
            onChange={(e) =>
              onNewGridDataChange({
                ...newGridData,
                type: e.target.value as 'weekly' | 'special' | 'ramadan',
              })
            }
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--card-bg-solid)',
              color: 'var(--text-primary)',
            }}
          >
            <option value="weekly">Hebdomadaire</option>
            <option value="special">Spéciale</option>
            <option value="ramadan">Ramadan</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Date de début *
            </label>
            <input
              type="date"
              value={newGridData.startDate}
              onChange={(e) => onNewGridDataChange({ ...newGridData, startDate: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--card-bg-solid)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Date de fin *
            </label>
            <input
              type="date"
              value={newGridData.endDate}
              onChange={(e) => onNewGridDataChange({ ...newGridData, endDate: e.target.value })}
              min={newGridData.startDate}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--card-bg-solid)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            disabled={!newGridData.name || !newGridData.startDate || !newGridData.endDate}
          >
            Créer la grille
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default CreateGridModal