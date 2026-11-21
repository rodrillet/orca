// orca-fork: the renderer's door to userData/orca-fork/chat-structure.json.
import { ipcRenderer } from 'electron'
import type { ChatStructure } from '../../../shared/orca-fork/channels/chat-structure'

export type ChatStructureApi = {
  read: () => Promise<ChatStructure>
  write: (doc: ChatStructure) => Promise<ChatStructure>
}

export const chatStructureApi: ChatStructureApi = {
  read: () => ipcRenderer.invoke('orcaFork:chat-structure:read'),
  write: (doc) => ipcRenderer.invoke('orcaFork:chat-structure:write', doc)
}
