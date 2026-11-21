// orca-fork: the wiki store's calls as the bots DB worker answers them; Electron- and SQLite-free, so
// the runtime's thread imports only this.
import type {
  ForkWikiWorkspaceId,
  WikiActor,
  WikiBacklinkKind,
  WikiListResult,
  WikiPage,
  WikiPageSummary,
  WikiVersion
} from '../../../shared/orca-fork/wiki/wiki-types'

export const FORK_WIKI_DB_STORE = 'orcaForkWiki'

export type WikiCreateInput = {
  title: string
  body?: string
  folder?: string
  tags?: readonly string[]
  note?: string
}

export type WikiUpdateInput = {
  mode?: 'replace' | 'append' | 'replace_section'
  body?: string
  section?: string
  title?: string
  folder?: string
  tags?: readonly string[]
  baseVersion?: number
  note?: string
}

export type WikiListOptions = { query?: string; tag?: string; trash?: boolean; limit?: number }
export type WikiMentionSource = {
  kind: Exclude<WikiBacklinkKind, 'page'>
  id: string
  title: string
}

/** Every store call, as the worker runs it synchronously. */
export type WikiDbOps = {
  list: (workspaceId: ForkWikiWorkspaceId, options?: WikiListOptions) => WikiListResult
  show: (workspaceId: ForkWikiWorkspaceId, ref: string, trash?: boolean) => WikiPage
  recordView: (pageId: string, actor: WikiActor, chatId: string | null) => void
  create: (workspaceId: ForkWikiWorkspaceId, actor: WikiActor, input: WikiCreateInput) => WikiPage
  update: (
    workspaceId: ForkWikiWorkspaceId,
    actor: WikiActor,
    ref: string,
    input: WikiUpdateInput
  ) => WikiPage
  tag: (
    workspaceId: ForkWikiWorkspaceId,
    actor: WikiActor,
    ref: string,
    add: readonly string[],
    remove: readonly string[]
  ) => WikiPage
  mention: (
    workspaceId: ForkWikiWorkspaceId,
    ref: string,
    source: WikiMentionSource,
    actor: WikiActor
  ) => WikiPage
  history: (
    workspaceId: ForkWikiWorkspaceId,
    ref: string
  ) => { slug: string; title: string; versions: WikiVersion[] }
  restoreVersion: (
    workspaceId: ForkWikiWorkspaceId,
    actor: WikiActor,
    ref: string,
    version: number
  ) => WikiPage
  trash: (workspaceId: ForkWikiWorkspaceId, actor: WikiActor, ref: string) => WikiPageSummary
  restore: (workspaceId: ForkWikiWorkspaceId, ref: string) => WikiPage
  purge: (workspaceId: ForkWikiWorkspaceId, ref: string) => { id: string; title: string }
}

export type WikiDbOp = keyof WikiDbOps

export const FORK_WIKI_DB_OPS: readonly WikiDbOp[] = [
  'list',
  'show',
  'recordView',
  'create',
  'update',
  'tag',
  'mention',
  'history',
  'restoreVersion',
  'trash',
  'restore',
  'purge'
]
