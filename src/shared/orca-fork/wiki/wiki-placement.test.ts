import { describe, expect, it } from 'vitest'
import type { ForkWorkspace } from '../workspaces/fork-workspace'
import { wikiPlacementByHost } from './wiki-placement'

function ws(
  id: string,
  hostId: ForkWorkspace['hostId'],
  createdAt: number,
  items: Partial<ForkWorkspace>
): ForkWorkspace {
  return { id, name: id, photo: null, hostId, repoIds: [], botKeys: [], createdAt, ...items }
}

describe('wikiPlacementByHost', () => {
  it('tells each machine only its non-home workspaces, by bot id and repo id', () => {
    const doc = {
      version: 1 as const,
      revision: 1,
      activeWorkspaceId: 'host:local',
      workspaces: [
        ws('host:local', 'local', 0, { botKeys: ['local/home-bot'], repoIds: ['r0'] }),
        ws('host:runtime:vps', 'runtime:vps', 1, { botKeys: ['runtime:vps/b1'] }),
        ws('ws_crm', 'runtime:vps', 2, {
          botKeys: ['runtime:vps/b2', 'local/stray'],
          repoIds: ['r9']
        })
      ]
    }
    expect(Object.fromEntries(wikiPlacementByHost(doc))).toEqual({
      local: { bots: {}, repos: {} },
      'runtime:vps': { bots: { b2: 'ws_crm' }, repos: { r9: 'ws_crm' } }
    })
  })
})
