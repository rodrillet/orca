// orca-fork: `orcaFork.wiki.*`, the workspace wiki on this host. Agents (the orca CLI) read and write
// it as their bot, or by name; the owner's Orca and paired desktops read, edit, restore and purge.
import {
  ForkWikiCreate,
  ForkWikiLink,
  ForkWikiList,
  ForkWikiMention,
  ForkWikiPageRef,
  ForkWikiRestoreVersion,
  ForkWikiShow,
  ForkWikiTag,
  ForkWikiUpdate
} from '../../../shared/rpc-contract/orca-fork-wiki-params'
import {
  DEFAULT_FORK_WIKI_WORKSPACE_ID,
  type WikiActor,
  type WikiHistoryResult
} from '../../../shared/orca-fork/wiki/wiki-types'
import { FORK_FEATURES } from '../../../shared/orca-fork/fork-features'
import { botOfCaller } from '../../bots/bot-of-caller'
import { readAgentSessionRecordStore } from '../../runtime/orchestration/addressing/session-lineage/structured-session-lineage'
import { isAgentRpcCaller } from '../../runtime/rpc/callers/rpc-caller-identity'
import { defineMethod, type RpcContext } from '../../runtime/rpc/core'
import { forkWikiDb } from './wiki-db-remote'
import { WikiError } from './wiki-error'

function store(): typeof forkWikiDb {
  if (!FORK_FEATURES.workspaceWiki) {
    throw new WikiError('The wiki is turned off in this build.')
  }
  return forkWikiDb
}

type Scope = { workspaceId?: string; callerSessionId?: string; agentName?: string }

function workspace(params: Scope): string {
  return params.workspaceId?.trim() || DEFAULT_FORK_WIKI_WORKSPACE_ID
}

/** The calling chat, which only this host's own CLI may claim. */
function callerChat(params: Scope, context: RpcContext): string | null {
  return context.pairedDeviceId === undefined && isAgentRpcCaller(context.caller)
    ? (params.callerSessionId ?? null)
    : null
}

function actor(params: Scope, context: RpcContext): WikiActor {
  if (!isAgentRpcCaller(context.caller)) {
    return { kind: 'owner' }
  }
  const bot = botOfCaller(context.runtime, params.callerSessionId, context.pairedDeviceId)
  if (bot) {
    return { kind: 'bot', botId: bot.id, name: bot.name }
  }
  return { kind: 'agent', name: params.agentName?.trim().slice(0, 80) || 'Agent' }
}

function chatTitle(sessionId: string): string {
  return readAgentSessionRecordStore()?.getRecord(sessionId)?.conversationName ?? 'Chat'
}

const LIST = defineMethod({
  name: 'orcaFork.wiki.list',
  permission: 'workspace',
  params: ForkWikiList,
  handler: async (params) =>
    store().list(workspace(params), {
      ...(params.query ? { query: params.query } : {}),
      ...(params.tag ? { tag: params.tag } : {}),
      ...(params.trash ? { trash: true } : {}),
      ...(params.limit ? { limit: params.limit } : {})
    })
})

const SHOW = defineMethod({
  name: 'orcaFork.wiki.show',
  permission: 'workspace',
  params: ForkWikiShow,
  handler: async (params, context) => {
    const wiki = store()
    const page = await wiki.show(workspace(params), params.page, !isAgentRpcCaller(context.caller))
    if (params.view && page.deletedAt === null) {
      await wiki.recordView(page.id, actor(params, context), callerChat(params, context))
      return wiki.show(workspace(params), page.id)
    }
    return page
  }
})

const CREATE = defineMethod({
  name: 'orcaFork.wiki.create',
  permission: 'workspace',
  params: ForkWikiCreate,
  handler: async (params, context) =>
    store().create(workspace(params), actor(params, context), {
      title: params.title,
      ...(params.body !== undefined ? { body: params.body } : {}),
      ...(params.folder !== undefined ? { folder: params.folder } : {}),
      ...(params.tags ? { tags: params.tags } : {}),
      ...(params.note ? { note: params.note } : {})
    })
})

