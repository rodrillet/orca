// orca-fork: Settings › Notifications › "Chat sounds": the switch and volume of the typing, send
// and new-message sounds. Kept with the chat structure on this computer.
import React, { useState } from 'react'
import { MessageSquare, Volume2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { useTranslate } from '@/i18n/use-translate'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import { chatStructureEdits } from '../../../../../shared/orca-fork/channels/chat-structure'
import { NotificationSettingToggle } from '../../settings/notifications/NotificationSettingToggle'
import { editChatStructure, useChatStructure } from '../channels/chat-structure-store'
import { playChatSound } from './chat-sounds'

export function ForkChatSoundsSetting(): React.JSX.Element | null {
  const t = useTranslate()
  const { sounds } = useChatStructure()
  const [draft, setDraft] = useState<number | null>(null)
  if (!FORK_FEATURES.chatSounds) {
    return null
  }
  const volume = Math.round((draft ?? sounds.volume) * 100)
  return (
    <div className="space-y-1">
      <NotificationSettingToggle
        icon={<MessageSquare className="size-4" />}
        label={t('orcaFork.chatSounds.label', 'Chat sounds')}
        description={t(
          'orcaFork.chatSounds.description',
          'A soft click while you type in a chat, a blip when you send and a chime when a bot or channel has a new message. Muted channels stay quiet.'
        )}
        checked={sounds.enabled}
        onToggle={() => {
          editChatStructure(chatStructureEdits.setSounds({ enabled: !sounds.enabled }))
          if (!sounds.enabled) {
            playChatSound('receive', sounds.volume)
          }
        }}
      />
      {sounds.enabled ? (
        <div className="flex items-center gap-3 pb-2">
          <Volume2 className="size-4 text-muted-foreground" />
          <Slider
            value={[volume]}
            min={0}
            max={100}
            step={5}
            onValueChange={([value]) => setDraft((value ?? 0) / 100)}
            onValueCommit={([value]) => {
              const next = (value ?? 0) / 100
              setDraft(null)
              editChatStructure(chatStructureEdits.setSounds({ volume: next }))
              playChatSound('receive', next)
            }}
            className="flex-1"
            aria-label={t('orcaFork.chatSounds.volume', 'Chat sound volume')}
          />
          <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">
            {volume}%
          </span>
        </div>
      ) : null}
    </div>
  )
}
