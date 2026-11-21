// orca-fork: what one bot's agents use on its machine: its own agents (run in its home) and those in
// the workspaces under it (its workers'), as the host's resource sample lists them.
import type { MachineAgentProcess, MachineUsage } from './machine-resources'

export type BotResourceUsage = MachineUsage & { processes: MachineAgentProcess[] }

export function botResourceUsage(
  agents: readonly MachineAgentProcess[],
  botId: string,
  workspaceIds: ReadonlySet<string>
): BotResourceUsage {
  const processes = agents.filter(
    (agent) =>
      agent.botId === botId || (agent.worktreeId !== null && workspaceIds.has(agent.worktreeId))
  )
  return {
    cpu: processes.reduce((sum, agent) => sum + agent.cpu, 0),
    memory: processes.reduce((sum, agent) => sum + agent.memory, 0),
    processes
  }
}
