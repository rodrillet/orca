import { describe, expect, it } from 'vitest'
import type { MachineAgentProcess } from './machine-resources'
import { botResourceUsage } from './bot-resources'

function agent(pid: number, fields: Partial<MachineAgentProcess>): MachineAgentProcess {
  return {
    pid,
    kind: 'claude',
    label: 'Claude Code',
    children: 0,
    botId: null,
    botName: null,
    worktreeId: null,
    worktreeName: null,
    repoId: null,
    folder: null,
    cpu: 0,
    memory: 0,
    ...fields
  }
}

describe('botResourceUsage', () => {
  it("sums the bot's home agents and its workers' workspaces, nothing else", () => {
    const usage = botResourceUsage(
      [
        agent(1, { botId: 'devzin', cpu: 10, memory: 300 }),
        agent(2, { worktreeId: 'wt-worker', cpu: 5, memory: 200 }),
        agent(3, { botId: 'closer', cpu: 50, memory: 900 }),
        agent(4, { worktreeId: 'wt-other', cpu: 7, memory: 100 })
      ],
      'devzin',
      new Set(['wt-worker'])
    )
    expect([usage.cpu, usage.memory, usage.processes.map((p) => p.pid)]).toEqual([15, 500, [1, 2]])
  })
})
