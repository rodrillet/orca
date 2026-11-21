// orca-fork: opens the Agents map from any menu; the sidebar's channels host shows it.
type Listener = () => void
const listeners = new Set<Listener>()

export function openAgentsMap(): void {
  for (const listener of listeners) {
    listener()
  }
}

export function onOpenAgentsMap(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
