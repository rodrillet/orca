// orca-fork: plays the chat sounds: keys and Enter in any chat box, and a chime when a bot's chat or
// a channel turns unread (muted channels stay quiet).
import React, { useEffect, useRef } from 'react'
import { useAppStore } from '@/store'
import { selectFolderWorkspaces } from '@/store/workspaces/catalog/workspace-record-fields'
import { useBotGroups } from '@/lib/bot-group-list'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { botSidebarEntryKey } from '../../bots/bot-sidebar-entry-keys'
import { chatStructureStore } from '../channels/chat-structure-store'
import { isTypingKey, playChatSound } from './chat-sounds'

const COMPOSER = '[data-native-chat-prompt-editor]'

function soundsOn(): { on: boolean; volume: number } {
  const { sounds } = chatStructureStore.get()
  return { on: FORK_FEATURES.chatSounds && sounds.enabled, volume: sounds.volume }
}

export function ForkChatSounds(): React.JSX.Element | null {
  const groups = useBotGroups()
  const mutedFolders = useRef(new Set<string>())
  useEffect(() => {
    const muted = new Set<string>()
    const { channels } = chatStructureStore.get()
    for (const group of groups) {
      if (channels[botSidebarEntryKey(group)]?.muted) {
        muted.add(group.folderWorkspaceId)
      }
    }
    mutedFolders.current = muted
  })

  useEffect(() => {
    if (!FORK_FEATURES.chatSounds) {
      return
    }
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target instanceof Element ? event.target : null
      const { on, volume } = soundsOn()
      if (!on || !target?.closest(COMPOSER)) {
        return
      }
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
        playChatSound('send', volume)
      } else if (isTypingKey(event)) {
        playChatSound('key', volume * 0.6)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [])

  useEffect(() => {
    if (!FORK_FEATURES.chatSounds) {
      return
    }
    const unreadIds = (folders: readonly { id: string; isUnread: boolean }[]): Set<string> =>
      new Set(folders.filter((folder) => folder.isUnread).map((folder) => folder.id))
    let folders = selectFolderWorkspaces(useAppStore.getState())
    let previous = unreadIds(folders)
    return useAppStore.subscribe((state) => {
      // Most store changes leave the folders alone; only a new list is read.
      if (selectFolderWorkspaces(state) === folders) {
        return
      }
      folders = selectFolderWorkspaces(state)
      const next = unreadIds(folders)
      const fresh = [...next].some((id) => !previous.has(id) && !mutedFolders.current.has(id))
      previous = next
      const { on, volume } = soundsOn()
      if (fresh && on) {
        playChatSound('receive', volume)
      }
    })
  }, [])
  return null
}
