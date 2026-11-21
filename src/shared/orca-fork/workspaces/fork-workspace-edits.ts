// orca-fork: every change to the Workspaces document, each bumping its revision.
import type { ExecutionHostId } from '../../execution-host/execution-host'
import {
  forkWorkspaceHomeOf,
  seededForkWorkspaceId,
  type ForkWorkspace,
  type ForkWorkspaceId,
  type ForkWorkspacesDocument
} from './fork-workspace'

type Edit = (doc: ForkWorkspacesDocument) => ForkWorkspacesDocument

function bump(doc: ForkWorkspacesDocument): ForkWorkspacesDocument {
  return { ...doc, revision: doc.revision + 1 }
}

function withoutItem(ws: ForkWorkspace, item: { repoId: string } | { botKey: string }) {
  return 'repoId' in item
    ? { ...ws, repoIds: ws.repoIds.filter((id) => id !== item.repoId) }
    : { ...ws, botKeys: ws.botKeys.filter((key) => key !== item.botKey) }
}

/** A machine's only workspace can't go: its projects and bots would have nowhere to show. */
export function canRemoveForkWorkspace(doc: ForkWorkspacesDocument, id: ForkWorkspaceId): boolean {
  const ws = doc.workspaces.find((w) => w.id === id)
  return !!ws && doc.workspaces.some((w) => w.id !== id && w.hostId === ws.hostId)
}

export const forkWorkspaceEdits = {
  setActive:
    (id: ForkWorkspaceId): Edit =>
    (doc) =>
      doc.workspaces.some((ws) => ws.id === id) && doc.activeWorkspaceId !== id
        ? bump({ ...doc, activeWorkspaceId: id })
        : doc,
  add:
    (ws: ForkWorkspace, activate = true): Edit =>
    (doc) =>
      bump({
        ...doc,
        workspaces: [...doc.workspaces, ws],
        activeWorkspaceId: activate ? ws.id : doc.activeWorkspaceId
      }),
  update:
    (
      id: ForkWorkspaceId,
      patch: Partial<Pick<ForkWorkspace, 'name' | 'photo' | 'description'>>
    ): Edit =>
    (doc) =>
      bump({
        ...doc,
        workspaces: doc.workspaces.map((ws) =>
          ws.id === id
            ? { ...ws, ...patch, ...(patch.name ? { name: patch.name.trim().slice(0, 80) } : {}) }
            : ws
        )
      }),
  /** Its projects and bots go back to their machine's home workspace. */
  remove:
    (id: ForkWorkspaceId): Edit =>
    (doc) => {
      if (!canRemoveForkWorkspace(doc, id)) {
        return doc
      }
      const workspaces = doc.workspaces.filter((ws) => ws.id !== id)
      return bump({
        ...doc,
        workspaces,
        activeWorkspaceId: doc.activeWorkspaceId === id ? workspaces[0]!.id : doc.activeWorkspaceId
      })
    },
  /** Moves a project or bot into a workspace of its own machine; the home workspace claims nothing. */
  move:
    (
      hostId: ExecutionHostId,
      item: { repoId: string } | { botKey: string },
      target: ForkWorkspaceId
    ): Edit =>
    (doc) => {
      const home = forkWorkspaceHomeOf(doc, hostId)
      return bump({
        ...doc,
        workspaces: doc.workspaces.map((ws) => {
          if (ws.hostId !== hostId) {
            return ws
          }
          const cleared = withoutItem(ws, item)
          if (ws.id !== target || ws.id === home?.id) {
            return cleared
          }
          return 'repoId' in item
            ? { ...cleared, repoIds: [...cleared.repoIds, item.repoId] }
            : { ...cleared, botKeys: [...cleared.botKeys, item.botKey] }
        })
      })
    },
  /** Departments made while a workspace is active belong to it. */
  claimDepartments:
    (workspaceId: ForkWorkspaceId, departmentIds: readonly string[]): Edit =>
    (doc) => {
      const fresh = departmentIds.filter(
        (id) => !doc.workspaces.some((ws) => ws.departmentIds?.includes(id))
      )
      return fresh.length === 0
        ? doc
        : bump({
            ...doc,
            workspaces: doc.workspaces.map((ws) =>
              ws.id === workspaceId
                ? { ...ws, departmentIds: [...(ws.departmentIds ?? []), ...fresh] }
                : ws
            )
          })
    },
  /** Gives each paired machine with no workspace one, so pairing never hides its work. */
  ensureMachines:
    (machines: readonly { hostId: ExecutionHostId; name: string }[], now: number): Edit =>
    (doc) => {
      const missing = machines.filter((m) => !doc.workspaces.some((ws) => ws.hostId === m.hostId))
      if (missing.length === 0) {
        return doc
      }
      return bump({
        ...doc,
        workspaces: [
          ...doc.workspaces,
          ...missing.map((m, index): ForkWorkspace => ({
            id: seededForkWorkspaceId(m.hostId),
            name: m.name,
            photo: null,
            hostId: m.hostId,
            repoIds: [],
            botKeys: [],
            createdAt: now + index
          }))
        ]
      })
    }
}