const UPDATE = defineMethod({
  name: 'orcaFork.wiki.update',
  permission: 'workspace',
  params: ForkWikiUpdate,
  handler: async (params, context) =>
    store().update(workspace(params), actor(params, context), params.page, {
      ...(params.mode ? { mode: params.mode } : {}),
      ...(params.body !== undefined ? { body: params.body } : {}),
      ...(params.section ? { section: params.section } : {}),
      ...(params.title ? { title: params.title } : {}),
      ...(params.folder !== undefined ? { folder: params.folder } : {}),
      ...(params.tags ? { tags: params.tags } : {}),
      ...(params.baseVersion !== undefined ? { baseVersion: params.baseVersion } : {}),
      ...(params.note ? { note: params.note } : {})
    })
})

const TAG = defineMethod({
  name: 'orcaFork.wiki.tag',
  permission: 'workspace',
  params: ForkWikiTag,
  handler: async (params, context) =>
    store().tag(
      workspace(params),
      actor(params, context),
      params.page,
      params.add ?? [],
      params.remove ?? []
    )
})

const LINK = defineMethod({
  name: 'orcaFork.wiki.link',
  permission: 'workspace',
  params: ForkWikiLink,
  handler: async (params, context) => {
    const targets = params.to.map((to) => to.replace(/[[\]]/g, '').trim()).filter(Boolean)
    return store().update(workspace(params), actor(params, context), params.page, {
      mode: 'append',
      body: targets.map((to) => `- [[${to}]]`).join('\n'),
      section: params.section ?? 'See also',
      note: `Linked ${targets.join(', ')}`
    })
  }
})

const MENTION = defineMethod({
  name: 'orcaFork.wiki.mention',
  permission: 'workspace',
  params: ForkWikiMention,
  handler: async (params, context) => {
    const who = actor(params, context)
    if (params.kind === 'item') {
      if (!params.sourceId) {
        throw new WikiError('Name the item with --item <number>.')
      }
      const owner = who.kind === 'bot' ? who.botId : 'owner'
      const title =
        params.sourceTitle ??
        `Item #${params.sourceId}${who.kind === 'bot' ? ` · ${who.name}` : ''}`
      return store().mention(
        workspace(params),
        params.page,
        { kind: 'item', id: `${owner}:${params.sourceId}`, title },
        who
      )
    }
    const chatId = params.sourceId ?? callerChat(params, context)
    if (!chatId) {
      throw new WikiError('Run this from the chat that mentions the page, or pass --chat <id>.')
    }
    return store().mention(
      workspace(params),
      params.page,
      { kind: 'chat', id: chatId, title: params.sourceTitle ?? chatTitle(chatId) },
      who
    )
  }
})

const HISTORY = defineMethod({
  name: 'orcaFork.wiki.history',
  permission: 'workspace',
  params: ForkWikiPageRef,
  handler: async (params): Promise<WikiHistoryResult> =>
    store().history(workspace(params), params.page)
})

const RESTORE_VERSION = defineMethod({
  name: 'orcaFork.wiki.restoreVersion',
  permission: 'workspace',
  params: ForkWikiRestoreVersion,
  handler: async (params, context) =>
    store().restoreVersion(workspace(params), actor(params, context), params.page, params.version)
})

const TRASH = defineMethod({
  name: 'orcaFork.wiki.trash',
  permission: 'workspace',
  params: ForkWikiPageRef,
  handler: async (params, context) =>
    store().trash(workspace(params), actor(params, context), params.page)
})

const RESTORE = defineMethod({
  name: 'orcaFork.wiki.restore',
  permission: 'workspace',
  params: ForkWikiPageRef,
  handler: async (params) => store().restore(workspace(params), params.page)
})

const PURGE = defineMethod({
  name: 'orcaFork.wiki.purge',
  permission: 'workspace',
  params: ForkWikiPageRef,
  handler: async (params, context) => {
    if (isAgentRpcCaller(context.caller)) {
      throw new WikiError('Only your owner empties the trash, in Orca.')
    }
    return store().purge(workspace(params), params.page)
  }
})

export const FORK_WIKI_METHODS = [
  LIST,
  SHOW,
  CREATE,
  UPDATE,
  TAG,
  LINK,
  MENTION,
  HISTORY,
  RESTORE_VERSION,
  TRASH,
  RESTORE,
  PURGE
] as const
