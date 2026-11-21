// orca-fork: the open sidebar's mode, full or the compact icon rail (hidden stays upstream's sidebarOpen).
import { useSyncExternalStore } from 'react'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'

export type ForkSidebarMode = 'full' | 'compact'

const STORAGE_KEY = 'orca-fork:sidebar-mode'
export const FORK_SIDEBAR_RAIL_WIDTH = 64

function readStored(): ForkSidebarMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'compact' ? 'compact' : 'full'
  } catch {
    return 'full'
  }
}

let mode: ForkSidebarMode = readStored()
const listeners = new Set<() => void>()

export function setForkSidebarMode(next: ForkSidebarMode): void {
  if (next === mode) {
    return
  }
  mode = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Browser storage can be unavailable; the choice still holds for this session.
  }
  for (const listener of listeners) {
    listener()
  }
}

export function toggleForkSidebarMode(): void {
  setForkSidebarMode(mode === 'compact' ? 'full' : 'compact')
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** True when the open sidebar shows as the icon rail. */
export function useForkSidebarRail(): boolean {
  const current = useSyncExternalStore(subscribe, () => mode)
  return FORK_FEATURES.sidebarRail && current === 'compact'
}
