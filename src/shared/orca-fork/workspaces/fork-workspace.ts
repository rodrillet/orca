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
  /** Bots-sidebar departments (and their sections) of this workspace; unclaimed ones move to a workspace on load. */
  departmentIds?: string[]
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
      departmentIds: readStrings(ws.departmentIds),
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

/** A project filter id no repo has: a workspace with no projects lists none, not all. */
export const FORK_WORKSPACE_NO_REPOS = 'orca-fork:no-projects'

/**
 * The sidebar's project filter for a workspace: [] (no filter) while it is the only one showing its
 * machine's projects, else exactly the projects that belong to it.
 */
export function forkWorkspaceRepoFilter(
  doc: ForkWorkspacesDocument,
  workspaceId: ForkWorkspaceId,
  repos: readonly { id: string; hostId: ExecutionHostId }[]
): string[] {
  const ws = doc.workspaces.find((w) => w.id === workspaceId)
  if (!ws) {
    return []
  }
  const sharesMachine = doc.workspaces.some(
    (w) => w.id !== ws.id && w.hostId === ws.hostId && w.repoIds.length > 0
  )
  if (!sharesMachine && forkWorkspaceHomeOf(doc, ws.hostId)?.id === ws.id) {
    return []
  }
  const ids = repos
    .filter(
      (repo) =>
        repo.hostId === ws.hostId &&
        forkWorkspaceOfItem(doc, repo.hostId, { repoId: repo.id })?.id === ws.id
    )
    .map((repo) => repo.id)
  return ids.length > 0 ? ids : [FORK_WORKSPACE_NO_REPOS]
}

/** Whether a Bots-sidebar department shows in a workspace: it is held there, or nowhere yet. */
export function forkWorkspaceShowsDepartment(
  doc: ForkWorkspacesDocument,
  workspaceId: ForkWorkspaceId,
  departmentId: string
): boolean {
  const owner = doc.workspaces.find((ws) => ws.departmentIds?.includes(departmentId))
  return !owner || owner.id === workspaceId
}

/**
 * Projects the sidebar's filter shows in a workspace that doesn't hold them yet (a project just added
 * there, or picked in the filter): its machine's unclaimed ones, which then move into the workspace.
 */
export function forkWorkspaceProjectsToClaim(
  doc: ForkWorkspacesDocument,
  workspaceId: ForkWorkspaceId,
  filterRepoIds: readonly string[],
  repos: readonly { id: string; hostId: ExecutionHostId }[]
): string[] {
  const ws = doc.workspaces.find((w) => w.id === workspaceId)
  const home = ws ? forkWorkspaceHomeOf(doc, ws.hostId) : null
  if (!ws || !home || home.id === ws.id) {
    return []
  }
  const hostOf = new Map(repos.map((repo) => [repo.id, repo.hostId]))
  return filterRepoIds.filter(
    (id) =>
      hostOf.get(id) === ws.hostId &&
      forkWorkspaceOfItem(doc, ws.hostId, { repoId: id })?.id === home.id
  )
}

/**
 * Departments no workspace holds (made before Workspaces, or left by a deleted workspace), each with
 * the workspace it moves to: the one holding most of its bots, else this computer's home workspace.
 */
export function forkWorkspaceUnclaimedDepartments(
  doc: ForkWorkspacesDocument,
  departmentIds: readonly string[],
  placements: Readonly<Record<string, { departmentId: string }>>
): Map<ForkWorkspaceId, string[]> {
  const claimed = new Set(doc.workspaces.flatMap((ws) => ws.departmentIds ?? []))
  const fallback = forkWorkspaceHomeOf(doc, LOCAL_EXECUTION_HOST_ID) ?? doc.workspaces[0]!
  const moves = new Map<ForkWorkspaceId, string[]>()
  for (const departmentId of departmentIds) {
    if (claimed.has(departmentId)) {
      continue
    }
    const votes = new Map<ForkWorkspaceId, number>()
    for (const [botKey, placement] of Object.entries(placements)) {
      const host = parseExecutionHostId(botKey.slice(0, botKey.indexOf('/')))
      const ws =
        placement.departmentId === departmentId && host
          ? forkWorkspaceOfItem(doc, host.id, { botKey })
          : null
      if (ws) {
        votes.set(ws.id, (votes.get(ws.id) ?? 0) + 1)
      }
    }
    let target = fallback.id
    let best = 0
    for (const [id, count] of votes) {
      if (count > best) {
        target = id
        best = count
      }
    }
    moves.set(target, [...(moves.get(target) ?? []), departmentId])
  }
  return moves
}
