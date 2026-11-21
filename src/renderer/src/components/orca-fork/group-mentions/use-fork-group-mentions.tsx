// orca-fork: `#` in a chat composer lists the bot groups; picking one writes `#<slug>`.
import React, { useCallback, useMemo } from 'react'
import { Users } from 'lucide-react'
import { useTranslate } from '@/i18n/use-translate'
import { useBots } from '@/lib/bot-catalog'
import type { BotGroup } from '../../../../../shared/bots/bot-group'
import { botGroupTabFaces } from '../../../../../shared/bots/bot-group-face-layout'
import { useForkBotGroups } from './use-fork-bot-groups'
import { FORK_FEATURES } from '../../../../../shared/orca-fork/fork-features'
import {
  groupMentionQuery,
  groupOptions,
  groupSlug
} from '../../../../../shared/orca-fork/group-mentions/group-mentions'
import { BotGroupFaces } from '../../bots/BotGroupFaces'
import type { useNativeChatComposerMentions } from '../../native-chat/native-chat-composer-room'
import type { NativeChatRoomMention } from '../../native-chat/composer/native-chat-composer-types'

type ComposerMentions = ReturnType<typeof useNativeChatComposerMentions>

const VALUE_PREFIX = '#group:'

/** A group's small picture for lists and chips: its members' first faces, or the group glyph. */
export function ForkGroupGlyph({ group }: { group: BotGroup }): React.JSX.Element {
  const bots = useBots()
  const members = group.members.flatMap(
    (member) => bots.find((bot) => bot.id === member.botId && bot.hostId === group.hostId) ?? []
  )
  if (members.length === 0) {
    return <Users className="size-3.5 text-muted-foreground" />
  }
  return (
    <BotGroupFaces
      faces={botGroupTabFaces(members, (bot) => bot.id)}
      className={members.length > 1 ? 'h-3 w-5' : 'size-3'}
    />
  )
}

/** `mentions` with the `#` group list taking over while the caret is in a `#query`. */
export function useForkGroupMentions(
  mentions: ComposerMentions,
  draft: string,
  caret: number,
  { completeMention }: { completeMention: (path: string, token?: string, from?: number) => void }
): ComposerMentions {
  const t = useTranslate()
  const enabled = FORK_FEATURES.groupMentions && mentions.autocomplete.mode === 'none'
  const groups = useForkBotGroups(enabled)
  const typed = enabled ? groupMentionQuery(draft.slice(0, caret)) : null
  const query = typed?.query ?? null
  const from = typed?.from ?? null
  const options = useMemo(
    () => (query !== null && groups.length > 0 ? groupOptions(query, groups) : []),
    [query, groups]
  )
  const choose = useCallback(
    (value: string) => {
      const group = options.find((g) => `${VALUE_PREFIX}${g.id}` === value)
      if (group && from !== null) {
        completeMention(value, `#${groupSlug(group.name)}`, from)
        return
      }
      mentions.chooseMention(value)
    },
    [options, from, completeMention, mentions]
  )
  return useMemo(() => {
    if (from === null || options.length === 0) {
      return mentions
    }
    const entries: NativeChatRoomMention[] = options.map((group) => ({
      name: `#${groupSlug(group.name)}`,
      key: `${VALUE_PREFIX}${group.id}`,
      icon: <ForkGroupGlyph group={group} />,
      note: t('orcaFork.groupMentions.option', '{{name}} · {{count}} bots', {
        name: group.name,
        count: group.members.length
      })
    }))
    const files = entries.map((entry) => entry.key ?? entry.name)
    const listed = { files, loading: false, failed: false }
    return {
      ...mentions,
      autocomplete: {
        mode: 'mention' as const,
        query: query ?? '',
        triggerKey: `#:${from}`
      },
      listed,
      mentionFiles: listed,
      activeIndex: null,
      chooseMention: choose,
      handleKey: () => false,
      roomContext: { replies: null, mentions: entries, withFiles: false, unavailable: [] }
    }
  }, [from, options, mentions, choose, t, query])
}
