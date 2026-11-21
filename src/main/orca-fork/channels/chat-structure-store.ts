// orca-fork: keeps Channels and their categories in userData/orca-fork/chat-structure.json.
import { normalizeChatStructure } from '../../../shared/orca-fork/channels/chat-structure'
import { registerForkDocumentFile } from '../fork-document-file'

export function registerChatStructureHandlers(): void {
  registerForkDocumentFile('chat-structure', (raw) => normalizeChatStructure(raw))
}
