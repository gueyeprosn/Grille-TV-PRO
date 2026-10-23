import React from 'react'
import { createPortal } from 'react-dom'
import { Button, Badge } from './ui'
import { Moon, Sun, FileText, LogOut, Plus, Download, FileDown, Calendar, Upload, Menu, X, Settings, Download as DownloadIcon } from 'lucide-react'
import { cn } from '../lib/utils'
import UIModeSelector from './UIModeSelector'
import { useUIModeStore } from '../lib/uiModeStore'
import { promptInstall, isInstalled } from '../lib/pwa'
import toast from 'react-hot-toast'

interface HeaderProps {
  user: { email?: string; displayName?: string } | null
  theme: 'light' | 'dark'
  onThemeToggle: () => void
  onAddProgram: () => void
  canCreatePrograms?: boolean
  onExportPDF: () => void
  onExportDayPDF?: () => void
  onExportCSV?: () => void
  onExportJSON?: () => void
  onExportEPG?: () => void
  onImportJSON?: () => void
  onLogout: () => void
  programsCount?: number
  selectedDay?: string
  viewMode?: string
}

const Header: React.FC<HeaderProps> = ({
  user,
  theme,
  onThemeToggle,
  onAddProgram,
  canCreatePrograms = true,
  onExportPDF,
  onExportDayPDF,
  onExportCSV,
  onExportJSON,
  onExportEPG,
  onImportJSON,
  onLogout,
  programsCount = 0,
  selectedDay,
  viewMode,
}) => {
  const { mode: uiMode } = useUIModeStore()
  const isRegieMode = uiMode === 'REGIE'
  const [showExportMenu, setShowExportMenu] = React.useState(false)
  const [showMobileMenu, setShowMobileMenu] = React.useState(false)
  const [showActionsMenu, setShowActionsMenu] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(new Date())
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false)
  const [isPWAInstalled, setIsPWAInstalled] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)
  const exportButtonRef = React.useRef<HTMLButtonElement>(null)
  const actionsMenuRef = React.useRef<HTMLDivElement>(null)
  const [exportMenuPosition, setExportMenuPosition] = React.useState({ top: 0, left: 0 })

  const updateExportMenuPosition = React.useCallback(() => {
    const button = exportButtonRef.current
    if (!button) return
    const rect = button.getBoundingClientRect()
    const menuWidth = 256
    setExportMenuPosition({
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
    })
  }, [])

  const toggleExportMenu = () => {
    if (!showExportMenu) updateExportMenuPosition()
    setShowExportMenu((open) => !open)
    setShowActionsMenu(false)
  }

  // Vérifier si PWA peut être installée
  React.useEffect(() => {
    setIsPWAInstalled(isInstalled())
    
    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      window.deferredPrompt = e
      setShowInstallPrompt(true)
      console.log('[PWA] Prompt d\'installation disponible')
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    // Vérifier si déjà installé
    if (isInstalled()) {
      setShowInstallPrompt(false)
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  // Gérer l'installation PWA
  const handleInstallPWA = async () => {
    const installed = await promptInstall()
    if (installed) {
      setShowInstallPrompt(false)
      setIsPWAInstalled(true)
      toast.success('✅ Application installée avec succès!')
    }
  }

  // Mise à jour de l'heure chaque seconde
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Ne pas fermer si on clique sur un élément du menu (bouton ou contenu)
      const target = event.target as Node
      
      if (
        showExportMenu &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        !exportButtonRef.current?.contains(target)
      ) {
        setShowExportMenu(false)
      }
      
      if (showActionsMenu && actionsMenuRef.current && !actionsMenuRef.current.contains(target)) {
        setShowActionsMenu(false)
      }
    }
    
    // Utiliser un petit délai pour éviter les conflits avec les clics sur les boutons
    const timeoutId = setTimeout(() => {
      if (showExportMenu || showActionsMenu) {
        document.addEventListener('mousedown', handleClickOutside, true)
      }
    }, 0)
    
    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('mousedown', handleClickOutside, true)
    }
  }, [showExportMenu, showActionsMenu])

  React.useEffect(() => {
    if (!showExportMenu) return
    updateExportMenuPosition()
    window.addEventListener('resize', updateExportMenuPosition)
    window.addEventListener('scroll', updateExportMenuPosition, true)
    return () => {
      window.removeEventListener('resize', updateExportMenuPosition)
      window.removeEventListener('scroll', updateExportMenuPosition, true)
    }
  }, [showExportMenu, updateExportMenuPosition])
  return (
    <header 
      className="sticky top-0 z-50 w-full flex-shrink-0 border-b backdrop-blur-xl shadow-sm transition-all"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: 'var(--card-bg-solid)',
        opacity: 0.98,
        position: 'sticky',
      }}
    >
      <div className="container mx-auto px-2 sm:px-4">
        <div 
          className="flex h-13 sm:h-14 items-center justify-between gap-2" 
          style={{ 
            minHeight: '3.25rem', 
            flexWrap: 'nowrap', 
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {/* Logo & Brand - Version compacte broadcast */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="relative">
              <img
                src={`${import.meta.env.BASE_URL || '/'}logo.svg`}
                alt="Logo GrilleTV Pro"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-slate-700 shadow-md object-cover"
              />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full border border-slate-900 animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-[var(--text-primary)]">
                  Broadcast SN
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded font-bold">
                  PRO V4
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1 font-medium leading-none mt-0.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {user?.email?.split('@')[0] || 'Non connecté'}
              </p>
            </div>
          </div>

          {/* Statut Broadcast & Horloge live intégrée */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 shadow-inner flex-shrink-0">
            <div className="font-mono text-xs sm:text-sm font-black tracking-widest text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.35)]">
              {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/40 px-1.5 py-0.5 rounded text-[10px] font-extrabold text-red-400">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span>LIVE</span>
            </div>
            {!isRegieMode && programsCount > 0 && (
              <span className="hidden lg:inline text-[11px] font-mono text-slate-400 border-l border-slate-800 pl-2">
                {programsCount} prog.
              </span>
            )}
          </div>

          {/* Actions principales - Desktop */}
          {!isRegieMode && (
            <div className="hidden md:flex items-center gap-2 flex-nowrap flex-shrink-0">
              {/* Groupe : Export/Import */}
              <Button
                ref={exportButtonRef}
                variant="ghost"
                size="sm"
                aria-expanded={showExportMenu}
                aria-controls={showExportMenu ? 'desktop-export-menu' : undefined}
                onClick={toggleExportMenu}
                leftIcon={<Download className="w-3.5 h-3.5 text-blue-400" />}
                className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/70 font-semibold text-xs px-2.5 py-1 rounded-lg transition-all"
              >
                <span>Export</span>
              </Button>
              {showExportMenu && createPortal(
                <div 
                  id="desktop-export-menu"
                  ref={menuRef}
                  className="fixed w-64 rounded-xl shadow-2xl border-2 py-2 z-[110] animate-fade-in overflow-y-auto"
                  style={{
                    top: exportMenuPosition.top,
                    left: exportMenuPosition.left,
                    maxHeight: `calc(100vh - ${exportMenuPosition.top + 8}px)`,
                    backgroundColor: 'var(--card-bg-solid)',
                    borderColor: 'var(--card-border)',
                    zIndex: 110,
                  }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                      Exports
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onExportPDF()
                      // Délai pour permettre l'export avant de fermer
                      setTimeout(() => setShowExportMenu(false), 100)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-surface-hover transition-colors font-medium"
                    style={{ color: 'var(--card-text)' }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF Hebdomadaire</span>
                  </button>
                  {onExportDayPDF && (viewMode === "day" || viewMode === "week") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExportDayPDF()
                        setTimeout(() => setShowExportMenu(false), 100)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 border-t hover:bg-surface-hover transition-colors font-medium"
                      style={{ 
                        color: 'var(--card-text)',
                        borderColor: 'var(--card-border)',
                      }}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>PDF {selectedDay || "Journalier"}</span>
                    </button>
                  )}
                  {onExportCSV && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExportCSV()
                        setTimeout(() => setShowExportMenu(false), 100)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-surface-hover transition-colors font-medium"
                      style={{ color: 'var(--card-text)' }}
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                  )}
                  {onExportJSON && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExportJSON()
                        setTimeout(() => setShowExportMenu(false), 100)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-surface-hover transition-colors font-medium"
                      style={{ color: 'var(--card-text)' }}
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export JSON</span>
                    </button>
                  )}
                  {onExportEPG && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onExportEPG()
                        setTimeout(() => setShowExportMenu(false), 100)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 border-t hover:bg-surface-hover transition-colors font-medium"
                      style={{ 
                        color: 'var(--card-text)',
                        borderColor: 'var(--card-border)',
                      }}
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Export EPG (vMix)</span>
                    </button>
                  )}
                  {onImportJSON && (
                    <>
                      <div className="px-3 py-2 border-t mt-1" style={{ borderColor: 'var(--card-border)' }}>
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                          Import
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onImportJSON()
                          setTimeout(() => setShowExportMenu(false), 100)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-surface-hover transition-colors font-medium"
                        style={{ color: 'var(--card-text)' }}
                      >
                        <Upload className="w-4 h-4" />
                        <span>Importer JSON</span>
                      </button>
                    </>
                  )}
                </div>
              , document.body)}


            {/* Bouton Installation PWA - Visible uniquement sur mobile et si disponible */}
            {showInstallPrompt && !isPWAInstalled && (
              <div className="md:hidden flex-shrink-0">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={handleInstallPWA}
                  leftIcon={<DownloadIcon className="w-4 h-4" />}
                  className="font-semibold text-xs px-3 py-1.5 shadow-lg"
                  title="Installer l'application"
                >
                  Installer
                </Button>
              </div>
            )}

            {/* Sélecteur de mode UI - Version compacte - Toujours visible */}
            <div className="flex-shrink-0">
              <UIModeSelector />
            </div>

            {/* Groupe : Paramètres - Version compacte - Masqué en mode Régie */}
            {!isRegieMode && (
              <div className="flex items-center gap-1.5 border-l border-slate-700/60 pl-2 flex-shrink-0">
                <button
                  type="button"
                  aria-label={`Passer en mode ${theme === 'dark' ? 'clair' : 'sombre'}`}
                  onClick={onThemeToggle}
                  className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 transition-all shadow-sm"
                  title={`Passer en mode ${theme === 'dark' ? 'clair' : 'sombre'}`}
                >
                  {theme === 'dark' ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-400" />}
                </button>
                <button
                  type="button"
                  aria-label="Se déconnecter"
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 hover:text-red-100 border border-red-800/50 text-xs font-semibold transition-all shadow-sm"
                  title="Se déconnecter"
                >
                  <LogOut className="w-3 h-3 text-red-400" />
                  <span className="hidden lg:inline">Quitter</span>
                </button>
              </div>
            )}
            </div>
          )}

          {/* Actions mobiles - Menu hamburger - Masquées en mode Régie */}
          {!isRegieMode && (
            <div className="md:hidden flex items-center gap-2">
              {/* Bouton principal mobile */}
              {canCreatePrograms && <Button
                variant="primary"
                size="sm"
                aria-label="Nouveau programme"
                onClick={onAddProgram}
                leftIcon={<Plus className="w-5 h-5" />}
                className="min-h-11 min-w-11 font-bold px-3 py-2"
              >
                <span className="hidden sm:inline">Nouveau</span>
              </Button>}

              {/* Menu actions mobiles */}
              <div className="relative" ref={actionsMenuRef}>
              <Button
                variant="ghost"
                size="sm"
                aria-label={showActionsMenu ? 'Fermer le menu des actions' : 'Ouvrir le menu des actions'}
                aria-expanded={showActionsMenu}
                aria-controls={showActionsMenu ? 'mobile-actions-menu' : undefined}
                onClick={() => {
                  setShowActionsMenu(!showActionsMenu)
                  setShowExportMenu(false)
                }}
                leftIcon={showActionsMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                className="min-h-11 min-w-11 px-3"
              />
              {showActionsMenu && (
                <div
                  id="mobile-actions-menu"
                  className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border-2 py-2 z-50 animate-fade-in"
                  style={{
                    backgroundColor: 'var(--card-bg-solid)',
                    borderColor: 'var(--card-border)',
                  }}
                >
                  <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                      Actions
                    </span>
                  </div>
                  


                  <div className="px-3 py-2 border-t mt-1" style={{ borderColor: 'var(--card-border)' }}>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                      Exports
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onExportPDF()
                      setShowActionsMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-surface-hover transition-colors font-medium"
                    style={{ color: 'var(--card-text)' }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF Hebdomadaire</span>
                  </button>
                  
                  {onExportDayPDF && (viewMode === "day" || viewMode === "week") && (
                    <button
                      onClick={() => {
                        onExportDayPDF()
                        setShowActionsMenu(false)
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-surface-hover transition-colors font-medium"
                      style={{ color: 'var(--card-text)' }}
                    >
                      <Calendar className="w-4 h-4" />
                      <span>PDF {selectedDay || "Journalier"}</span>
                    </button>
                  )}

                  {onImportJSON && (
                    <>
                      <div className="px-3 py-2 border-t mt-1" style={{ borderColor: 'var(--card-border)' }}>
                        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                          Import
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          onImportJSON()
                          setShowActionsMenu(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-surface-hover transition-colors font-medium"
                        style={{ color: 'var(--card-text)' }}
                      >
                        <Upload className="w-4 h-4" />
                        <span>Importer JSON</span>
                      </button>
                    </>
                  )}

                  <div className="px-3 py-2 border-t mt-1" style={{ borderColor: 'var(--card-border)' }}>
                    <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                      Paramètres
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onThemeToggle()
                      setShowActionsMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-surface-hover transition-colors font-medium"
                    style={{ color: 'var(--card-text)' }}
                  >
                    {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onLogout()
                      setShowActionsMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium text-red-600 dark:text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

