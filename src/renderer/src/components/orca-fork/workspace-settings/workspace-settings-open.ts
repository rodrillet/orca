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
const listeners = new Set<() => void>()

function publish(next: WorkspaceSettingsTab | null): void {
  openTab = next
  for (const listener of listeners) {
    listener()
  }
}

export function openWorkspaceSettings(tab: WorkspaceSettingsTab = 'general'): void {
  publish(tab)
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
