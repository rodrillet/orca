// orca-fork: the Agents board's view and filters, kept per active fork workspace in this window's storage.
import { useSyncExternalStore } from 'react'
import type { ForkWorkspaceId } from '../../../../../shared/orca-fork/workspaces/fork-workspace'
import {
  getActiveForkWorkspaceId,
  useActiveForkWorkspaceId
} from '../workspaces/fork-workspaces-store'
import { EMPTY_AGENTS_BOARD_FILTERS, type AgentsBoardFilters } from './agents-board-model'

export type AgentsBoardView = 'bots' | 'terminals'

export type AgentsBoardPrefs = { view: AgentsBoardView; filters: AgentsBoardFilters }

const DEFAULT_PREFS: AgentsBoardPrefs = { view: 'bots', filters: EMPTY_AGENTS_BOARD_FILTERS }

const storageKey = (workspaceId: ForkWorkspaceId): string => `orca-fork:agents-board:${workspaceId}`

function readStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry) => typeof entry === 'string') : []
}

function readPrefs(workspaceId: ForkWorkspaceId): AgentsBoardPrefs {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey(workspaceId)) ?? 'null')
    if (!raw || typeof raw !== 'object') {
      return DEFAULT_PREFS
    }
    const view = 'view' in raw && raw.view === 'terminals' ? 'terminals' : 'bots'
    const filters =
      'filters' in raw && raw.filters && typeof raw.filters === 'object' ? raw.filters : {}
    return {
      view,
      filters: {
        workspaces: readStrings('workspaces' in filters ? filters.workspaces : null),
        hosts: readStrings('hosts' in filters ? filters.hosts : null),
        bots: readStrings('bots' in filters ? filters.bots : null),
        tags: readStrings('tags' in filters ? filters.tags : null)
      }
    }
  } catch {
    return DEFAULT_PREFS
  }
}

const cache = new Map<ForkWorkspaceId, AgentsBoardPrefs>()
const listeners = new Set<() => void>()

function prefsFor(workspaceId: ForkWorkspaceId): AgentsBoardPrefs {
  let prefs = cache.get(workspaceId)
  if (!prefs) {
    prefs = readPrefs(workspaceId)
    cache.set(workspaceId, prefs)
  }
  return prefs
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function updateAgentsBoardPrefs(
  patch: Partial<AgentsBoardPrefs>,
  workspaceId: ForkWorkspaceId = getActiveForkWorkspaceId()
): void {
  const next = { ...prefsFor(workspaceId), ...patch }
  cache.set(workspaceId, next)
  try {
    localStorage.setItem(storageKey(workspaceId), JSON.stringify(next))
  } catch {
    // Storage can be unavailable; the view still changes for this session.
  }
  listeners.forEach((listener) => listener())
}

export function useAgentsBoardPrefs(workspaceId?: ForkWorkspaceId): AgentsBoardPrefs {
  const active = useActiveForkWorkspaceId()
  const id = workspaceId ?? active
  return useSyncExternalStore(subscribe, () => prefsFor(id))
}
