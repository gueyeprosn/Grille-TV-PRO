import { useEffect } from 'react'

export interface KeyboardShortcuts {
  onAdd?: () => void
  onSearch?: () => void
  onExport?: () => void
  onSave?: () => void
  onToggleTheme?: () => void
  onToggleView?: () => void
  onNextDay?: () => void
  onPrevDay?: () => void
  onClose?: () => void
  onRefresh?: () => void
  onAudit?: () => void
  onDashboard?: () => void
  onRegie?: () => void
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorer si on est dans un input, textarea, ou contenteditable
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        // Permettre Escape et Ctrl/Cmd + K pour recherche
        if (e.key === 'Escape' && shortcuts.onClose) {
          shortcuts.onClose()
          return
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
          e.preventDefault()
          shortcuts.onSearch?.()
          return
        }
        return
      }

      // Raccourcis avec Ctrl/Cmd
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault()
            shortcuts.onAdd?.()
            break
          case 'k':
            e.preventDefault()
            shortcuts.onSearch?.()
            break
          case 'e':
            e.preventDefault()
            shortcuts.onExport?.()
            break
          case 's':
            e.preventDefault()
            shortcuts.onSave?.()
            break
          case 'b':
            e.preventDefault()
            shortcuts.onToggleTheme?.()
            break
          case 'v':
            e.preventDefault()
            shortcuts.onToggleView?.()
            break
          case 'r':
            if (e.shiftKey) {
              e.preventDefault()
              shortcuts.onRefresh?.()
            }
            break
          case 'a':
            if (e.shiftKey) {
              e.preventDefault()
              shortcuts.onAudit?.()
            }
            break
          case 'd':
            if (e.shiftKey) {
              e.preventDefault()
              shortcuts.onDashboard?.()
            }
            break
        }
        return
      }

      // Raccourcis avec Ctrl/Cmd + Shift
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'r':
            e.preventDefault()
            shortcuts.onRegie?.()
            break
        }
        return
      }

      // Raccourcis simples
      switch (e.key) {
        case 'Escape':
          shortcuts.onClose?.()
          break
        case 'ArrowRight':
          if (e.shiftKey) {
            e.preventDefault()
            shortcuts.onNextDay?.()
          }
          break
        case 'ArrowLeft':
          if (e.shiftKey) {
            e.preventDefault()
            shortcuts.onPrevDay?.()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

// Hook pour afficher l'aide des raccourcis
export function useKeyboardHelp() {
  const shortcuts = [
    { key: 'Ctrl/Cmd + N', description: 'Ajouter un programme' },
    { key: 'Ctrl/Cmd + K', description: 'Rechercher' },
    { key: 'Ctrl/Cmd + E', description: 'Exporter PDF' },
    { key: 'Ctrl/Cmd + S', description: 'Sauvegarder dans le cloud' },
    { key: 'Ctrl/Cmd + B', description: 'Basculer thème clair/sombre' },
    { key: 'Ctrl/Cmd + V', description: 'Basculer vue jour/semaine' },
    { key: 'Ctrl/Cmd + Shift + R', description: 'Basculer Mode Régie' },
    { key: 'Ctrl/Cmd + Shift + A', description: 'Ouvrir Historique Audit' },
    { key: 'Ctrl/Cmd + Shift + D', description: 'Ouvrir Dashboard' },
    { key: 'Ctrl/Cmd + Shift + R', description: 'Actualiser les données' },
    { key: 'Shift + →', description: 'Jour suivant' },
    { key: 'Shift + ←', description: 'Jour précédent' },
    { key: 'Escape', description: 'Fermer modale/recherche' },
    { key: 'F11', description: 'Plein écran (Mode Régie)' },
  ]

  return shortcuts
}

