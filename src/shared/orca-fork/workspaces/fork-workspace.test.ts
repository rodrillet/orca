import { describe, expect, it } from 'vitest'
import {
  FORK_WORKSPACE_NO_REPOS,
  emptyForkWorkspaces,
  forkWorkspaceOfItem,
  forkWorkspaceProjectsToClaim,
  forkWorkspaceRepoFilter,
  type ForkWorkspace,
  type ForkWorkspacesDocument
} from './fork-workspace'
import { forkWorkspaceEdits as edits } from './fork-workspace-edits'

function ws(id: string, hostId: ForkWorkspace['hostId'], createdAt: number): ForkWorkspace {
  return { id, name: id, photo: null, hostId, repoIds: [], botKeys: [], createdAt }
}

const repos = [
  { id: 'site', hostId: 'local' as const },
  { id: 'blog', hostId: 'local' as const },
  { id: 'api', hostId: 'runtime:vps' as const }
]

function twoOnThisMac(): ForkWorkspacesDocument {
  let doc = emptyForkWorkspaces()
  doc = edits.add(ws('ws_side', 'local', 5), false)(doc)
  return edits.ensureMachines([{ hostId: 'runtime:vps', name: 'VPS' }], 10)(doc)
}

describe('fork workspaces', () => {
  it('shows every project of its machine while a workspace is alone on it', () => {
    const doc = twoOnThisMac()
    expect(forkWorkspaceRepoFilter(doc, 'host:local', repos)).toEqual([])
    expect(forkWorkspaceRepoFilter(doc, 'host:runtime:vps', repos)).toEqual([])
    expect(forkWorkspaceRepoFilter(doc, 'ws_side', repos)).toEqual([FORK_WORKSPACE_NO_REPOS])
  })

  it('splits a machine between its workspaces once a project moves', () => {
    const doc = edits.move('local', { repoId: 'blog' }, 'ws_side')(twoOnThisMac())
    expect(forkWorkspaceRepoFilter(doc, 'ws_side', repos)).toEqual(['blog'])
    expect(forkWorkspaceRepoFilter(doc, 'host:local', repos)).toEqual(['site'])
    const back = edits.move('local', { repoId: 'blog' }, 'host:local')(doc)
    expect(forkWorkspaceRepoFilter(back, 'host:local', repos)).toEqual([])
  })

  it('returns a deleted workspace’s bots to their machine’s home', () => {
    let doc = edits.move('local', { botKey: 'local/b1' }, 'ws_side')(twoOnThisMac())
    expect(forkWorkspaceOfItem(doc, 'local', { botKey: 'local/b1' })?.id).toBe('ws_side')
    doc = edits.remove('ws_side')(doc)
    expect(forkWorkspaceOfItem(doc, 'local', { botKey: 'local/b1' })?.id).toBe('host:local')
    expect(edits.remove('host:runtime:vps')(doc)).toBe(doc)
  })

  it('claims a project the filter shows in a workspace that is not its machine’s home', () => {
    const doc = twoOnThisMac()
    expect(forkWorkspaceProjectsToClaim(doc, 'ws_side', ['site', 'api'], repos)).toEqual(['site'])
    expect(forkWorkspaceProjectsToClaim(doc, 'host:local', ['site'], repos)).toEqual([])
    const moved = edits.move('local', { repoId: 'site' }, 'ws_side')(doc)
    expect(forkWorkspaceProjectsToClaim(moved, 'ws_side', ['site'], repos)).toEqual([])
  })
})
