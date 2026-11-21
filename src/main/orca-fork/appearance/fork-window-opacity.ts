// orca-fork: Settings › Appearance › Customization's window opacity: a renderer sets its own window's.
import { BrowserWindow, ipcMain } from 'electron'
import { FORK_WINDOW_OPACITY_MIN } from '../../../shared/orca-fork/appearance/fork-appearance'

export const FORK_WINDOW_OPACITY_CHANNEL = 'orcaFork:appearance:setWindowOpacity'

export function registerForkAppearanceHandlers(): void {
  ipcMain.handle(FORK_WINDOW_OPACITY_CHANNEL, (event, value: unknown) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    // Linux has no per-window opacity in Electron.
    if (
      !window ||
      process.platform === 'linux' ||
      typeof value !== 'number' ||
      !Number.isFinite(value)
    ) {
      return false
    }
    window.setOpacity(Math.min(1, Math.max(FORK_WINDOW_OPACITY_MIN, value)))
    return true
  })
}
