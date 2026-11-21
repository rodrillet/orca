// orca-fork: the renderer's door to userData/orca-fork/token-saving.json.
import { ipcRenderer } from 'electron'
import type { TokenSavingSettings } from '../../../shared/orca-fork/token-saving/token-saving'

export type TokenSavingSettingsApi = {
  read: () => Promise<TokenSavingSettings>
  write: (doc: TokenSavingSettings) => Promise<TokenSavingSettings>
}

export const tokenSavingSettingsApi: TokenSavingSettingsApi = {
  read: () => ipcRenderer.invoke('orcaFork:token-saving:read'),
  write: (doc) => ipcRenderer.invoke('orcaFork:token-saving:write', doc)
}
