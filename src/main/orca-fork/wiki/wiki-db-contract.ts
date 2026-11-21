// orca-fork: the wiki store's calls as the bots DB worker answers them; Electron- and SQLite-free, so
// the runtime's thread imports only this.
import type {
  ForkWikiWorkspaceId,
  WikiActivityResult,
  WikiActor,
  WikiBacklinkKind,
  WikiListResult,
  WikiPage,
  WikiPageSummary,
  WikiReadContext,
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

/** Bot id → workspace key and repo id → workspace key, for this machine's non-home workspaces only. */
export type WikiPlacement = { bots: Record<string, string>; repos: Record<string, string> }

function stringMap(value: unknown): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')
      .slice(0, 5_000)
  )
}

export function normalizeWikiPlacement(value: unknown): WikiPlacement {
  const record = typeof value === 'object' && value !== null ? value : {}
  return {
    bots: stringMap('bots' in record ? record.bots : null),
    repos: stringMap('repos' in record ? record.repos : null)
  }
}

/** The consultation log: everyone's, one reader's (`actorKey`) or one page's; older than `before` pages back. */
export type WikiActivityOptions = {
  actorKey?: string
  page?: string
  before?: number
  limit?: number
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
  recordView: (pageId: string, actor: WikiActor, context: Partial<WikiReadContext> | null) => void
  activity: (workspaceId: ForkWikiWorkspaceId, options?: WikiActivityOptions) => WikiActivityResult
  pin: (workspaceId: ForkWikiWorkspaceId, ref: string, pinned: boolean) => WikiPage
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
  setPlacement: (placement: WikiPlacement) => WikiPlacement
  placement: () => WikiPlacement
}

export type WikiDbOp = keyof WikiDbOps

export const FORK_WIKI_DB_OPS: readonly WikiDbOp[] = [
  'list',
  'show',
  'recordView',
  'activity',
  'pin',
  'create',
  'update',
  'tag',
  'mention',
  'history',
  'restoreVersion',
  'trash',
  'restore',
  'purge',
  'setPlacement',
  'placement'
]
