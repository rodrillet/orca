// orca-fork: whether the Wiki page covers the main area, and what it shows. Kept outside the app store
// so the fork adds no view to upstream's activeView union.
import { useSyncExternalStore } from 'react'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'

export type WikiCenter =
  | { kind: 'home' }
  | { kind: 'page'; slug: string }
  | { kind: 'new'; title: string }
  | { kind: 'trash' }
  /** Every page in a folder and its subfolders (a space or a section of one). */
  | { kind: 'folder'; folder: string }
  /** The workspace's consultation log. */
  | { kind: 'consultations' }
  /** Who reads the wiki; with `actorKey`, what that agent (or the owner) read. */
  | { kind: 'readers'; actorKey: string | null }

export type WikiViewState = {
  open: boolean
  center: WikiCenter
  tag: string | null
}

let state: WikiViewState = {
  open: false,
  center: { kind: 'home' },
  tag: null
}
const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function update(next: Partial<WikiViewState>): void {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}

export function useWikiViewState(): WikiViewState {
  return useSyncExternalStore(subscribe, () => state)
}

export function useWikiPageOpen(): boolean {
  const open = useSyncExternalStore(subscribe, () => state.open)
  return FORK_FEATURES.workspaceWiki && open
}

export function openWikiPage(center?: WikiCenter): void {
  update({
    open: true,
    ...(center ? { center } : {})
  })
}

export function closeWikiPage(): void {
  if (state.open) {
    update({ open: false })
  }
}

export function showWikiCenter(center: WikiCenter): void {
  update({ center })
}

export function setWikiTag(tag: string | null): void {
  update({ tag })
}
