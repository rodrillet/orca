// orca-fork: the renderer's door to the paired machines' agent computers.
import { ipcRenderer } from 'electron'
import type {
  AgentComputer,
  AgentComputerControl,
  AgentComputerMachine,
  AgentComputerViewer
} from '../../../shared/orca-fork/agent-computers/agent-computer-contract'

export type AgentComputersApi = {
  list: () => Promise<AgentComputerMachine[]>
  create: (environmentId: string, name: string) => Promise<AgentComputer>
  viewer: (environmentId: string, computerId: string) => Promise<AgentComputerViewer>
  control: (
    environmentId: string,
    computerId: string,
    holder: 'owner' | null
  ) => Promise<AgentComputerControl>
}

export const agentComputersApi: AgentComputersApi = {
  list: () => ipcRenderer.invoke('orcaFork:computers:list'),
  create: (environmentId, name) =>
    ipcRenderer.invoke('orcaFork:computers:create', environmentId, name),
  viewer: (environmentId, computerId) =>
    ipcRenderer.invoke('orcaFork:computers:viewer', environmentId, computerId),
  control: (environmentId, computerId, holder) =>
    ipcRenderer.invoke('orcaFork:computers:control', environmentId, computerId, holder)
}
