// orca-fork: ⌘⇧L / Ctrl+Shift+L switches the open sidebar between full and the icon rail (⌘B still hides it).
import { useEffect } from 'react'
import { isMac } from '@/app-shell/chrome/app-window-chrome'
import { useAppStore } from '@/store'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { setForkSidebarMode, toggleForkSidebarMode } from './sidebar-mode-store'

export const FORK_SIDEBAR_MODE_SHORTCUT_LABEL = isMac ? '⌘⇧L' : 'Ctrl+Shift+L'

export function useForkSidebarModeShortcut(): void {
  useEffect(() => {
    if (!FORK_FEATURES.sidebarRail) {
      return
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey
      if (!mod || !event.shiftKey || event.altKey || event.code !== 'KeyL' || event.repeat) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const { sidebarOpen, setSidebarOpen } = useAppStore.getState()
      if (sidebarOpen) {
        toggleForkSidebarMode()
      } else {
        setForkSidebarMode('compact')
        setSidebarOpen(true)
      }
    }
    // Capture, so a focused terminal or editor doesn't take the chord first.
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}
