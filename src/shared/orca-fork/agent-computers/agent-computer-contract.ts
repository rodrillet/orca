// orca-fork: what the Mac and a machine's agent computers hub (config/orca-fork/agent-computer) exchange.

/** The hub listens on the machine's loopback; the desktop reaches it through the runtime tunnel. */
export const AGENT_COMPUTERS_HUB_PORT = 6079

export type AgentComputerControl =
  | { holder: 'owner'; since: string }
  | { holder: null; returnedAt?: string }

export type AgentComputer = {
  id: string
  name: string
  status: 'running' | 'stopped' | 'missing'
  control: AgentComputerControl
}

/** One paired machine and its computers; `error` when the machine has no hub or can't be reached. */
export type AgentComputerMachine = {
  environmentId: string
  name: string
  computers: AgentComputer[]
  error?: string
}

/** A viewer the renderer's noVNC connects to: a loopback WebSocket relayed to the computer. */
export type AgentComputerViewer = {
  url: string
  password: string
}
