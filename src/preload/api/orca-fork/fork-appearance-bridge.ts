// orca-fork: Settings › Appearance › Customization's window opacity, set by the renderer for its window.
import { ipcRenderer } from 'electron'

export type ForkAppearanceApi = {
  setWindowOpacity: (opacity: number) => Promise<boolean>
}

export const forkAppearanceApi: ForkAppearanceApi = {
  setWindowOpacity: (opacity) => ipcRenderer.invoke('orcaFork:appearance:setWindowOpacity', opacity)
}
