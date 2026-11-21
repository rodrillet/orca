// orca-fork: keeps the desktop's token-saving choices in userData/orca-fork/token-saving.json.
import { normalizeTokenSavingSettings } from '../../../shared/orca-fork/token-saving/token-saving'
import { registerForkDocumentFile } from '../fork-document-file'

export function registerTokenSavingSettingsHandlers(): void {
  registerForkDocumentFile('token-saving', (raw) => normalizeTokenSavingSettings(raw))
}
