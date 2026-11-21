import { describe, expect, it } from 'vitest'
import type { ForkWorkspacesDocument } from '../workspaces/fork-workspace'
import { driveItemWorkspaceId } from './drive-workspace-placement'

const doc: ForkWorkspacesDocument = {
  version: 1,
  revision: 1,
  activeWorkspaceId: 'host:local',
  workspaces: [
    {
      id: 'host:local',
      name: 'Mac',
      photo: null,
      hostId: 'local',
      repoIds: [],
      botKeys: [],
      createdAt: 1
    },
    {
      id: 'ws_sales',
      name: 'Sales',
      photo: null,
      hostId: 'local',
      repoIds: [],
      botKeys: ['local/closer'],
      createdAt: 2
    },
    {
      id: 'host:runtime:vps',
      name: 'VPS',
      photo: null,
      hostId: 'runtime:vps',
      repoIds: [],
      botKeys: [],
      createdAt: 3
    }
  ]
}

describe('driveItemWorkspaceId', () => {
  it('keeps the workspace an item was put in', () => {
    expect(driveItemWorkspaceId(doc, { hostId: 'local', workspaceId: 'ws_sales' })).toBe('ws_sales')
  })

  it("puts a bot's file in the workspace the bot was moved to", () => {
    const source = { kind: 'agent', botId: 'closer', botName: 'Closer' } as const
    expect(driveItemWorkspaceId(doc, { hostId: 'local', source })).toBe('ws_sales')
  })

  it("puts anything else in its machine's home workspace", () => {
    expect(driveItemWorkspaceId(doc, { hostId: 'runtime:vps', source: { kind: 'upload' } })).toBe(
      'host:runtime:vps'
    )
    // A workspace that was deleted no longer holds what was put in it.
    expect(driveItemWorkspaceId(doc, { hostId: 'local', workspaceId: 'ws_gone' })).toBe(
      'host:local'
    )
  })
})
