import { defineFixture } from '../../../component-fixtures/component-fixture'
import type { Bot } from '../../../../../shared/bot-types'
import { mascotAvatar } from '../../../../../shared/bot-avatar'
import type { MachineResources } from '../../../../../shared/orca-fork/resource-monitor/machine-resources'
import { MachineResourcesCard } from './MachineResourcesCard'
import type { MachineEntry } from './use-machine-resources'

const GB = 1024 ** 3
const MB = 1024 ** 2

const bot: Bot = {
  id: 'devzin',
  name: 'Devzin',
  hostId: 'local',
  folder: 'devzin',
  folderWorkspaceId: 'fw-devzin',
  agent: 'claude',
  avatar: mascotAvatar('B1'),
  paused: false,
  notifications: { needsPermission: true, taskComplete: true, couldNotFinish: true },
  members: [],
  slack: null,
  linear: null,
  github: null,
  chatSessionId: 'home',
  createdAt: 1,
  updatedAt: 1
}

const data: MachineResources = {
  hostname: 'orion-a1',
  platform: 'linux',
  collectedAt: 1,
  memory: { total: 24 * GB, used: 18.6 * GB, available: 5.4 * GB },
  cpu: { cores: 4, usagePercent: 63, loadAverage1m: 2.8 },
  disk: { path: '/home/ubuntu', total: 193 * GB, free: 118 * GB },
  orca: { cpu: 4.2, memory: 612 * MB },
  agents: [
    {
      pid: 431035,
      kind: 'claude',
      label: 'Claude Code',
      cpu: 38.5,
      memory: 1.35 * GB,
      children: 8,
      botId: 'devzin',
      botName: 'Devzin',
      workspaceId: 'repo::/home/ubuntu/src/orca',
      workspaceName: 'orca',
      folder: 'src/orca'
    },
    {
      pid: 304597,
      kind: 'codex',
      label: 'Codex',
      cpu: 12.1,
      memory: 412 * MB,
      children: 1,
      botId: null,
      botName: null,
      workspaceId: 'repo::/home/ubuntu/src/site',
      workspaceName: 'site',
      folder: 'src/site'
    },
    {
      pid: 303065,
      kind: 'agent',
      label: 'Gemini CLI',
      cpu: 0.4,
      memory: 188 * MB,
      children: 0,
      botId: null,
      botName: null,
      workspaceId: null,
      workspaceName: null,
      folder: 'scratch/notes'
    }
  ],
  others: [
    { pid: 15744, name: 'postgres', cpu: 1.5, memory: 390 * MB },
    { pid: 189346, name: 'bun', cpu: 1.6, memory: 250 * MB }
  ]
}

function machine(result: MachineEntry['result']): MachineEntry {
  return {
    key: 'local',
    name: null,
    target: { kind: 'local' },
    result
  }
}

export const forkServer = defineFixture({
  width: 480,
  render: () => <MachineResourcesCard machine={machine({ status: 'ok', data })} bots={[bot]} />
})

export const stockServer = defineFixture({
  width: 480,
  render: () => (
    <MachineResourcesCard
      machine={machine({ status: 'basic', data: { ...data, disk: null, agents: [], others: [] } })}
      bots={[]}
    />
  )
})
