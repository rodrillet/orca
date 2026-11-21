import { cn } from '@/lib/class-names'
import type { Bot } from '../../../../shared/bot-types'
import { useBotAvatarSrc } from './bot-avatar-image'
import type { BotOnHost } from '@/lib/bot-hosts'
import { botFallback } from '../../../../shared/bots/bot-avatar-fallback'
import { parseBotAvatar } from '../../../../shared/bot-avatar'
import { BOT_MASCOT_URLS } from './bot-mascots'
// orca-fork: presence dot
import { ForkBotPresenceDot } from '../orca-fork/presence/ForkBotPresenceDot'
import { FORK_FEATURES } from '../../../../shared/orca-fork/fork-features'

/** The bot's picture, else its emoji, else its initial. */
export function BotAvatar({
  bot,
  className,
  style,
  presenceBlocked = false
}: {
  bot: Pick<Bot, 'id' | 'name' | 'avatar' | 'avatarColor'> & BotOnHost
  className?: string
  style?: React.CSSProperties
  /** orca-fork: stopped for a reason its panes don't show (a usage limit), so its dot is red. */
  presenceBlocked?: boolean
}): React.JSX.Element {
  return (
    <BotAvatarTile
      src={useBotAvatarSrc(bot)}
      fallback={botFallback(bot)}
      className={className}
      style={style}
      overlay={
        FORK_FEATURES.botPresence ? (
          <ForkBotPresenceDot bot={bot} blocked={presenceBlocked} />
        ) : undefined
      }
    />
  )
}

/** A bot on another computer, by the avatar its mail carried: its mascot or emoji, else its initial
 *  (an upload stays on that computer). */
export function CarriedBotAvatar({
  name,
  avatar,
  className
}: {
  name: string
  avatar: string | null
  className?: string
}): React.JSX.Element {
  const parsed = parseBotAvatar(avatar)
  return (
    <BotAvatarTile
      src={parsed?.kind === 'mascot' ? BOT_MASCOT_URLS[parsed.id] : null}
      fallback={botFallback({ name, avatar })}
      className={className}
    />
  )
}

/** The tile itself, for a picture not yet saved to a bot (the New bot dialog). */
export function BotAvatarTile({
  src,
  fallback,
  className,
  style,
  overlay
}: {
  src: string | null
  fallback: string
  className?: string
  style?: React.CSSProperties
  /** orca-fork: drawn over the corner (the presence dot), so the tile can't clip it. */
  overlay?: React.ReactNode
}): React.JSX.Element {
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-xs font-semibold text-foreground',
        src && 'border-0 bg-transparent',
        overlay && 'relative overflow-visible',
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt=""
          draggable={false}
          className={cn('size-full object-cover', overlay && 'rounded-[inherit]')}
        />
      ) : (
        fallback
      )}
      {overlay}
    </span>
  )
}
