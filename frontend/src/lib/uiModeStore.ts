/**
 * Store de gestion du mode UI pour GrilleTV Pro V4
 * 
 * Modes disponibles :
 * - STANDARD : Interface standard pour production/coordination
 * - REGIE : Mode optimisé pour régie ON AIR (lisibilité maximale, contraste élevé)
 * - DIRECTION : Mode pour direction des programmes (vue globale, statistiques)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UIMode = 'STANDARD' | 'REGIE' | 'DIRECTION'

interface UIModeState {
  mode: UIMode
  setMode: (mode: UIMode) => void
  isRegieMode: () => boolean
  isDirectionMode: () => boolean
  isStandardMode: () => boolean
}

export const useUIModeStore = create<UIModeState>()(
  persist(
    (set, get) => ({
      mode: 'STANDARD',
      setMode: (mode: UIMode) => set({ mode }),
      isRegieMode: () => get().mode === 'REGIE',
      isDirectionMode: () => get().mode === 'DIRECTION',
      isStandardMode: () => get().mode === 'STANDARD',
    }),
    {
      name: 'grilletv-ui-mode',
      version: 1,
    }
  )
)

