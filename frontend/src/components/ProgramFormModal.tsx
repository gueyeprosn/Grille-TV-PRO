import React from 'react'
import { Modal } from './ui'
import ProgramFormModern from './ProgramFormModern'

interface ProgramFormModalProps {
  isOpen: boolean
  editing: any
  onSave: (program: any) => void | Promise<void>
  onCancel: () => void
}

const ProgramFormModal: React.FC<ProgramFormModalProps> = ({
  isOpen,
  editing,
  onSave,
  onCancel,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={editing ? "Modifier un programme" : "Nouveau programme"}
      size="xl"
      className="max-h-[92vh] overflow-hidden"
      contentClassName="flex min-h-0 flex-col overflow-hidden p-0 max-h-[calc(92vh-100px)]"
    >
      <ProgramFormModern
        editing={editing ?? undefined}
        onSave={onSave}
        onCancel={onCancel}
      />
    </Modal>
  )
}

export default ProgramFormModal
