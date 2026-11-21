// orca-fork: the Agents board's cards: one per bot item and one per worker no item links, in four columns.
import type {
  CheckStatus,
  PRState
} from '../../../../../shared/github/pull-requests/pull-request-types'
import {
  botItemLinksOnePerChain,
  isBotItemLive,
  type BotItem,
  type BotItemPullRequest,
  type BotItemStatus
} from '../../../../../shared/bots/bot-items'
import type { BotWorkerSummary } from '../../../../../shared/bots/bot-work-list'
import type { OrchestrationSessionWorker } from '../../../../../shared/orchestration-session-workers'
import type { BotWorkPullRequest } from '../../../../../shared/bots/bot-work-pull-request'

export const AGENTS_BOARD_COLUMNS = ['todo', 'doing', 'needs_you', 'done'] as const
export type AgentsBoardColumn = (typeof AGENTS_BOARD_COLUMNS)[number]

/** Done cards older than this leave the board; the Items tab keeps them. */
export const AGENTS_BOARD_DONE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type AgentsBoardPr = {
  number: number
  url: string
  state: PRState
  checks: CheckStatus | null
  review: string | null
}

export type AgentsBoardWorkerState = BotWorkerSummary['state'] | 'waiting'

export type AgentsBoardCard = {
  key: string
  kind: 'item' | 'worker'
  /** `hostId/botId`, the organization's and the board filters' bot key. */
  botKey: string
  column: AgentsBoardColumn
  title: string
  /** The item's number; null for a worker. */
  number: number | null
  /** The item's open question, or the worker's report subject. */
  detail: string | null
  /** A worker of it is running: the card shows its sweep. */
  live: boolean
  workerState: AgentsBoardWorkerState | null
  workspace: string | null
  pr: AgentsBoardPr | null
  itemUid: string | null
  agent: string | null
  at: number
  /** What was done: the item's close note or its newest worker's report; a worker's own result. */
  summary: string | null
  /** The item's "done means". */
  doneMeans: string | null
  /** When the work began: its first worker, else (once under way) the item's creation. */
  startedAt: number | null
  /** When it finished: the item closed or the worker settled; null while open. */
  finishedAt: number | null
  /** The item's other links (URLs and files), beside its PR. */
  linkCount: number
  /** Workers the item had, one per follow-up chain. */
  workerCount: number
  /** The worker's Dispatch (a worker card), or the item's newest. */
  dispatchId: string | null
}

/** A worker's own record, as the bot's Activity carries it, by Dispatch. */
export type AgentsBoardWorkerRecords = ReadonlyMap<string, OrchestrationSessionWorker>

const ITEM_COLUMN: Record<BotItemStatus, AgentsBoardColumn | null> = {
  planned: 'todo',
  working: 'doing',
  needs_you: 'needs_you',
  done: 'done',
  canceled: null
}

const COLUMN_ITEM_STATUS: Record<AgentsBoardColumn, BotItemStatus> = {
  todo: 'planned',
  doing: 'working',
  needs_you: 'needs_you',
  done: 'done'
}

export function itemStatusForColumn(column: AgentsBoardColumn): BotItemStatus {
  return COLUMN_ITEM_STATUS[column]
}

function workerColumn(worker: BotWorkerSummary): AgentsBoardColumn {
  switch (worker.state) {
    case 'working':
      return worker.idle ? 'needs_you' : 'doing'
    case 'failed':
      return 'needs_you'
    case 'completed':
    case 'stopped':
      return 'done'
    case 'unverifiable':
    case null:
      return 'doing'
  }
}

const CHECKS: readonly CheckStatus[] = ['pending', 'success', 'failure', 'neutral']

function itemPr(pr: BotItemPullRequest | null): AgentsBoardPr | null {
  if (!pr?.shown) {
    return null
  }
  return {
    number: pr.number,
    url: pr.url,
    state: pr.state,
    checks: CHECKS.find((check) => check === pr.checks) ?? null,
    review: pr.review
  }
}

function workerPr(pr: BotWorkPullRequest | null): AgentsBoardPr | null {
  return pr
    ? { number: pr.number, url: pr.url, state: pr.state, checks: pr.checks, review: pr.review }
    : null
}

/** The item's newest PR: a worker's, else one linked on its own. */
function firstItemPr(item: BotItem): AgentsBoardPr | null {
  for (const link of botItemLinksOnePerChain(item.links).toReversed()) {
    const pr = link.kind === 'dispatch' || link.kind === 'pr' ? itemPr(link.pr) : null
    if (pr) {
      return pr
    }
  }
  return null
}

function linkedDispatches(items: readonly BotItem[]): Set<string> {
  const ids = new Set<string>()
  for (const item of items) {
    for (const link of item.links) {
      if (link.kind === 'dispatch') {
        ids.add(link.ref)
        if (link.latest) {
          ids.add(link.latest)
        }
      }
    }
  }
  return ids
}

