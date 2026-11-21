// orca-fork: Channels and categories in the renderer, saved by main in userData/orca-fork/.
import {
  emptyChatStructure,
  normalizeChatStructure,
  type ChatStructure
} from '../../../../../shared/orca-fork/channels/chat-structure'
import { createForkDocumentStore } from '../fork-document-store'

export const chatStructureStore = createForkDocumentStore<ChatStructure>({
  storageKey: 'orca-fork:chat-structure',
  empty: () => emptyChatStructure(),
  normalize: (raw) => normalizeChatStructure(raw),
  bridge: () => window.api?.orcaForkChatStructure
})

export function useChatStructure(): ChatStructure {
  return chatStructureStore.use()
}

export const editChatStructure = chatStructureStore.edit
