// orca-fork: IPC for the sidebar's Computers section and the Computer pane.
import { app, ipcMain } from 'electron'
import { listEnvironments } from '../../../shared/remote-runtime/host-store/runtime-environment-store'
import type {
  AgentComputer,
  AgentComputerControl,
  AgentComputerMachine,
  AgentComputerViewer
} from '../../../shared/orca-fork/agent-computers/agent-computer-contract'
import {
  agentComputersHubRequest,
  hasAgentComputersHub,
  openAgentComputerViewerRelay
} from './agent-computer-tunnel'

function computerPath(computerId: string, action: string): string {
  return `/v1/computers/${encodeURIComponent(computerId)}/${action}`
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Every paired machine that runs a computers hub, with its computers. */
async function listMachines(): Promise<AgentComputerMachine[]> {
  const environments = await listEnvironments(app.getPath('userData'))
  const machines = await Promise.all(
    environments.map(async (environment): Promise<AgentComputerMachine | null> => {
      const machine = { environmentId: environment.id, name: environment.name }
      try {
        if (!(await hasAgentComputersHub(environment.id))) {
          return null
        }
        const listed = (await agentComputersHubRequest(environment.id, 'GET', '/v1/computers')) as {
          computers: AgentComputer[]
        }
        return { ...machine, computers: listed.computers }
      } catch (error) {
        return { ...machine, computers: [], error: errorText(error) }
      }
    })
  )
  return machines.filter((machine): machine is AgentComputerMachine => machine !== null)
}

export function registerAgentComputerHandlers(): void {
  ipcMain.handle('orcaFork:computers:list', () => listMachines())
  ipcMain.handle(
    'orcaFork:computers:create',
    (_event, environmentId: string, name: string) =>
      agentComputersHubRequest(environmentId, 'POST', '/v1/computers', {
        name
      }) as Promise<AgentComputer>
  )
  ipcMain.handle(
    'orcaFork:computers:viewer',
    async (_event, environmentId: string, computerId: string): Promise<AgentComputerViewer> => {
      const viewer = (await agentComputersHubRequest(
        environmentId,
        'GET',
        computerPath(computerId, 'viewer')
      )) as { webPort: number; password: string }
      const port = await openAgentComputerViewerRelay(environmentId, computerId, viewer.webPort)
      return { url: `ws://127.0.0.1:${port}/websockify`, password: viewer.password }
    }
  )
  ipcMain.handle(
    'orcaFork:computers:control',
    (_event, environmentId: string, computerId: string, holder: 'owner' | null) =>
      agentComputersHubRequest(environmentId, 'POST', computerPath(computerId, 'control'), {
        holder
      }) as Promise<AgentComputerControl>
  )
}
