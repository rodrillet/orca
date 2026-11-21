// orca-fork: the workspace wiki agents write while they work and the owner reads, edits and curates.
// Kept by the host (orca-server or this app's runtime) in orca-fork-wiki.sqlite, keyed by workspace.

import type { ForkWorkspaceId } from '../workspaces/fork-workspace'

/**
 * How a host keys a workspace's pages: its machine's home workspace is `home` (agents there need no
 * flag, and the host never learns the desktop-minted id), any other workspace on it by its id
 * (`forkWorkspaceHomeOf(doc, ws.hostId)?.id === ws.id ? 'home' : ws.id`).
 */
export type ForkWikiWorkspaceId = ForkWorkspaceId
export const DEFAULT_FORK_WIKI_WORKSPACE_ID: ForkWikiWorkspaceId = 'home'

/** Who wrote or read: the owner in Orca, a bot from its chat, or another agent's CLI. */
export type WikiActor =
  | { kind: 'owner' }
  | { kind: 'bot'; botId: string; name: string }
  | { kind: 'agent'; name: string }

export type WikiPageSummary = {
  id: string
  workspaceId: ForkWikiWorkspaceId
  slug: string
  title: string
  /** "Engineering/Backend"; '' at the root. */
  folder: string
  tags: string[]
  excerpt: string
  version: number
  createdAt: number
  createdBy: WikiActor
  updatedAt: number
  updatedBy: WikiActor
  viewCount: number
  lastViewedAt: number | null
  /** Set while the page is in the trash. */
  deletedAt: number | null
  deletedBy: WikiActor | null
}

export type WikiBacklinkKind = 'page' | 'chat' | 'item'

/** Where a page is mentioned: another page's [[link]], a chat that cited it, or an item. */
export type WikiBacklink = {
  kind: WikiBacklinkKind
  /** The page's slug, the chat's session id, or the item's `<botId>:<number>`. */
  id: string
  title: string
  at: number
  by: WikiActor | null
}

export type WikiOutgoingLink = { target: string; slug: string; exists: boolean }

export type WikiViewer = { actor: WikiActor; count: number; lastAt: number }
export type WikiView = { at: number; by: WikiActor; chatId: string | null }

export type WikiPage = WikiPageSummary & {
  body: string
  backlinks: WikiBacklink[]
  links: WikiOutgoingLink[]
  viewers: WikiViewer[]
  recentViews: WikiView[]
}

export type WikiVersion = {
  version: number
  title: string
  folder: string
  body: string
  tags: string[]
  at: number
  by: WikiActor
  note: string | null
}

export type WikiTagCount = { tag: string; count: number }

export type WikiListResult = {
  workspaceId: ForkWikiWorkspaceId
  pages: WikiPageSummary[]
  tags: WikiTagCount[]
  trashCount: number
}

export type WikiHistoryResult = { slug: string; title: string; versions: WikiVersion[] }

export function wikiActorKey(actor: WikiActor): string {
  switch (actor.kind) {
    case 'owner':
      return 'owner'
    case 'bot':
      return `bot:${actor.botId}`
    case 'agent':
      return `agent:${actor.name}`
  }
}

export function wikiActorName(actor: WikiActor, ownerName: string): string {
  return actor.kind === 'owner' ? ownerName : actor.name
}

export const WIKI_LIMITS = {
  title: 200,
  folder: 200,
  body: 400_000,
  tag: 40,
  tags: 20,
  note: 300,
  search: 300,
  versionsKept: 200,
  viewsKept: 500,
  recentViews: 30
} as const
