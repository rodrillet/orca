// orca-fork: agentes.chat-style Workspaces, the fork's top level. Every fork feature that keeps data per
// workspace (wiki, drive, chats, organization…) keys it by `ForkWorkspaceId`.
import {
  LOCAL_EXECUTION_HOST_ID,
  parseExecutionHostId,
  type ExecutionHostId
} from '../../execution-host/execution-host'
import { createNonSecureContextUuid } from '../../identifiers/non-secure-context-uuid'

export const FORK_WORKSPACES_VERSION = 1

/**
 * Opaque, stable id. Seeded workspaces use `host:<executionHostId>` (so the same machine gets the same id
 * on every install), workspaces made by the owner use `ws_<random>`. Never parse it; read `hostId`.
 */
export type ForkWorkspaceId = string

/** The workspace every fresh install starts with: this computer. */
export const DEFAULT_FORK_WORKSPACE_ID: ForkWorkspaceId = `host:${LOCAL_EXECUTION_HOST_ID}`

export type ForkWorkspace = {
  id: ForkWorkspaceId
  name: string
  /** Square picture as a `data:image/…` URL (kept small, ≤256 px), or null for the initials mark. */
  photo: string | null
  /**
   * Where the workspace runs: `local` (this computer) or a paired machine (`runtime:<env>` for a paired
   * orca-server, `ssh:<target>`). Several workspaces may share one machine ("separate local workspace").
   */
  hostId: ExecutionHostId
  /** Projects (repo ids) placed in this workspace; a machine's unplaced ones belong to its home workspace. */
  repoIds: string[]
  /** Bots and bot groups (sidebar key `hostId/id`) placed here; same home rule as repos. */
  botKeys: string[]
  createdAt: number
}

export type ForkWorkspacesDocument = {
  version: typeof FORK_WORKSPACES_VERSION
  revision: number
  workspaces: ForkWorkspace[]
  activeWorkspaceId: ForkWorkspaceId
}

export function newForkWorkspaceId(): ForkWorkspaceId {
  return `ws_${createNonSecureContextUuid().replaceAll('-', '').slice(0, 16)}`
}

export function seededForkWorkspaceId(hostId: ExecutionHostId): ForkWorkspaceId {
  return `host:${hostId}`
}

export function defaultForkWorkspace(name: string, createdAt = 0): ForkWorkspace {
  return {
    id: DEFAULT_FORK_WORKSPACE_ID,
    name,
    photo: null,
    hostId: LOCAL_EXECUTION_HOST_ID,
    repoIds: [],
    botKeys: [],
    createdAt
  }
}

export function emptyForkWorkspaces(defaultName = 'This computer'): ForkWorkspacesDocument {
  return {
    version: FORK_WORKSPACES_VERSION,
    revision: 0,
    workspaces: [defaultForkWorkspace(defaultName)],
    activeWorkspaceId: DEFAULT_FORK_WORKSPACE_ID
  }
}

/**
 * A machine's home workspace: the oldest one bound to it. It holds that machine's projects and bots that
 * no workspace claims, so pairing a machine never hides its work.
 */
export function forkWorkspaceHomeOf(
  doc: ForkWorkspacesDocument,
  hostId: ExecutionHostId
): ForkWorkspace | null {
  let home: ForkWorkspace | null = null
  for (const ws of doc.workspaces) {
    if (ws.hostId === hostId && (!home || ws.createdAt < home.createdAt)) {
      home = ws
    }
  }
  return home
}

/** Which workspace a machine's item (a repo id or a bot key) belongs to. */
export function forkWorkspaceOfItem(
  doc: ForkWorkspacesDocument,
  hostId: ExecutionHostId,
  item: { repoId: string } | { botKey: string }
): ForkWorkspace | null {
  const claimed = doc.workspaces.find(
    (ws) =>
      ws.hostId === hostId &&
      ('repoId' in item ? ws.repoIds.includes(item.repoId) : ws.botKeys.includes(item.botKey))
  )
  return claimed ?? forkWorkspaceHomeOf(doc, hostId)
}

export function activeForkWorkspace(doc: ForkWorkspacesDocument): ForkWorkspace {
  return doc.workspaces.find((ws) => ws.id === doc.activeWorkspaceId) ?? doc.workspaces[0]!
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {}
}

function readStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === 'string' && v.length > 0))]
    : []
}

const ID_PATTERN = /^[\w:%.@|-]{1,160}$/
const PHOTO_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/
const MAX_PHOTO_LENGTH = 512 * 1024

/** Reads a stored or received document, dropping anything malformed instead of failing. */
export function normalizeForkWorkspaces(
  raw: unknown,
  defaultName = 'This computer'
): ForkWorkspacesDocument {
  const input = readRecord(raw)
  const workspaces: ForkWorkspace[] = []
  const seen = new Set<string>()
  for (const value of Array.isArray(input.workspaces) ? input.workspaces : []) {
    const ws = readRecord(value)
    const id = typeof ws.id === 'string' && ID_PATTERN.test(ws.id) ? ws.id : null
    const name = typeof ws.name === 'string' ? ws.name.trim().slice(0, 80) : ''
    const host = parseExecutionHostId(typeof ws.hostId === 'string' ? ws.hostId : null)
    if (!id || !name || !host || seen.has(id)) {
      continue
    }
    seen.add(id)
    const photo =
      typeof ws.photo === 'string' &&
      ws.photo.length <= MAX_PHOTO_LENGTH &&
      PHOTO_PATTERN.test(ws.photo)
        ? ws.photo
        : null
    workspaces.push({
      id,
      name,
      photo,
      hostId: host.id,
      repoIds: readStrings(ws.repoIds),
      botKeys: readStrings(ws.botKeys),
      createdAt:
        typeof ws.createdAt === 'number' && Number.isFinite(ws.createdAt) ? ws.createdAt : 0
    })
  }
  if (workspaces.length === 0) {
    workspaces.push(defaultForkWorkspace(defaultName))
  }
  const active = workspaces.find((ws) => ws.id === input.activeWorkspaceId) ?? workspaces[0]!
  return {
    version: FORK_WORKSPACES_VERSION,
    revision:
      typeof input.revision === 'number' && Number.isFinite(input.revision) ? input.revision : 0,
    workspaces,
    activeWorkspaceId: active.id
  }
}
