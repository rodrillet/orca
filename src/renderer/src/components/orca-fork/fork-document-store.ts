// orca-fork: the renderer's copy of one userData/orca-fork/ document, saved by main; paired web windows
// (whose preload answers unknown calls with stand-ins) keep it in browser storage instead.
import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { isPairedWebClientWindow } from '@/app-shell/chrome/desktop-window-chrome'

type DocumentBridge<T> = { read: () => Promise<T>; write: (doc: T) => Promise<T> }

export type ForkDocumentStore<T> = {
  use: () => T
  /** True once the saved document has been read, so seeding edits can't race it. */
  useReady: () => boolean
  get: () => T
  edit: (edit: (doc: T) => T) => void
  subscribe: (listener: () => void) => () => void
}

export function createForkDocumentStore<T extends { revision: number }>(options: {
  storageKey: string
  empty: () => T
  normalize: (raw: unknown) => T
  bridge: () => DocumentBridge<T> | undefined
}): ForkDocumentStore<T> {
  let current = options.empty()
  let loaded = false
  let ready = false
  const listeners = new Set<() => void>()
  const bridge = (): DocumentBridge<T> | null =>
    isPairedWebClientWindow() ? null : (options.bridge() ?? null)

  const publish = (next: T): void => {
    current = next
    for (const listener of listeners) {
      listener()
    }
  }

  const load = (): void => {
    if (loaded) {
      return
    }
    loaded = true
    const api = bridge()
    if (!api) {
      try {
        current = options.normalize(JSON.parse(localStorage.getItem(options.storageKey) ?? 'null'))
      } catch {
        // Unreadable storage starts empty.
      }
      ready = true
      publish(current)
      return
    }
    // Stand-in bridges (web previews) may answer without a promise.
    Promise.resolve()
      .then(() => api.read())
      .then((doc) => {
        // An edit made before the read finished wins.
        const stored = options.normalize(doc)
        ready = true
        publish(stored.revision >= current.revision ? stored : current)
      })
      .catch((error: unknown) => {
        console.error(error)
        ready = true
        publish(current)
      })
  }

  const subscribe = (listener: () => void): (() => void) => {
    load()
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  const get = (): T => {
    load()
    return current
  }

  const edit = (change: (doc: T) => T): void => {
    const next = change(current)
    if (next === current) {
      return
    }
    publish(next)
    const api = bridge()
    if (!api) {
      try {
        localStorage.setItem(options.storageKey, JSON.stringify(next))
      } catch {
        // Browser storage can be unavailable; the change still holds for this session.
      }
      return
    }
    Promise.resolve()
      .then(() => api.write(next))
      .catch((error: unknown) => {
        console.error(error)
        toast.error(String(error))
      })
  }

  return {
    use: () => useSyncExternalStore(subscribe, () => current),
    useReady: () => useSyncExternalStore(subscribe, () => ready),
    get,
    edit,
    subscribe
  }
}
