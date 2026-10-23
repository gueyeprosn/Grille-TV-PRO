import React, { useState } from 'react'
import { Modal } from './ui'
import { Keyboard } from 'lucide-react'
import { useKeyboardHelp } from '../hooks/useKeyboardShortcuts'
import Button from './ui/Button'

const KeyboardShortcutsHelp: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const shortcuts = useKeyboardHelp()

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        leftIcon={<Keyboard className="w-4 h-4" />}
        className="hidden md:inline-flex"
        title="Raccourcis clavier (?)"
      >
        Raccourcis
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        leftIcon={<Keyboard className="w-4 h-4" />}
        className="md:hidden"
        title="Raccourcis"
      />

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Raccourcis Clavier"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Utilisez ces raccourcis pour naviguer plus rapidement dans l'application.
          </p>
          <div className="space-y-2">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              >
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {shortcut.description}
                </span>
                <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded shadow-sm">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              💡 Astuce : Appuyez sur <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded">?</kbd> pour
              afficher cette aide à tout moment
            </p>
          </div>
        </div>
      </Modal>
    </>
  )
}

export default KeyboardShortcutsHelp

