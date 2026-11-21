// orca-fork: the Drive shows in the Artifacts page's slot (activeView 'artifacts'), so it adds no
// top-level view to upstream's unions; this says which of the two that slot shows.
import { useSyncExternalStore } from 'react'
import { useAppStore } from '@/store'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'

let open = false
const listeners = new Set<() => void>()

export function subscribeForkDrive(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setForkDriveOpen(next: boolean): void {
  if (open === next) {
    return
  }
  open = next
  listeners.forEach((listener) => listener())
}

export function isForkDriveOpen(): boolean {
  return open
}

export function useForkDriveOpen(): boolean {
  const value = useSyncExternalStore(subscribeForkDrive, () => open)
  return FORK_FEATURES.drive && value
}

/** The Drive is on screen. */
export function useForkDriveActive(): boolean {
  const driveOpen = useForkDriveOpen()
  const artifactsView = useAppStore((state) => state.activeView === 'artifacts')
  return driveOpen && artifactsView
}

export function openForkDrivePage(): void {
  setForkDriveOpen(true)
  useAppStore.getState().openArtifactsPage()
}

/** The Artifacts button: the slot shows Artifacts again. */
export function openArtifactsInsteadOfDrive(): void {
  setForkDriveOpen(false)
  useAppStore.getState().openArtifactsPage()
}
