// orca-fork: whether the owner's profile dialog is open (the rail's photo and workspace members open it).
import { useSyncExternalStore } from 'react'

let open = false
const listeners = new Set<() => void>()

function publish(next: boolean): void {
  open = next
  for (const listener of listeners) {
    listener()
  }
}

export function openOwnerProfile(): void {
  publish(true)
}

export function closeOwnerProfile(): void {
  publish(false)
}

export function useOwnerProfileOpen(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => open
  )
}
