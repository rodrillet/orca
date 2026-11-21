// orca-fork: whether the Tasks page shows the Agents view in place of its provider list.
import { useSyncExternalStore } from 'react'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'

let open = false
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setAgentsTasksViewOpen(next: boolean): void {
  if (open === next) {
    return
  }
  open = next
  listeners.forEach((listener) => listener())
}

export function useAgentsTasksViewOpen(): boolean {
  const value = useSyncExternalStore(subscribe, () => open)
  return FORK_FEATURES.agentsInTasks && value
}
