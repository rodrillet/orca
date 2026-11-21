// orca-fork: the renderer's door to userData/orca-fork/organization.json.
import { ipcRenderer } from 'electron'
import type { BotOrganization } from '../../../shared/orca-fork/organization/bot-organization'

export type BotOrganizationApi = {
  read: () => Promise<BotOrganization>
  write: (doc: BotOrganization) => Promise<BotOrganization>
}

export const botOrganizationApi: BotOrganizationApi = {
  read: () => ipcRenderer.invoke('orcaFork:organization:read'),
  write: (doc) => ipcRenderer.invoke('orcaFork:organization:write', doc)
}
