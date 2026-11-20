// The desktop's pending comments on an item: sent through the bot's host, a failure as a toast.
import { useEffect, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { botRefKey, botTarget, type BotRef } from '@/lib/bot-hosts'
import { readCachedRuntimeEnvironmentCapability } from '@/runtime/rpc/compatibility/runtime-compatibility-cache'
import { runtimeTargetEnvironmentId } from '@/runtime/rpc/targets/runtime-client-target'
import { BOTS_ITEM_COMMENT_REQUEST_ID_RUNTIME_CAPABILITY } from '../../../../../shared/bot-runtime-capabilities'
import type { BotItemEvent } from '../../../../../shared/bots/bot-items'
import {
  botItemPendingCommentText,
  createBotItemPendingCommentsHook,
  type BotItemPendingComments
} from '../../../../../shared/bots/bot-item-pending-comments'
import { botErrorMessage } from '../bot-presentation'
import { commentOnBotItem } from './use-bot-items'

const usePendingComments = createBotItemPendingCommentsHook({ useEffect, useSyncExternalStore })

export function useBotItemPendingComments(
  bot: BotRef,
  uid: string,
  events: readonly BotItemEvent[]
): BotItemPendingComments {
  return usePendingComments(`${botRefKey(bot)}\0${uid}`, events, {
    post: (entry) =>
      commentOnBotItem(
        bot,
        uid,
        botItemPendingCommentText(entry),
        entry.paths,
        entry.requestId ?? undefined
      ),
    failed: (error) => toast.error(botErrorMessage(error)),
    requestIds: takesRequestId(bot)
  })
}

/** An unknown answer is no: an older host refuses the field. This app's own host always takes it. */
function takesRequestId(bot: BotRef): boolean {
  const environmentId = runtimeTargetEnvironmentId(botTarget(bot))
  return (
    environmentId === null ||
    readCachedRuntimeEnvironmentCapability(
      environmentId,
      BOTS_ITEM_COMMENT_REQUEST_ID_RUNTIME_CAPABILITY
    ) === true
  )
}
