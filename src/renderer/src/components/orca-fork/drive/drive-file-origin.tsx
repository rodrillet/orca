// orca-fork: who a Drive file came from, as its card, row and preview name it.
import { User } from 'lucide-react'
import { BotAvatar } from '@/components/bots/BotAvatar'
import { useBots } from '@/lib/bot-catalog'
import { useTranslate } from '@/i18n/use-translate'
import type { Bot } from '../../../../../shared/bot-types'
import type { DriveEntry } from './drive-host-data'

export type DriveFileOrigin = {
  label: string
  avatar: React.ReactNode
  /** The bot the file came from, when it is listed. */
  bot: Bot | null
  sessionId: string | null
}

export function findDriveFileBot(bots: readonly Bot[], file: DriveEntry): Bot | null {
  const source = file.source
  if (source.kind === 'upload' || !source.botId) {
    return null
  }
  return bots.find((bot) => bot.hostId === file.hostId && bot.id === source.botId) ?? null
}

export function useDriveFileOrigin(file: DriveEntry): DriveFileOrigin {
  const t = useTranslate()
  const bots = useBots()
  const bot = findDriveFileBot(bots, file)
  const source = file.source
  const you = t('orcaFork.drive.you', 'You')
  const botName = bot?.name ?? (source.kind === 'upload' ? undefined : source.botName)
  const avatar = bot ? (
    <BotAvatar bot={bot} className="size-4 shrink-0 rounded-full text-[8px]" />
  ) : (
    <User className="size-3.5 shrink-0" aria-hidden />
  )
  if (source.kind === 'agent') {
    return {
      label: botName ?? t('orcaFork.drive.anAgent', 'An agent'),
      avatar,
      bot,
      sessionId: source.sessionId ?? null
    }
  }
  if (source.kind === 'chat-attachment') {
    return {
      label: botName
        ? t('orcaFork.drive.youInChat', 'You, in {{name}}’s chat', { name: botName })
        : t('orcaFork.drive.youInAChat', 'You, in a chat'),
      avatar: <User className="size-3.5 shrink-0" aria-hidden />,
      bot,
      sessionId: source.sessionId
    }
  }
  return {
    label: you,
    avatar: <User className="size-3.5 shrink-0" aria-hidden />,
    bot: null,
    sessionId: null
  }
}