export function buildBotBoardCards(
  botKey: string,
  items: readonly BotItem[],
  workers: readonly BotWorkerSummary[],
  now: number,
  records: AgentsBoardWorkerRecords = new Map()
): AgentsBoardCard[] {
  const cards: AgentsBoardCard[] = []
  const workerByDispatch = new Map(workers.map((worker) => [worker.dispatchId, worker]))
  for (const item of items) {
    const column = ITEM_COLUMN[item.status]
    if (
      !column ||
      (column === 'done' && now - (item.closedAt ?? item.updatedAt) > AGENTS_BOARD_DONE_WINDOW_MS)
    ) {
      continue
    }
    const worker = item.links
      .map((link) =>
        link.kind === 'dispatch' ? workerByDispatch.get(link.latest ?? link.ref) : undefined
      )
      .find((found) => found !== undefined)
    const chains = botItemLinksOnePerChain(item.links)
    const dispatches = chains.flatMap((link) => (link.kind === 'dispatch' ? [link] : []))
    const newest = dispatches.at(-1)
    const firstStart = dispatches.reduce<number | null>(
      (min, link) =>
        link.startedAt !== null && (min === null || link.startedAt < min) ? link.startedAt : min,
      null
    )
    const report = dispatches
      .toReversed()
      .map((link) => link.report)
      .find((found) => found !== null)
    cards.push({
      key: `${botKey}:item:${item.uid}`,
      kind: 'item',
      botKey,
      column,
      title: item.title,
      number: item.number,
      detail: item.status === 'needs_you' ? (item.question?.text ?? null) : null,
      live: isBotItemLive(item),
      workerState: null,
      workspace: worker?.workspace ?? null,
      pr: firstItemPr(item) ?? workerPr(worker?.pr ?? null),
      itemUid: item.uid,
      agent: worker?.agent ?? null,
      at: item.lastActivityAt,
      summary: item.closeNote ?? report?.subject ?? null,
      doneMeans: item.doneMeans,
      // A planned item hasn't started; a running or closed one began with its first worker or itself.
      startedAt: firstStart ?? (column === 'todo' || item.createdAt <= 0 ? null : item.createdAt),
      finishedAt: item.closedAt,
      linkCount: chains.filter((link) => link.kind === 'url' || link.kind === 'file').length,
      workerCount: dispatches.length,
      dispatchId: newest ? (newest.latest ?? newest.ref) : null
    })
  }
  const linked = linkedDispatches(items)
  for (const worker of workers) {
    if (linked.has(worker.dispatchId)) {
      continue
    }
    const column = workerColumn(worker)
    const record = records.get(worker.dispatchId)
    const at = worker.startedAt ?? record?.startedAt ?? 0
    if (column === 'done' && now - at > AGENTS_BOARD_DONE_WINDOW_MS) {
      continue
    }
    cards.push({
      key: `${botKey}:worker:${worker.id}`,
      kind: 'worker',
      botKey,
      column,
      title: worker.title,
      number: null,
      detail: null,
      live: worker.state === 'working' && !worker.idle,
      workerState: worker.state === 'working' && worker.idle ? 'waiting' : worker.state,
      workspace: worker.workspace,
      pr: workerPr(worker.pr),
      itemUid: null,
      agent: worker.agent,
      at: record?.settledAt ?? at,
      summary: record?.summary ?? null,
      doneMeans: null,
      startedAt: at > 0 ? at : null,
      finishedAt: column === 'done' ? (record?.settledAt ?? null) : null,
      linkCount: 0,
      workerCount: 1,
      dispatchId: worker.dispatchId
    })
  }
  return cards
}

export type AgentsBoardFilters = {
  workspaces: string[]
  hosts: string[]
  bots: string[]
  tags: string[]
}

export const EMPTY_AGENTS_BOARD_FILTERS: AgentsBoardFilters = {
  workspaces: [],
  hosts: [],
  bots: [],
  tags: []
}

export function activeAgentsBoardFilterCount(filters: AgentsBoardFilters): number {
  return (
    filters.workspaces.length + filters.hosts.length + filters.bots.length + filters.tags.length
  )
}

/** What a card is filtered by besides its own fields: its bot's machine and organization tags. */
export type AgentsBoardCardFacets = { hostId: string; botName: string; tags: readonly string[] }

function matchesAny(selected: readonly string[], values: readonly (string | null)[]): boolean {
  return selected.length === 0 || values.some((value) => value !== null && selected.includes(value))
}

export function filterAgentsBoardCards(
  cards: readonly AgentsBoardCard[],
  facets: (card: AgentsBoardCard) => AgentsBoardCardFacets,
  filters: AgentsBoardFilters,
  query: string
): AgentsBoardCard[] {
  const needle = query.trim().toLowerCase()
  return cards.filter((card) => {
    const facet = facets(card)
    if (
      !matchesAny(filters.workspaces, [card.workspace]) ||
      !matchesAny(filters.hosts, [facet.hostId]) ||
      !matchesAny(filters.bots, [card.botKey]) ||
      !matchesAny(filters.tags, facet.tags)
    ) {
      return false
    }
    if (!needle) {
      return true
    }
    return [
      card.title,
      card.detail,
      card.summary,
      card.workspace,
      facet.botName,
      card.number?.toString() ?? null
    ]
      .filter((text): text is string => text !== null)
      .some((text) => text.toLowerCase().includes(needle))
  })
}

/** Live cards lead, then the newest. */
export function sortAgentsBoardColumn(cards: readonly AgentsBoardCard[]): AgentsBoardCard[] {
  return [...cards].sort((a, b) => Number(b.live) - Number(a.live) || b.at - a.at)
}
