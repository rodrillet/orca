// orca-fork: which workspace-settings tab is open over the app, if any; the sidebar and the rail open it.
import { useSyncExternalStore } from 'react'

export const WORKSPACE_SETTINGS_TABS = [
  'general',
  'members',
  'connectors',
  'agents',
  'access',
  'machine'
] as const

export type WorkspaceSettingsTab = (typeof WORKSPACE_SETTINGS_TABS)[number]

let openTab: WorkspaceSettingsTab | null = null
let anchorRect: DOMRect | null = null
const listeners = new Set<() => void>()

function publish(next: WorkspaceSettingsTab | null): void {
  openTab = next
  for (const listener of listeners) {
    listener()
  }
}

/** `anchor`: what was clicked to open it; the overlay's header grows out of it. */
export function openWorkspaceSettings(
  tab: WorkspaceSettingsTab = 'general',
  anchor?: Element | null
): void {
  if (openTab === null) {
    anchorRect = anchor?.getBoundingClientRect() ?? null
  }
  publish(tab)
}

/** The opening card's place, read once by the header's entrance. */
export function takeWorkspaceSettingsAnchor(): DOMRect | null {
  const rect = anchorRect
  anchorRect = null
  return rect
}

export function closeWorkspaceSettings(): void {
  publish(null)
}

export function useWorkspaceSettingsTab(): WorkspaceSettingsTab | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => openTab
  )
}
