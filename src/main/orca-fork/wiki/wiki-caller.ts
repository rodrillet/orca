// orca-fork: whose wiki a call is for and who makes it: the named workspace, else the calling agent's
// own (its bot's or its project's, as the owner's Orca placed them), else this machine's home workspace.
import type { Bot } from '../../../shared/bot-types'
import {
  DEFAULT_FORK_WIKI_WORKSPACE_ID,
  type WikiActor
} from '../../../shared/orca-fork/wiki/wiki-types'
import { getRepoIdFromWorktreeId } from '../../../shared/worktree/id'
import { folderWorkspaceKey } from '../../../shared/workspace/identity/workspace-scope'
import { botOfCaller } from '../../bots/bot-of-caller'
import { isAgentRpcCaller } from '../../runtime/rpc/callers/rpc-caller-identity'
import type { RpcContext } from '../../runtime/rpc/core'
import type { WikiPlacement } from './wiki-db-contract'
import { forkWikiDb } from './wiki-db-remote'

export type WikiScope = {
  workspaceId?: string
  callerSessionId?: string
  agentName?: string
  callerWorkspaceIds?: string[]
}

let placement: Promise<WikiPlacement> | null = null

function knownPlacement(): Promise<WikiPlacement> {
  placement ??= forkWikiDb.placement().catch(() => ({ bots: {}, repos: {} }))
  return placement
}

/** The bot whose chat or home the agent runs in; only this host's own CLI names its caller. */
function callerBot(params: WikiScope, context: RpcContext): Bot | null {
  if (context.pairedDeviceId !== undefined) {
    return null
  }
  const ids = params.callerWorkspaceIds ?? []
  return (
    botOfCaller(context.runtime, params.callerSessionId, context.pairedDeviceId) ??
    (context.runtime.bots.enabled()
      ? (context.runtime.bots
          .list()
          .find((bot) => ids.includes(folderWorkspaceKey(bot.folderWorkspaceId))) ?? null)
      : null)
  )
}

/** The named workspace, else the caller's: its bot's or its project's, else this machine's home. */
export async function workspace(params: WikiScope, context: RpcContext): Promise<string> {
  const named = params.workspaceId?.trim()
  if (named || !isAgentRpcCaller(context.caller) || context.pairedDeviceId !== undefined) {
    return named || DEFAULT_FORK_WIKI_WORKSPACE_ID
  }
  const known = await knownPlacement()
  const bot = callerBot(params, context)
  if (bot) {
    return known.bots[bot.id] ?? DEFAULT_FORK_WIKI_WORKSPACE_ID
  }
  for (const id of params.callerWorkspaceIds ?? []) {
    const claimed = id.includes('::') ? known.repos[getRepoIdFromWorktreeId(id)] : undefined
    if (claimed) {
      return claimed
    }
  }
  return DEFAULT_FORK_WIKI_WORKSPACE_ID
}

/** The calling chat, which only this host's own CLI may claim. */
export function callerChat(params: WikiScope, context: RpcContext): string | null {
  return context.pairedDeviceId === undefined && isAgentRpcCaller(context.caller)
    ? (params.callerSessionId ?? null)
    : null
}

export function actor(params: WikiScope, context: RpcContext): WikiActor {
  if (!isAgentRpcCaller(context.caller)) {
    return { kind: 'owner' }
  }
  const bot = callerBot(params, context)
  if (bot) {
    return { kind: 'bot', botId: bot.id, name: bot.name }
  }
  return { kind: 'agent', name: params.agentName?.trim().slice(0, 80) || 'Agent' }
}

export function rememberPlacement(saved: WikiPlacement): void {
  placement = Promise.resolve(saved)
}
