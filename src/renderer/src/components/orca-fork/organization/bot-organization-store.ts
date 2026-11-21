// orca-fork: the renderer's copy of the Bots sidebar organization, saved by main on the Mac.
import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { isPairedWebClientWindow } from '@/app-shell/chrome/desktop-window-chrome'
import {
  emptyBotOrganization,
  normalizeBotOrganization,
  type BotOrganization
} from '../../../../../shared/orca-fork/organization/bot-organization'

const LOCAL_STORAGE_KEY = 'orca-fork:bot-organization'

let current: BotOrganization = emptyBotOrganization()
let loaded = false
const listeners = new Set<() => void>()

// Paired web windows answer unknown preload calls with stand-ins; they keep it in the browser instead.
function bridge(): Window['api']['orcaForkBotOrganization'] | null {
  return isPairedWebClientWindow() ? null : (window.api?.orcaForkBotOrganization ?? null)
}

function publish(next: BotOrganization): void {
  current = next
  for (const listener of listeners) {
    listener()
  }
}

function load(): void {
  if (loaded) {
    return
  }
  loaded = true
  const api = bridge()
  if (!api) {
    try {
      publish(
        normalizeBotOrganization(JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? 'null'))
      )
    } catch {
      // Unreadable storage starts empty.
    }
    return
  }
  api
    .read()
    .then((doc) => {
      // An edit made before the read finished wins.
      const stored = normalizeBotOrganization(doc)
      if (stored.revision >= current.revision) {
        publish(stored)
      }
    })
    .catch(console.error)
}

function subscribe(listener: () => void): () => void {
  load()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The current document outside React; it may still be empty before the first read lands. */
export function readBotOrganization(): BotOrganization {
  load()
  return current
}

export function useBotOrganization(): BotOrganization {
  return useSyncExternalStore(subscribe, () => current)
}

type EditListener = (before: BotOrganization, after: BotOrganization) => void
const editListeners = new Set<EditListener>()

/** Hears each edit made in this window (never a load), e.g. to apply department defaults once. */
export function onBotOrganizationEdit(listener: EditListener): () => void {
  editListeners.add(listener)
  return () => editListeners.delete(listener)
}

export function editBotOrganization(edit: (doc: BotOrganization) => BotOrganization): void {
  const before = current
  const next = edit(current)
  publish(next)
  editListeners.forEach((listener) => listener(before, next))
  const api = bridge()
  if (!api) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Browser storage can be unavailable; the change still holds for this session.
    }
    return
  }
  api.write(next).catch((error: unknown) => {
    console.error(error)
    toast.error(String(error))
  })
}
